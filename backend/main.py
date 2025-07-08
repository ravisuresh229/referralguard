from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import joblib
import os
from pathlib import Path
import json

app = FastAPI(title="ReferralGuard Backend API", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ML models
def load_models():
    models = {}
    try:
        # Load referral risk model
        model_path = Path("models/referral_risk_model.pkl")
        if model_path.exists():
            models['referral_risk'] = joblib.load(model_path)
        
        # Load market risk model
        market_model_path = Path("models/market_risk_xgboost.pkl")
        if market_model_path.exists():
            models['market_risk'] = joblib.load(market_model_path)
            
    except Exception as e:
        print(f"Warning: Could not load models: {e}")
    
    return models

models = load_models()

# Pydantic models for request/response
class ReferralData(BaseModel):
    from_provider_npi: str
    to_provider_npi: str
    specialty: str
    patient_zip: str
    referral_date: str
    estimated_charge: float

class BatchScoringRequest(BaseModel):
    referrals: List[ReferralData]

class ScoringResult(BaseModel):
    provider_npi: str
    leakage_probability: float
    risk_score: float
    expected_revenue_loss: float
    confidence_score: float
    risk_factors: List[str]
    provider_name: str

class ScoringResponse(BaseModel):
    results: List[ScoringResult]
    summary: dict

@app.get("/")
async def root():
    return {"message": "ReferralGuard Backend API", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": len(models)}

@app.post("/score/batch", response_model=ScoringResponse)
async def score_batch(request: BatchScoringRequest):
    try:
        results = []
        
        for referral in request.referrals:
            # Generate mock scoring results (replace with actual ML inference)
            risk_score = np.random.uniform(0.1, 0.9)
            leakage_prob = np.random.uniform(0.05, 0.8)
            revenue_loss = referral.estimated_charge * leakage_prob * np.random.uniform(0.1, 0.5)
            
            result = ScoringResult(
                provider_npi=referral.from_provider_npi,
                leakage_probability=leakage_prob,
                risk_score=risk_score,
                expected_revenue_loss=revenue_loss,
                confidence_score=np.random.uniform(0.7, 0.95),
                risk_factors=["High out-of-network referrals", "Low market share", "Competitive market"],
                provider_name=f"Provider {referral.from_provider_npi[-4:]}"
            )
            results.append(result)
        
        # Calculate summary statistics
        total_referrals = len(results)
        avg_risk_score = np.mean([r.risk_score for r in results])
        avg_leakage_prob = np.mean([r.leakage_probability for r in results])
        high_risk_count = len([r for r in results if r.risk_score > 0.7])
        total_revenue_at_risk = sum([r.expected_revenue_loss for r in results])
        
        summary = {
            "total_referrals": total_referrals,
            "avg_risk_score": avg_risk_score,
            "avg_leakage_probability": avg_leakage_prob,
            "high_risk_count": high_risk_count,
            "total_revenue_at_risk": total_revenue_at_risk
        }
        
        return ScoringResponse(results=results, summary=summary)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insights/real")
async def get_real_insights():
    """Return real Medicare insights data"""
    try:
        insights_path = Path("data/real_insights.json")
        if insights_path.exists():
            with open(insights_path, 'r') as f:
                return json.load(f)
        else:
            # Return mock data if file doesn't exist
            return {
                "summary": {
                    "totalMarketsAnalyzed": 150,
                    "highConcentrationMarkets": 45,
                    "fragmentedMarkets": 105,
                    "totalRevenueAnalyzed": 25000000,
                    "averageMarketShare": 0.35,
                    "providerNetworksCount": 25
                },
                "marketAnalysis": [],
                "leakageOpportunities": [],
                "providerNetworks": [],
                "networkInsights": []
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 