#!/usr/bin/env python3
"""
ML Prediction Script for ReferralGuard
Uses the real XGBoost model to predict provider risk scores
"""

import json
import sys
import argparse
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def convert_numpy_types(obj):
    if isinstance(obj, (np.integer, np.int32, np.int64)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_numpy_types(i) for i in obj]
    return obj

def load_model(model_path='models/market_risk_xgboost.pkl'):
    """Load the trained XGBoost model"""
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        logger.info(f"Loaded model from {model_path}")
        return model
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return None

def create_features_from_provider(provider_data):
    """Create ML features from provider data"""
    features = {}
    
    # Basic market features
    market_share = provider_data.get('marketShare', 0)
    features['market_share_log'] = np.log(market_share + 1)
    features['total_revenue_log'] = np.log(provider_data.get('revenue', 0) + 1)
    features['provider_count_log'] = np.log(provider_data.get('providerCount', 1) + 1)
    
    # Risk indicators
    features['is_high_concentration'] = 1 if market_share > 80 else 0
    features['is_fragmented'] = 1 if market_share < 25 else 0
    features['is_medium_risk'] = 1 if (market_share >= 25 and market_share <= 80) else 0
    
    # Revenue efficiency
    revenue_per_provider = provider_data.get('revenue', 0) / provider_data.get('providerCount', 1)
    features['revenue_per_provider_log'] = np.log(revenue_per_provider + 1)
    
    # Market dynamics
    features['market_competition_score'] = 1 / (market_share + 1)
    features['market_efficiency'] = provider_data.get('revenue', 0) / (provider_data.get('providerCount', 1) ** 0.5)
    
    # Specialty encoding (simple hash-based encoding)
    specialty = provider_data.get('specialty', 'Unknown')
    features['specialty_encoded'] = hash(specialty) % 1000
    
    # Geographic features (from zip code)
    zip_code = provider_data.get('zipCode', '00000')
    features['zip_region_encoded'] = int(zip_code[:2]) if zip_code[:2].isdigit() else 0
    
    # Provider name features
    provider_name = provider_data.get('providerName', 'Unknown Provider')
    features['has_provider_name'] = 1 if provider_name != 'Unknown Provider' else 0
    features['provider_name_length'] = len(provider_name)
    
    # Risk score (composite)
    features['risk_score'] = (
        features['market_share_log'] * 0.3 +
        features['market_competition_score'] * 0.2 +
        features['revenue_per_provider_log'] * 0.2 +
        features['provider_count_log'] * 0.15 +
        features['has_provider_name'] * 0.15
    )
    
    return features

def predict_risk_scores(provider_data_list, model):
    """Predict risk scores for a list of providers"""
    predictions = []
    
    for provider in provider_data_list:
        try:
            # Create features
            features = create_features_from_provider(provider)
            
            # Convert to feature vector (same order as training)
            feature_cols = [
                'market_share_log', 'total_revenue_log', 'provider_count_log',
                'is_high_concentration', 'is_fragmented', 'is_medium_risk',
                'revenue_per_provider_log', 'market_competition_score', 'market_efficiency',
                'specialty_encoded', 'zip_region_encoded', 'has_provider_name',
                'provider_name_length', 'risk_score'
            ]
            
            feature_vector = [features.get(col, 0) for col in feature_cols]
            
            # Make prediction
            if hasattr(model, 'predict_proba'):
                risk_probability = model.predict_proba([feature_vector])[0][1]
            else:
                risk_probability = model.predict([feature_vector])[0]
            
            # Calculate risk score (0-100)
            risk_score = min(100, max(0, risk_probability * 100))
            
            # Calculate revenue at risk
            revenue_at_risk = (provider.get('revenue', 0) * risk_score) / 100
            
            prediction = {
                'providerNPI': provider.get('providerNPI', 'N/A'),
                'providerName': provider.get('providerName', 'Unknown Provider'),
                'riskScore': round(float(risk_score), 1),
                'riskProbability': round(float(risk_probability), 4),
                'revenueAtRisk': round(float(revenue_at_risk), 2),
                'riskLevel': 'high' if risk_score > 70 else 'medium' if risk_score > 50 else 'low',
                'features': convert_numpy_types(features)
            }
            
            predictions.append(prediction)
            
        except Exception as e:
            logger.error(f"Error predicting for provider {provider.get('providerNPI', 'N/A')}: {e}")
            # Fallback prediction
            predictions.append({
                'providerNPI': provider.get('providerNPI', 'N/A'),
                'providerName': provider.get('providerName', 'Unknown Provider'),
                'riskScore': 50.0,
                'riskProbability': 0.5,
                'revenueAtRisk': (provider.get('revenue', 0) * 0.5),
                'riskLevel': 'medium',
                'features': {},
                'error': str(e)
            })
    
    return predictions

def main():
    parser = argparse.ArgumentParser(description='ML Prediction for ReferralGuard')
    parser.add_argument('--data', type=str, required=True, help='Provider data as JSON string')
    args = parser.parse_args()
    
    try:
        # Parse provider data
        provider_data = json.loads(args.data)
        
        # Load the ML model
        model = load_model()
        
        if model is None:
            # Fallback to enhanced algorithm
            logger.warning("ML model not available, using enhanced algorithm")
            predictions = []
            for provider in provider_data:
                # Enhanced risk calculation (same as in the API)
                market_share = provider.get('marketShare', 0)
                risk_score = (100 - market_share) * 0.4
                if provider.get('marketPosition', 1) > 2:
                    risk_score += 25
                competition_score = 1 / (market_share + 1)
                risk_score += competition_score * 20
                risk_score = min(max(risk_score, 0), 100)
                revenue_at_risk = (provider.get('revenue', 0) * risk_score) / 100
                predictions.append(convert_numpy_types({
                    'providerNPI': provider.get('providerNPI', 'N/A'),
                    'providerName': provider.get('providerName', 'Unknown Provider'),
                    'riskScore': round(risk_score, 1),
                    'riskProbability': risk_score / 100,
                    'revenueAtRisk': round(revenue_at_risk, 2),
                    'riskLevel': 'high' if risk_score > 70 else 'medium' if risk_score > 50 else 'low',
                    'modelUsed': 'Enhanced Algorithm'
                }))
        else:
            # Use real ML model
            predictions = [convert_numpy_types(p) for p in predict_risk_scores(provider_data, model)]
            for pred in predictions:
                pred['modelUsed'] = 'XGBoost'
        
        # Return results
        result = {
            'predictions': predictions,
            'modelInfo': {
                'modelType': 'XGBoost' if model else 'Enhanced Algorithm',
                'totalPredictions': len(predictions),
                'timestamp': pd.Timestamp.now().isoformat()
            }
        }
        
        print(json.dumps(convert_numpy_types(result)))
        
    except Exception as e:
        logger.error(f"Error in main: {e}")
        error_result = {
            'error': str(e),
            'predictions': [],
            'modelInfo': {
                'modelType': 'Error',
                'totalPredictions': 0,
                'timestamp': pd.Timestamp.now().isoformat()
            }
        }
        print(json.dumps(convert_numpy_types(error_result)))
        sys.exit(1)

if __name__ == '__main__':
    main() 