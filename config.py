import os
from typing import Optional
import boto3
from botocore.exceptions import ClientError
import json
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env.local
load_dotenv('.env.local')

class S3Config:
    def __init__(self):
        self.use_s3 = os.getenv('USE_S3', 'false').lower() == 'true'
        self.region = os.getenv('AWS_REGION', 'us-east-1')
        self.access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.bucket_name = os.getenv('S3_BUCKET_NAME', 'referralguard-data')
        self.data_prefix = os.getenv('S3_DATA_PREFIX', 'data/')
        
        if self.use_s3 and (not self.access_key or not self.secret_key):
            logger.warning("S3 is enabled but AWS credentials are not set. Falling back to local storage.")
            self.use_s3 = False
        
        self.s3_client = None
        if self.use_s3:
            try:
                self.s3_client = boto3.client(
                    's3',
                    region_name=self.region,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key
                )
                # Test the connection
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                logger.info(f"S3 connection established to bucket: {self.bucket_name}")
            except ClientError as e:
                logger.error(f"Failed to connect to S3: {e}")
                self.use_s3 = False
            except Exception as e:
                logger.error(f"Unexpected error connecting to S3: {e}")
                self.use_s3 = False

    def upload_file(self, file_path: str, s3_key: str) -> bool:
        """Upload a file to S3"""
        if not self.use_s3 or not self.s3_client:
            logger.warning("S3 not available, skipping upload")
            return False
        
        try:
            self.s3_client.upload_file(file_path, self.bucket_name, s3_key)
            logger.info(f"Successfully uploaded {file_path} to s3://{self.bucket_name}/{s3_key}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload {file_path} to S3: {e}")
            return False

    def download_file(self, s3_key: str, local_path: str) -> bool:
        """Download a file from S3"""
        if not self.use_s3 or not self.s3_client:
            logger.warning("S3 not available, skipping download")
            return False
        
        try:
            self.s3_client.download_file(self.bucket_name, s3_key, local_path)
            logger.info(f"Successfully downloaded s3://{self.bucket_name}/{s3_key} to {local_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to download {s3_key} from S3: {e}")
            return False

    def get_json_data(self, s3_key: str) -> Optional[dict]:
        """Get JSON data directly from S3"""
        if not self.use_s3 or not self.s3_client:
            logger.warning("S3 not available, cannot retrieve data")
            return None
        
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            data = json.loads(response['Body'].read().decode('utf-8'))
            logger.info(f"Successfully retrieved JSON data from s3://{self.bucket_name}/{s3_key}")
            return data
        except Exception as e:
            logger.error(f"Failed to retrieve JSON data from S3: {e}")
            return None

    def upload_json_data(self, data: dict, s3_key: str) -> bool:
        """Upload JSON data to S3"""
        if not self.use_s3 or not self.s3_client:
            logger.warning("S3 not available, cannot upload data")
            return False
        
        try:
            json_data = json.dumps(data, indent=2)
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=json_data,
                ContentType='application/json'
            )
            logger.info(f"Successfully uploaded JSON data to s3://{self.bucket_name}/{s3_key}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload JSON data to S3: {e}")
            return False

    def list_files(self, prefix: str = "") -> list:
        """List files in S3 bucket with given prefix"""
        if not self.use_s3 or not self.s3_client:
            logger.warning("S3 not available, cannot list files")
            return []
        
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            files = [obj['Key'] for obj in response.get('Contents', [])]
            logger.info(f"Found {len(files)} files in s3://{self.bucket_name}/{prefix}")
            return files
        except Exception as e:
            logger.error(f"Failed to list files in S3: {e}")
            return []

# Global S3 configuration instance
s3_config = S3Config()

# Data file paths
DATA_FILES = {
    'real_insights': 'real_insights.json',
    'model_performance': 'model_performance.json',
    'provider_features': 'provider_features.json',
    'market_analysis': 'market_analysis.json',
    'high_risk_providers': 'high_risk_providers.json'
}

def get_data_file_path(filename: str) -> str:
    """Get the local file path for a data file"""
    return os.path.join('outputs', filename)

def get_s3_key(filename: str) -> str:
    """Get the S3 key for a data file"""
    return f"{s3_config.data_prefix}{filename}"

def load_data_from_cloud(filename: str) -> Optional[dict]:
    """Load data from S3 if available, otherwise from local file"""
    s3_key = get_s3_key(filename)
    local_path = get_data_file_path(filename)
    
    # Try S3 first
    if s3_config.use_s3:
        data = s3_config.get_json_data(s3_key)
        if data:
            return data
    
    # Fallback to local file
    if os.path.exists(local_path):
        try:
            with open(local_path, 'r') as f:
                data = json.load(f)
            logger.info(f"Loaded data from local file: {local_path}")
            return data
        except Exception as e:
            logger.error(f"Failed to load local file {local_path}: {e}")
    
    logger.error(f"Data file not found: {filename}")
    return None

def save_data_to_cloud(data: dict, filename: str) -> bool:
    """Save data to both S3 and local file"""
    s3_key = get_s3_key(filename)
    local_path = get_data_file_path(filename)
    
    # Save to local file first
    try:
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Saved data to local file: {local_path}")
    except Exception as e:
        logger.error(f"Failed to save local file {local_path}: {e}")
        return False
    
    # Upload to S3
    if s3_config.use_s3:
        return s3_config.upload_json_data(data, s3_key)
    
    return True 