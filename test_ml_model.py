#!/usr/bin/env python3
"""
Test script for ML model functionality
"""

import json
import sys
import pickle
import numpy as np
import pandas as pd
from pathlib import Path

def test_model_loading():
    """Test if the ML model can be loaded"""
    print("Testing ML model loading...")
    
    model_path = 'models/market_risk_xgboost.pkl'
    if Path(model_path).exists():
        try:
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            print(f"✅ Model loaded successfully from {model_path}")
            print(f"   Model type: {type(model).__name__}")
            return model
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return None
    else:
        print(f"❌ Model file not found at {model_path}")
        return None

def test_model_prediction(model):
    """Test model prediction with sample data"""
    print("\nTesting model prediction...")
    
    # Sample provider data
    sample_provider = {
        'providerNPI': '1234567890',
        'providerName': 'Test Provider',
        'specialty': 'Cardiology',
        'zipCode': '12345',
        'marketShare': 75.0,
        'revenue': 1000000,
        'providerCount': 3,
        'totalMarketRevenue': 1500000,
        'providerServices': 500
    }
    
    try:
        # Create features (same as in ml_predict.py)
        market_share = sample_provider['marketShare']
        features = {
            'market_share_log': np.log(market_share + 1),
            'total_revenue_log': np.log(sample_provider['revenue'] + 1),
            'provider_count_log': np.log(sample_provider['providerCount'] + 1),
            'is_high_concentration': 1 if market_share > 80 else 0,
            'is_fragmented': 1 if market_share < 25 else 0,
            'is_medium_risk': 1 if (market_share >= 25 and market_share <= 80) else 0,
            'revenue_per_provider_log': np.log(sample_provider['revenue'] / sample_provider['providerCount'] + 1),
            'market_competition_score': 1 / (market_share + 1),
            'market_efficiency': sample_provider['revenue'] / (sample_provider['providerCount'] ** 0.5),
            'specialty_encoded': hash(sample_provider['specialty']) % 1000,
            'zip_region_encoded': int(sample_provider['zipCode'][:2]),
            'has_provider_name': 1 if sample_provider['providerName'] != 'Unknown Provider' else 0,
            'provider_name_length': len(sample_provider['providerName']),
            'risk_score': 0  # Will be calculated
        }
        
        # Calculate composite risk score
        features['risk_score'] = (
            features['market_share_log'] * 0.3 +
            features['market_competition_score'] * 0.2 +
            features['revenue_per_provider_log'] * 0.2 +
            features['provider_count_log'] * 0.15 +
            features['has_provider_name'] * 0.15
        )
        
        # Convert to feature vector
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
            print(f"✅ Model prediction successful")
            print(f"   Risk probability: {risk_probability:.4f}")
            print(f"   Risk score (0-100): {risk_probability * 100:.1f}")
        else:
            risk_probability = model.predict([feature_vector])[0]
            print(f"✅ Model prediction successful")
            print(f"   Risk score: {risk_probability:.4f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error making prediction: {e}")
        return False

def test_data_loading():
    """Test if real_insights.json can be loaded"""
    print("\nTesting data loading...")
    
    data_path = 'outputs/real_insights.json'
    if Path(data_path).exists():
        try:
            with open(data_path, 'r') as f:
                data = json.load(f)
            print(f"✅ Data loaded successfully from {data_path}")
            print(f"   Total markets: {len(data.get('marketAnalysis', []))}")
            print(f"   Total revenue: ${data.get('summary', {}).get('totalRevenueAnalyzed', 0):,.0f}")
            return data
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            return None
    else:
        print(f"❌ Data file not found at {data_path}")
        return None

def test_model_performance():
    """Test if model performance data exists"""
    print("\nTesting model performance data...")
    
    perf_path = 'outputs/model_performance.json'
    if Path(perf_path).exists():
        try:
            with open(perf_path, 'r') as f:
                perf = json.load(f)
            print(f"✅ Model performance data loaded from {perf_path}")
            print(f"   Model: {perf.get('model_name', 'Unknown')}")
            print(f"   AUC: {perf.get('metrics', {}).get('auc_score', 'N/A')}")
            print(f"   Accuracy: {perf.get('metrics', {}).get('accuracy', 'N/A')}")
            return perf
        except Exception as e:
            print(f"❌ Error loading performance data: {e}")
            return None
    else:
        print(f"❌ Model performance file not found at {perf_path}")
        return None

def main():
    print("🧠 ReferralGuard ML Model Test")
    print("=" * 40)
    
    # Test model loading
    model = test_model_loading()
    
    # Test model prediction if model is available
    if model:
        test_model_prediction(model)
    
    # Test data loading
    data = test_data_loading()
    
    # Test model performance
    perf = test_model_performance()
    
    print("\n" + "=" * 40)
    print("📊 Summary:")
    print(f"   ML Model: {'✅ Available' if model else '❌ Not Available'}")
    print(f"   Real Data: {'✅ Available' if data else '❌ Not Available'}")
    print(f"   Performance Data: {'✅ Available' if perf else '❌ Not Available'}")
    
    if model and data:
        print("\n🎉 ML system is ready for production use!")
    elif data:
        print("\n⚠️  Enhanced algorithm will be used (ML model not available)")
    else:
        print("\n❌ System needs data and/or model to function properly")

if __name__ == '__main__':
    main() 