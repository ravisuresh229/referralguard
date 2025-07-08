#!/usr/bin/env python3
"""
Test script to verify ReferralGuard setup
"""

import json
import os
from config import config
from utils.file_handler import file_handler

def test_config():
    """Test configuration"""
    print("=== Testing Configuration ===")
    print(f"Environment: {config.ENV}")
    print(f"Is Production: {config.IS_PRODUCTION}")
    print(f"Insights Path: {config.get_insights_path()}")
    print(f"Model Path: {config.get_model_path()}")
    print(f"Outputs Dir: {config.get_outputs_dir()}")
    print(f"Models Dir: {config.get_models_dir()}")
    print()

def test_file_handler():
    """Test file handler"""
    print("=== Testing File Handler ===")
    
    # Test insights file
    insights_path = config.get_insights_path()
    print(f"Insights file exists: {file_handler.file_exists(insights_path)}")
    
    if file_handler.file_exists(insights_path):
        insights = file_handler.read_json(insights_path)
        if insights:
            print(f"Insights loaded successfully: {len(insights.get('marketAnalysis', []))} markets")
        else:
            print("Failed to load insights")
    
    # Test model file
    model_path = config.get_model_path()
    print(f"Model file exists: {file_handler.file_exists(model_path)}")
    
    if file_handler.file_exists(model_path):
        try:
            with file_handler.open_binary(model_path) as f:
                import pickle
                model = pickle.load(f)
                print(f"Model loaded successfully: {type(model).__name__}")
        except Exception as e:
            print(f"Failed to load model: {e}")
    
    print()

def test_folder_structure():
    """Test folder structure"""
    print("=== Testing Folder Structure ===")
    
    folders = ['outputs', 'models', 'raw-data']
    for folder in folders:
        if os.path.exists(folder):
            files = os.listdir(folder)
            print(f"{folder}/: {len(files)} files")
            for file in files[:3]:  # Show first 3 files
                print(f"  - {file}")
            if len(files) > 3:
                print(f"  ... and {len(files) - 3} more")
        else:
            print(f"{folder}/: folder not found")
    print()

def test_nextjs_compatibility():
    """Test Next.js compatibility"""
    print("=== Testing Next.js Compatibility ===")
    
    # Check if insights file is in the right place for Next.js
    nextjs_insights_path = "referralguard-dashboard/public/real_insights.json"
    if os.path.exists(nextjs_insights_path):
        print(f"Next.js insights file exists: {nextjs_insights_path}")
        try:
            with open(nextjs_insights_path, 'r') as f:
                data = json.load(f)
                print(f"Next.js insights loaded: {len(data.get('marketAnalysis', []))} markets")
        except Exception as e:
            print(f"Failed to load Next.js insights: {e}")
    else:
        print(f"Next.js insights file missing: {nextjs_insights_path}")
    
    print()

def main():
    """Run all tests"""
    print("🧪 ReferralGuard Setup Test")
    print("=" * 50)
    
    test_config()
    test_file_handler()
    test_folder_structure()
    test_nextjs_compatibility()
    
    print("✅ Test completed!")

if __name__ == "__main__":
    main() 