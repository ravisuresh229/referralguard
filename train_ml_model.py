import pandas as pd
import numpy as np
import json
import logging
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
import xgboost as xgb
import pickle
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_competitive_market_data():
    """Load the new competitive market data with multiple providers per market"""
    logger.info("Loading competitive market data from real_insights.json...")
    
    try:
        with open('outputs/real_insights.json', 'r') as f:
            insights_data = json.load(f)
        
        # Extract market analysis data (now with multiple providers per market)
        market_analysis = insights_data.get('marketAnalysis', [])
        
        if not market_analysis:
            logger.error("No market analysis data found in insights file")
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(market_analysis)
        
        logger.info(f"Loaded {len(df)} provider-market records")
        logger.info(f"Sample data structure: {df.columns.tolist()}")
        
        return df
        
    except Exception as e:
        logger.error(f"Error loading competitive market data: {e}")
        return None

def calculate_market_metrics(df):
    """Calculate advanced market metrics for each provider"""
    logger.info("Calculating advanced market metrics...")
    
    # Group by market (zip + specialty) to calculate market-level metrics
    market_metrics = df.groupby(['zipCode', 'specialty']).agg({
        'marketSharePercentage': ['count', 'sum', 'std'],
        'providerRevenue': ['sum', 'mean', 'std'],
        'totalMarketRevenue': 'first'
    }).reset_index()
    
    # Flatten column names
    market_metrics.columns = ['zipCode', 'specialty', 'num_providers', 'total_share', 'share_std', 
                             'total_revenue', 'avg_revenue', 'revenue_std', 'market_revenue']
    
    # Calculate Herfindahl-Hirschman Index (HHI) for each market
    market_metrics['hhi'] = df.groupby(['zipCode', 'specialty'])['marketSharePercentage'].apply(
        lambda x: sum((x/100)**2) * 10000  # HHI = sum of squared market shares * 10000
    ).reset_index(level=[0,1], drop=True)
    
    # Calculate market fragmentation (1 - normalized HHI)
    market_metrics['market_fragmentation'] = 1 - (market_metrics['hhi'] / 10000)
    
    # Merge market metrics back to provider data
    df = df.merge(market_metrics, on=['zipCode', 'specialty'], how='left')
    
    # Calculate provider-specific features
    df['market_position'] = df.groupby(['zipCode', 'specialty'])['marketSharePercentage'].rank(
        method='dense', ascending=False
    ).astype(int)
    
    # Calculate gap to market leader
    df['share_gap_to_leader'] = df.groupby(['zipCode', 'specialty'])['marketSharePercentage'].transform(
        lambda x: x.max() - x
    )
    
    # Provider dominance indicators
    df['is_dominant'] = (df['marketSharePercentage'] > 50).astype(int)
    df['is_second_place'] = (df['market_position'] == 2).astype(int)
    df['is_third_place'] = (df['market_position'] == 3).astype(int)
    
    # Market concentration categories
    df['market_concentration'] = pd.cut(
        df['hhi'], 
        bins=[0, 1500, 2500, 10000], 
        labels=['competitive', 'moderate', 'concentrated']
    )
    
    logger.info(f"Calculated market metrics for {len(df)} provider-market records")
    return df

def create_risk_targets(df):
    """Create meaningful risk targets based on competitive dynamics"""
    logger.info("Creating competitive risk targets...")
    
    # Target 1: High risk in competitive markets (vulnerable to competition)
    df['high_risk_competitive'] = (
        (df['marketSharePercentage'] < 15) & 
        (df['num_providers'] >= 3) &
        (df['market_fragmentation'] > 0.3)
    ).astype(int)
    
    # Target 2: High risk in concentrated markets (vulnerable to dominant player)
    df['high_risk_concentrated'] = (
        (df['market_position'] >= 2) & 
        (df['hhi'] > 2500) &
        (df['marketSharePercentage'] < 30)
    ).astype(int)
    
    # Target 3: High risk based on market position and share
    df['high_risk_position'] = (
        (df['market_position'] >= 3) | 
        (df['marketSharePercentage'] < 10)
    ).astype(int)
    
    # Target 4: High risk based on revenue efficiency
    revenue_median = df['providerRevenue'].median()
    df['high_risk_revenue'] = (
        (df['providerRevenue'] < revenue_median) & 
        (df['marketSharePercentage'] < 20)
    ).astype(int)
    
    # Primary target: Combined risk score
    df['is_high_risk'] = (
        df['high_risk_competitive'] | 
        df['high_risk_concentrated'] | 
        df['high_risk_position']
    ).astype(int)
    
    logger.info(f"Risk target distribution:")
    logger.info(f"  High risk (competitive): {df['high_risk_competitive'].sum()}/{len(df)}")
    logger.info(f"  High risk (concentrated): {df['high_risk_concentrated'].sum()}/{len(df)}")
    logger.info(f"  High risk (position): {df['high_risk_position'].sum()}/{len(df)}")
    logger.info(f"  Overall high risk: {df['is_high_risk'].sum()}/{len(df)}")
    
    return df

def engineer_features(df):
    """Engineer advanced features for ML training"""
    logger.info("Engineering advanced ML features...")
    
    features = df.copy()
    
    # 1. Market share features
    features['market_share_log'] = np.log(features['marketSharePercentage'] + 1)
    features['market_share_squared'] = features['marketSharePercentage'] ** 2
    
    # 2. Market position features
    features['position_inverse'] = 1 / features['market_position']
    features['is_top_3'] = (features['market_position'] <= 3).astype(int)
    
    # 3. Market concentration features
    features['hhi_log'] = np.log(features['hhi'] + 1)
    features['is_highly_concentrated'] = (features['hhi'] > 2500).astype(int)
    
    # 4. Revenue features
    features['revenue_log'] = np.log(features['providerRevenue'] + 1)
    features['revenue_per_service'] = features['providerRevenue'] / features['providerServices']
    features['revenue_efficiency'] = features['providerRevenue'] / features['totalMarketRevenue']
    
    # 5. Competition features
    features['competition_intensity'] = features['num_providers'] * features['market_fragmentation']
    features['share_gap_log'] = np.log(features['share_gap_to_leader'] + 1)
    
    # 6. Geographic features
    features['zip_region'] = features['zipCode'].str[:2].astype(str)
    
    # 7. Specialty encoding
    le = LabelEncoder()
    features['specialty_encoded'] = le.fit_transform(features['specialty'].fillna('Unknown'))
    features['zip_region_encoded'] = le.fit_transform(features['zip_region'].fillna('00'))
    
    # 8. Interaction features
    features['share_position_interaction'] = features['marketSharePercentage'] * features['position_inverse']
    features['hhi_competition_interaction'] = features['hhi'] * features['num_providers']
    
    # 9. Composite risk score
    features['composite_risk_score'] = (
        features['market_share_log'] * 0.2 +
        features['position_inverse'] * 0.3 +
        features['hhi_log'] * 0.2 +
        features['share_gap_log'] * 0.2 +
        features['competition_intensity'] * 0.1
    )
    
    # Select final features for ML
    ml_features = [
        'market_share_log', 'market_share_squared', 'position_inverse', 'is_top_3',
        'hhi_log', 'is_highly_concentrated', 'revenue_log', 'revenue_efficiency',
        'competition_intensity', 'share_gap_log', 'specialty_encoded', 
        'zip_region_encoded', 'share_position_interaction', 'hhi_competition_interaction',
        'composite_risk_score', 'is_dominant', 'is_second_place', 'is_third_place'
    ]
    
    # Remove rows with missing values
    features = features.dropna(subset=ml_features)
    
    logger.info(f"Engineered {len(ml_features)} features for {len(features)} provider-market records")
    return features[ml_features + ['is_high_risk', 'high_risk_competitive', 'high_risk_concentrated', 'high_risk_position']]

def train_competitive_models(features_df):
    """Train multiple models for competitive market analysis"""
    logger.info("Training competitive market models...")
    
    if features_df is None or len(features_df) == 0:
        logger.error("No features data available for training")
        return None
    
    # Prepare features and targets
    feature_cols = [col for col in features_df.columns if col not in ['is_high_risk', 'high_risk_competitive', 'high_risk_concentrated', 'high_risk_position']]
    X = features_df[feature_cols]
    y = features_df['is_high_risk']
    
    logger.info(f"Training on {len(X)} samples with {len(X.columns)} features")
    logger.info(f"Target distribution: {y.value_counts().to_dict()}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    models = {}
    feature_importance = {}
    metrics = {}
    
    # 1. Train XGBoost model
    logger.info("Training XGBoost model...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric='logloss'
    )
    xgb_model.fit(X_train, y_train)
    
    # XGBoost predictions and metrics
    y_pred_xgb = xgb_model.predict(X_test)
    y_pred_proba_xgb = xgb_model.predict_proba(X_test)[:, 1]
    auc_xgb = roc_auc_score(y_test, y_pred_proba_xgb)
    accuracy_xgb = (y_pred_xgb == y_test).mean()
    
    models['xgboost'] = xgb_model
    feature_importance['xgboost'] = dict(zip(X.columns, xgb_model.feature_importances_))
    metrics['xgboost'] = {
        'auc_score': auc_xgb,
        'accuracy': accuracy_xgb,
        'classification_report': classification_report(y_test, y_pred_xgb)
    }
    
    # 2. Train Logistic Regression for interpretability
    logger.info("Training Logistic Regression model...")
    lr_model = LogisticRegression(random_state=42, max_iter=1000)
    lr_model.fit(X_train, y_train)
    
    # LR predictions and metrics
    y_pred_lr = lr_model.predict(X_test)
    y_pred_proba_lr = lr_model.predict_proba(X_test)[:, 1]
    auc_lr = roc_auc_score(y_test, y_pred_proba_lr)
    accuracy_lr = (y_pred_lr == y_test).mean()
    
    models['logistic_regression'] = lr_model
    feature_importance['logistic_regression'] = dict(zip(X.columns, np.abs(lr_model.coef_[0])))
    metrics['logistic_regression'] = {
        'auc_score': auc_lr,
        'accuracy': accuracy_lr,
        'classification_report': classification_report(y_test, y_pred_lr)
    }
    
    logger.info(f"Model training complete!")
    logger.info(f"XGBoost - AUC: {auc_xgb:.4f}, Accuracy: {accuracy_xgb:.4f}")
    logger.info(f"Logistic Regression - AUC: {auc_lr:.4f}, Accuracy: {accuracy_lr:.4f}")
    
    # Show top features
    top_xgb_features = sorted(feature_importance['xgboost'].items(), key=lambda x: x[1], reverse=True)[:5]
    logger.info(f"Top 5 XGBoost features: {top_xgb_features}")
    
    return models, feature_importance, metrics

def save_competitive_models(models, feature_importance, metrics, output_dir='models'):
    """Save all competitive market models and metrics"""
    logger.info("Saving competitive market models...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Save models
    for name, model in models.items():
        model_path = os.path.join(output_dir, f'competitive_{name}_model.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        logger.info(f"Saved {name} model to {model_path}")
    
    # Save performance report
    report = {
        'timestamp': datetime.now().isoformat(),
        'models': {}
    }
    
    for model_name, model_metrics in metrics.items():
        report['models'][model_name] = {
            'metrics': {k: float(v) if isinstance(v, (np.float32, np.float64)) else v 
                       for k, v in model_metrics.items() if k != 'classification_report'},
            'feature_importance': {k: float(v) if isinstance(v, (np.float32, np.float64)) else v 
                                 for k, v in feature_importance[model_name].items()}
        }
    
    report_path = os.path.join('outputs', 'competitive_model_performance.json')
    os.makedirs('outputs', exist_ok=True)
    
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Performance report saved to {report_path}")

def test_competitive_predictions(models, features_df):
    """Test the trained models with sample predictions"""
    logger.info("--- Testing Competitive Market Predictions ---")
    
    if 'xgboost' not in models:
        logger.error("No trained models found")
        return
    
    model = models['xgboost']
    feature_cols = [col for col in features_df.columns if col not in ['is_high_risk', 'high_risk_competitive', 'high_risk_concentrated', 'high_risk_position']]
    
    # Sample a few provider-market combinations for testing
    sample_data = features_df[feature_cols].head(10)
    
    # Make predictions
    predictions = model.predict(sample_data)
    probabilities = model.predict_proba(sample_data)[:, 1]
    
    logger.info("Sample competitive market predictions:")
    for i, (pred, prob) in enumerate(zip(predictions, probabilities)):
        risk_level = "HIGH RISK" if pred == 1 else "LOW RISK"
        logger.info(f"Provider-Market {i+1}: {risk_level} (probability: {prob:.3f})")
    
    # Show feature importance
    feature_importance = dict(zip(feature_cols, model.feature_importances_))
    logger.info("Top 5 most important competitive features:")
    top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]
    for feature, importance in top_features:
        logger.info(f"  {feature}: {importance:.4f}")

def main():
    """Main function to run competitive market ML training"""
    logger.info("--- Starting Competitive Market ML Training Pipeline ---")
    
    # 1. Load competitive market data
    df = load_competitive_market_data()
    if df is None:
        logger.error("Failed to load competitive market data")
        return
    
    # 2. Calculate market metrics
    df = calculate_market_metrics(df)
    
    # 3. Create risk targets
    df = create_risk_targets(df)
    
    # 4. Engineer features
    features_df = engineer_features(df)
    
    # 5. Train models
    result = train_competitive_models(features_df)
    if result is None:
        logger.error("Failed to train models")
        return
    
    models, feature_importance, metrics = result
    
    # 6. Save models and performance report
    save_competitive_models(models, feature_importance, metrics)
    
    # 7. Test predictions
    test_competitive_predictions(models, features_df)
    
    logger.info("--- Competitive Market ML Training Pipeline Finished ---")

if __name__ == '__main__':
    main() 