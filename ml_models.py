import pandas as pd
import numpy as np
import json
import logging
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import pickle
import warnings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Constants ---
MODEL_OUTPUT_FILE = 'models/market_risk_xgboost.pkl'

def load_training_data_json():
    """Load training data from the real_insights.json file"""
    logger.info("Loading training data from real_insights.json...")
    
    try:
        with open('outputs/real_insights.json', 'r') as f:
            insights_data = json.load(f)
        
        # Extract market analysis data
        market_analysis = insights_data.get('marketAnalysis', [])
        
        if not market_analysis:
            logger.error("No market analysis data found in insights file")
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(market_analysis)
        
        # Create target variable (high risk = market share > 80%)
        df['is_high_risk'] = (df['marketSharePercentage'] > 80).astype(int)
        
        # Create features
        features_df = create_features_from_market_data(df)
        
        logger.info(f"Loaded {len(features_df)} records with {len(features_df.columns)} features")
        return features_df
        
    except Exception as e:
        logger.error(f"Error loading training data: {e}")
        return None

def create_features_from_market_data(df):
    """Create ML features from market analysis data"""
    logger.info("Creating features from market analysis data...")
    
    features = df.copy()
    
    # 1. Basic market features
    features['market_share_log'] = np.log(features['marketSharePercentage'] + 1)
    features['total_revenue_log'] = np.log(features['totalMarketRevenue'] + 1)
    features['provider_count_log'] = np.log(features['providerCount'] + 1)
    
    # 2. Risk indicators
    features['is_high_concentration'] = (features['marketSharePercentage'] > 80).astype(int)
    features['is_fragmented'] = (features['marketSharePercentage'] < 25).astype(int)
    features['is_medium_risk'] = ((features['marketSharePercentage'] >= 25) & (features['marketSharePercentage'] <= 80)).astype(int)
    
    # 3. Revenue efficiency
    features['revenue_per_provider'] = features['totalMarketRevenue'] / features['providerCount']
    features['revenue_per_provider_log'] = np.log(features['revenue_per_provider'] + 1)
    
    # 4. Market dynamics
    features['market_competition_score'] = 1 / (features['marketSharePercentage'] + 1)  # Higher score = more competition
    features['market_efficiency'] = features['totalMarketRevenue'] / (features['providerCount'] ** 0.5)  # Revenue per sqrt(providers)
    
    # 5. Specialty encoding
    le = LabelEncoder()
    features['specialty_encoded'] = le.fit_transform(features['specialty'].fillna('Unknown'))
    
    # 6. Geographic features (from zip code)
    features['zip_region'] = features['zipCode'].str[:2].astype(str)
    features['zip_region_encoded'] = le.fit_transform(features['zip_region'].fillna('00'))
    
    # 7. Provider name features
    features['has_provider_name'] = (features['topProviderName'] != 'Unknown Provider').astype(int)
    features['provider_name_length'] = features['topProviderName'].str.len()
    
    # 8. Risk score (composite)
    features['risk_score'] = (
        features['market_share_log'] * 0.3 +
        features['market_competition_score'] * 0.2 +
        features['revenue_per_provider_log'] * 0.2 +
        features['provider_count_log'] * 0.15 +
        features['has_provider_name'] * 0.15
    )
        
        # Select final features for ML
        ml_features = [
        'market_share_log', 'total_revenue_log', 'provider_count_log',
        'is_high_concentration', 'is_fragmented', 'is_medium_risk',
        'revenue_per_provider_log', 'market_competition_score', 'market_efficiency',
        'specialty_encoded', 'zip_region_encoded', 'has_provider_name',
        'provider_name_length', 'risk_score'
    ]
    
        # Remove rows with missing values
        features = features.dropna(subset=ml_features)
        
    logger.info(f"Created {len(ml_features)} features for {len(features)} markets")
    return features[ml_features + ['is_high_risk']]

def train_xgboost_model(features_df):
    """Train XGBoost model on real market data"""
    logger.info("Training XGBoost model on real market data...")
    
    if features_df is None or len(features_df) == 0:
        logger.error("No features data available for training")
        return None
    
    # Prepare features and target
    feature_cols = [col for col in features_df.columns if col != 'is_high_risk']
    X = features_df[feature_cols]
    y = features_df['is_high_risk']
    
    logger.info(f"Training on {len(X)} samples with {len(X.columns)} features")
    logger.info(f"Target distribution: {y.value_counts().to_dict()}")
        
        # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # Train XGBoost model
        model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
        eval_metric='logloss',
        scale_pos_weight=1  # Adjust if class imbalance
        )
        
        model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        
        # Calculate metrics
        auc_score = roc_auc_score(y_test, y_pred_proba)
        accuracy = (y_pred == y_test).mean()
        
        # Feature importance
        feature_importance = dict(zip(X.columns, model.feature_importances_))
        
    logger.info(f"XGBoost model trained successfully!")
    logger.info(f"AUC: {auc_score:.4f}, Accuracy: {accuracy:.4f}")
    logger.info(f"Top 5 features: {sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]}")
    
    return model, feature_importance, {
            'auc_score': auc_score,
            'accuracy': accuracy,
            'classification_report': classification_report(y_test, y_pred)
        }
        
def save_model(model, file_path):
    """Save the trained model to a pickle file"""
    import os
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, 'wb') as f:
        pickle.dump(model, f)
    
    logger.info(f"Model saved to {file_path}")

def save_model_performance_report(metrics, feature_importance, output_file='outputs/model_performance.json'):
    """Save model performance metrics to JSON"""
    logger.info("Saving model performance report...")
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'model_name': 'market_risk_xgboost',
        'metrics': {k: v for k, v in metrics.items() if k != 'classification_report'},
        'feature_importance': feature_importance
    }
    
    import os
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Performance report saved to {output_file}")

def test_model_predictions(model, features_df):
    """Test the trained model with sample predictions"""
    logger.info("--- Testing Model Predictions ---")
    
    if model is None:
        logger.error("No trained model found")
        return
    
    # Get feature columns
    feature_cols = [col for col in features_df.columns if col != 'is_high_risk']
    
    # Sample a few markets for testing
    sample_data = features_df[feature_cols].head(10)
    
    # Make predictions
    predictions = model.predict(sample_data)
    probabilities = model.predict_proba(sample_data)[:, 1]
    
    logger.info("Sample predictions:")
    for i, (pred, prob) in enumerate(zip(predictions, probabilities)):
        risk_level = "HIGH RISK" if pred == 1 else "LOW RISK"
        logger.info(f"Market {i+1}: {risk_level} (probability: {prob:.3f})")

def main():
    """Main function to run the ML training pipeline with real data."""
    logger.info("--- Starting ML Model Training Pipeline with Real Data ---")
    
    # 1. Load real training data from insights
    features_df = load_training_data_json()
    if features_df is None:
        logger.error("Failed to load training data")
        return
    
    # 2. Train XGBoost model
    result = train_xgboost_model(features_df)
    if result is None:
        logger.error("Failed to train model")
        return
    
    model, feature_importance, metrics = result
    
    # 3. Save model and performance report
    save_model(model, MODEL_OUTPUT_FILE)
    save_model_performance_report(metrics, feature_importance)
    
    # 4. Test the model with sample predictions
    test_model_predictions(model, features_df)
    
    logger.info("--- ML Model Training Pipeline Finished ---")

if __name__ == '__main__':
    main() 