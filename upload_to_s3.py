#!/usr/bin/env python3
"""
Script to upload ReferralGuard data to S3 for cloud-based storage.
This script will upload all existing data files to the configured S3 bucket.
"""

import os
import sys
import json
from config import s3_config, save_data_to_cloud, DATA_FILES

def upload_existing_data():
    """Upload all existing data files to S3"""
    print("🚀 Starting S3 upload process...")
    
    if not s3_config.use_s3:
        print("❌ S3 is not configured. Please set up AWS credentials in .env.local")
        print("   Required environment variables:")
        print("   - USE_S3=true")
        print("   - AWS_ACCESS_KEY_ID=your_access_key")
        print("   - AWS_SECRET_ACCESS_KEY=your_secret_key")
        print("   - S3_BUCKET_NAME=your_bucket_name")
        return False
    
    print(f"✅ S3 configured for bucket: {s3_config.bucket_name}")
    
    # Upload each data file
    success_count = 0
    total_count = len(DATA_FILES)
    
    for data_type, filename in DATA_FILES.items():
        print(f"\n📁 Processing {data_type}: {filename}")
        
        local_path = os.path.join('outputs', filename)
        
        if not os.path.exists(local_path):
            print(f"   ⚠️  Local file not found: {local_path}")
            continue
        
        try:
            # Load the data
            with open(local_path, 'r') as f:
                data = json.load(f)
            
            # Upload to S3
            if save_data_to_cloud(data, filename):
                print(f"   ✅ Successfully uploaded {filename} to S3")
                success_count += 1
            else:
                print(f"   ❌ Failed to upload {filename} to S3")
                
        except Exception as e:
            print(f"   ❌ Error processing {filename}: {e}")
    
    print(f"\n📊 Upload Summary:")
    print(f"   Successfully uploaded: {success_count}/{total_count} files")
    
    if success_count == total_count:
        print("🎉 All data files uploaded successfully!")
        return True
    else:
        print("⚠️  Some files failed to upload. Check the logs above.")
        return False

def create_s3_bucket():
    """Create the S3 bucket if it doesn't exist"""
    if not s3_config.use_s3:
        print("❌ S3 is not configured")
        return False
    
    try:
        # Check if bucket exists
        s3_config.s3_client.head_bucket(Bucket=s3_config.bucket_name)
        print(f"✅ Bucket {s3_config.bucket_name} already exists")
        return True
    except Exception:
        try:
            # Create bucket
            s3_config.s3_client.create_bucket(
                Bucket=s3_config.bucket_name,
                CreateBucketConfiguration={'LocationConstraint': s3_config.region}
            )
            print(f"✅ Created bucket: {s3_config.bucket_name}")
            return True
        except Exception as e:
            print(f"❌ Failed to create bucket: {e}")
            return False

def list_s3_contents():
    """List all files in the S3 bucket"""
    if not s3_config.use_s3:
        print("❌ S3 is not configured")
        return
    
    try:
        files = s3_config.list_files()
        if files:
            print(f"\n📋 Files in S3 bucket '{s3_config.bucket_name}':")
            for file in files:
                print(f"   - {file}")
        else:
            print(f"\n📋 No files found in S3 bucket '{s3_config.bucket_name}'")
    except Exception as e:
        print(f"❌ Error listing S3 contents: {e}")

def main():
    """Main function"""
    print("🔧 ReferralGuard S3 Setup Tool")
    print("=" * 40)
    
    # Check if we should create bucket
    if len(sys.argv) > 1 and sys.argv[1] == '--create-bucket':
        create_s3_bucket()
        return
    
    # Check if we should list contents
    if len(sys.argv) > 1 and sys.argv[1] == '--list':
        list_s3_contents()
        return
    
    # Default: upload data
    if create_s3_bucket():
        upload_existing_data()
        list_s3_contents()

if __name__ == "__main__":
    main() 