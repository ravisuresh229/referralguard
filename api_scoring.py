from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime
import logging
import asyncio
from sklearn.ensemble import RandomForestRegressor, IsolationForest
import pickle
import os
import json

# Import our file handler
from config import config
from utils.file_handler import file_handler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ReferralGuard ML API",
    description="AI-powered referral leakage detection and scoring API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ML models - will be loaded from file or initialized with mock data
leakage_model = None
revenue_model = None
anomaly_detector = None

# Load real_insights.json and build lookup dicts
REAL_INSIGHTS_PATH = os.path.join(os.path.dirname(__file__), 'outputs', 'real_insights.json')
real_insights = None
provider_lookup_by_npi = {}
provider_lookup_by_zip_specialty = {}

try:
    with open(REAL_INSIGHTS_PATH, 'r') as f:
        real_insights = json.load(f)
        for entry in real_insights.get('marketAnalysis', []):
            npi = entry.get('topProviderNPI')
            zip_code = entry.get('zipCode')
            specialty = entry.get('specialty')
            if npi:
                provider_lookup_by_npi[npi] = entry
            if zip_code and specialty:
                provider_lookup_by_zip_specialty[(zip_code, specialty)] = entry
    logger.info(f"Loaded real_insights.json with {len(provider_lookup_by_npi)} providers by NPI.")
except Exception as e:
    logger.warning(f"Could not load real_insights.json: {e}")

# Initialize models with mock data or load from file
def initialize_models():
    """Initialize ML models with synthetic training data or load from file"""
    global leakage_model, revenue_model, anomaly_detector
    
    logger.info("Initializing ML models...")
    
    # Try to load models from file first
    model_path = config.get_model_path()
    if file_handler.file_exists(model_path):
        try:
            logger.info(f"Loading model from {model_path}")
            with file_handler.open_binary(model_path) as f:
                loaded_model = pickle.load(f)
            # For now, we'll use the loaded model as our leakage model
            leakage_model = loaded_model
            logger.info("Model loaded successfully from file")
        except Exception as e:
            logger.warn(f"Failed to load model from file: {e}")
            leakage_model = None
    
    # If no model loaded, create mock models
    if leakage_model is None:
        logger.info("Creating mock models with synthetic data...")
leakage_model = RandomForestRegressor(n_estimators=100, random_state=42)
revenue_model = RandomForestRegressor(n_estimators=100, random_state=42)
anomaly_detector = IsolationForest(contamination=0.1, random_state=42)

        # Generate synthetic training data (5 features to match trained model)
    np.random.seed(42)
    n_samples = 1000
        X = np.random.rand(n_samples, 5)
    
    # Target variables
    leakage_prob = 0.3 + 0.4 * X[:, 0] + 0.2 * X[:, 1] + 0.1 * X[:, 2] + np.random.normal(0, 0.1, n_samples)
    leakage_prob = np.clip(leakage_prob, 0, 1)
    
    revenue_loss = 5000 + 10000 * leakage_prob + np.random.normal(0, 1000, n_samples)
    revenue_loss = np.maximum(revenue_loss, 0)
    
    # Train models
    leakage_model.fit(X, leakage_prob)
    revenue_model.fit(X, revenue_loss)
    anomaly_detector.fit(X)
    
        logger.info("Mock models initialized successfully")
    else:
        # If we loaded a model, create the other models as mock
        revenue_model = RandomForestRegressor(n_estimators=100, random_state=42)
        anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        
        # Train the mock models with synthetic data (5 features to match trained model)
        np.random.seed(42)
        n_samples = 1000
        X = np.random.rand(n_samples, 5)
        revenue_loss = np.random.exponential(5000, n_samples)
        revenue_model.fit(X, revenue_loss)
        anomaly_detector.fit(X)

# Pydantic models
class ReferralRequest(BaseModel):
    from_provider_npi: str
    to_provider_npi: str
    specialty: str
    patient_zip: str
    referral_date: str
    estimated_charge: float

class BatchScoringRequest(BaseModel):
    referrals: List[ReferralRequest]

class ScoringResponse(BaseModel):
    provider_npi: str
    provider_name: str
    leakage_probability: float
    risk_score: float
    expected_revenue_loss: float
    confidence_score: float
    risk_factors: List[str]
    anomaly_score: float

class BatchScoringResponse(BaseModel):
    results: List[ScoringResponse]
    summary: Dict[str, Any]

@app.on_event("startup")
async def startup_event():
    """Initialize the API on startup"""
    logger.info("Initializing ReferralGuard API...")
    initialize_models()
    logger.info("ReferralGuard API ready!")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "ReferralGuard ML API",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/score/batch", response_model=BatchScoringResponse)
async def score_batch_referrals(request: BatchScoringRequest):
    """Score multiple referrals for leakage risk"""
    try:
        logger.info(f"Received batch scoring request with {len(request.referrals)} referrals")
        results = []
        total_risk = 0
        total_leakage_prob = 0
        
        for i, referral in enumerate(request.referrals):
            logger.info(f"Processing referral {i+1}/{len(request.referrals)}: NPI={referral.from_provider_npi}")
            
            # Extract features
            features = extract_features(referral)
            logger.info(f"Extracted features for NPI {referral.from_provider_npi}: {features}")
            
            # Make predictions
            if hasattr(leakage_model, "predict_proba"):
                leakage_prob = leakage_model.predict_proba([features])[0][1]
            else:
            leakage_prob = leakage_model.predict([features])[0]

            revenue_loss = revenue_model.predict([features])[0]
            anomaly_score = anomaly_detector.decision_function([features])[0]
            
            logger.info(f"Raw predictions for NPI {referral.from_provider_npi}: leakage_prob={leakage_prob:.4f}, revenue_loss={revenue_loss:.2f}, anomaly_score={anomaly_score:.4f}")
            
            # Calculate risk score
            risk_score = calculate_risk_score(leakage_prob, revenue_loss, anomaly_score)
            logger.info(f"Calculated risk_score for NPI {referral.from_provider_npi}: {risk_score}")
            logger.info(f"Leakage rate: {leakage_prob}, Predicted loss: {leakage_prob * referral.estimated_charge}")
            
            # Generate risk factors
            risk_factors = generate_risk_factors(features, leakage_prob)
            
            # Calculate confidence score
            confidence_score = calculate_confidence_score(features)
            
            result = ScoringResponse(
                provider_npi=referral.from_provider_npi,
                provider_name=f"Provider {referral.from_provider_npi[-4:]}",
                leakage_probability=float(leakage_prob),
                risk_score=float(risk_score),
                expected_revenue_loss=float(revenue_loss),
                confidence_score=float(confidence_score),
                risk_factors=risk_factors,
                anomaly_score=float(anomaly_score)
            )
            
            results.append(result)
            total_risk += risk_score
            total_leakage_prob += leakage_prob
        
        # Calculate summary statistics
        avg_risk = total_risk / len(results) if results else 0
        avg_leakage_prob = total_leakage_prob / len(results) if results else 0
        
        summary = {
            "total_referrals": len(results),
            "avg_risk_score": float(avg_risk),
            "avg_leakage_probability": float(avg_leakage_prob),
            "high_risk_count": len([r for r in results if r.risk_score > 0.7]),
            "total_revenue_at_risk": float(sum(r.expected_revenue_loss for r in results))
        }
        
        logger.info(f"Batch scoring completed. Summary: {summary}")
        return BatchScoringResponse(results=results, summary=summary)
        
    except Exception as e:
        logger.error(f"Error scoring batch referrals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test/provider/{npi}")
async def test_provider(npi: str):
    """Test endpoint to get raw features and prediction for a specific provider"""
    try:
        # Create a test referral
        test_referral = ReferralRequest(
            from_provider_npi=npi,
            to_provider_npi="1234567890",
            specialty="207RC0000X",
            patient_zip="90210",
            referral_date="2024-01-01",
            estimated_charge=1000.0
        )
        
        # Extract features
        features = extract_features(test_referral)
        
        # Make predictions
        if hasattr(leakage_model, "predict_proba"):
            leakage_prob = leakage_model.predict_proba([features])[0][1]
        else:
            leakage_prob = leakage_model.predict([features])[0]
        revenue_loss = revenue_model.predict([features])[0]
        anomaly_score = anomaly_detector.decision_function([features])[0]
        risk_score = calculate_risk_score(leakage_prob, revenue_loss, anomaly_score)
        
        return {
            "npi": npi,
            "features": features,
            "feature_names": ["historical_leakage", "network_density", "referral_velocity", "zip_numeric", "specialty_risk"],
            "predictions": {
                "leakage_probability": float(leakage_prob),
                "revenue_loss": float(revenue_loss),
                "anomaly_score": float(anomaly_score),
                "risk_score": float(risk_score)
            },
            "provider_found_in_data": npi in provider_lookup_by_npi
        }
    except Exception as e:
        logger.error(f"Error testing provider {npi}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/info")
async def get_model_info():
    """Get information about the loaded ML model"""
    return {
        "model_loaded": leakage_model is not None,
        "model_type": type(leakage_model).__name__ if leakage_model else None,
        "feature_count": 5,
        "feature_names": ["historical_leakage", "network_density", "referral_velocity", "zip_numeric", "specialty_risk"],
        "providers_in_lookup": len(provider_lookup_by_npi),
        "real_insights_loaded": len(provider_lookup_by_npi) > 0
    }

@app.get("/debug/test-providers")
async def debug_test_providers():
    """Test predictions for the first 5 real providers in the lookup."""
    test_results = []
    # Get first 5 providers from real_insights
    for npi, entry in list(provider_lookup_by_npi.items())[:5]:
        # Build a test referral
        test_referral = ReferralRequest(
            from_provider_npi=npi,
            to_provider_npi="1234567890",
            specialty=entry.get("specialty", ""),
            patient_zip=entry.get("zipCode", "00000"),
            referral_date="2024-01-01",
            estimated_charge=entry.get("topProviderRevenue", 1000.0)
        )
        features = extract_features(test_referral)
        # Model predictions
        if hasattr(leakage_model, "predict_proba"):
            leakage_prob = leakage_model.predict_proba([features])[0][1]
        else:
            leakage_prob = leakage_model.predict([features])[0]
        revenue_loss = revenue_model.predict([features])[0]
        anomaly_score = anomaly_detector.decision_function([features])[0]
        risk_score = calculate_risk_score(leakage_prob, revenue_loss, anomaly_score)
        test_results.append({
            "npi": npi,
            "features": features,
            "provider_data": entry,
            "leakage_prob": float(leakage_prob),
            "leakage_proba_raw": None,
            "revenue_loss": float(revenue_loss),
            "anomaly_score": float(anomaly_score),
            "risk_score": float(risk_score),
            "leakage_rate_calc": float(leakage_prob),
            "predicted_loss_calc": float(leakage_prob) * float(entry.get("topProviderRevenue", 0))
        })
    return {"test_results": test_results}

# Helper functions
def extract_features(referral: ReferralRequest) -> List[float]:
    """Extract features from referral data, using real data if available."""
    # Try to find provider by NPI
    entry = provider_lookup_by_npi.get(referral.from_provider_npi)
    # If not found, try by zip+specialty
    if not entry:
        entry = provider_lookup_by_zip_specialty.get((referral.patient_zip, referral.specialty))
    if entry:
        # Map real fields to ML features (5 features to match trained model)
        historical_leakage = float(entry.get('marketSharePercentage', 0)) / 100.0
        network_density = float(entry.get('providerCount', 1)) / 100.0
        referral_velocity = float(entry.get('topProviderRevenue', 0)) / 10000.0
        zip_numeric = int(entry.get('zipCode', '0')) % 1000 / 1000.0 if entry.get('zipCode') else 0.5
        specialty = entry.get('specialty', '')
        specialty_risk = 0.3 if specialty in ['Cardiology', 'Oncology', 'Orthopedics'] else 0.5
        
        logger.info(f"Using REAL features for NPI {referral.from_provider_npi} (zip={referral.patient_zip}, specialty={referral.specialty})")
        return [
            historical_leakage,  # Feature 1: Historical leakage rate
            network_density,     # Feature 2: Network density
            referral_velocity,   # Feature 3: Referral velocity
            zip_numeric,         # Feature 4: Geographic factor
            specialty_risk       # Feature 5: Specialty risk
        ]
    else:
        # Fallback to synthetic features (5 features to match trained model)
        logger.warning(f"Using SYNTHETIC features for NPI {referral.from_provider_npi} (zip={referral.patient_zip}, specialty={referral.specialty})")
    historical_leakage = np.random.beta(2, 5)
    network_density = np.random.beta(3, 2)
    referral_velocity = np.random.exponential(2)
    zip_numeric = int(referral.patient_zip) % 1000 / 1000 if referral.patient_zip.isdigit() else 0.5
        specialty_risk = 0.3 if referral.specialty in ['207RC0000X', '207T00000X'] else 0.5
    
    return [
            historical_leakage,  # Feature 1: Historical leakage rate
            network_density,     # Feature 2: Network density
            referral_velocity,   # Feature 3: Referral velocity
            zip_numeric,         # Feature 4: Geographic factor
            specialty_risk       # Feature 5: Specialty risk
    ]

def calculate_risk_score(leakage_prob: float, revenue_loss: float, anomaly_score: float) -> float:
    """Calculate overall risk score (0-1)"""
    normalized_revenue = min(revenue_loss / 50000, 1.0)
    normalized_anomaly = max(0, -anomaly_score)
    
    risk_score = (
        0.4 * leakage_prob +
        0.4 * normalized_revenue +
        0.2 * normalized_anomaly
    )
    
    return min(max(risk_score, 0), 1)

def generate_risk_factors(features: List[float], leakage_prob: float) -> List[str]:
    """Generate risk factors based on features"""
    risk_factors = []
    
    if features[0] > 0.3:
        risk_factors.append("High historical leakage rate")
    
    if features[1] < 0.3:
        risk_factors.append("Low network density")
    
    if features[2] > 3:
        risk_factors.append("High referral velocity")
    
    if leakage_prob > 0.5:
        risk_factors.append("Out-of-network referrals")
    
    if not risk_factors:
        risk_factors.append("Moderate risk profile")
    
    return risk_factors

def calculate_confidence_score(features: List[float]) -> float:
    """Calculate prediction confidence score"""
    feature_variance = np.var(features)
    confidence = max(0.6, 1.0 - feature_variance)
    return confidence

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 