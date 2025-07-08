import os
import json
import boto3
from typing import Any, Dict, Optional
from botocore.exceptions import ClientError, NoCredentialsError
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config

class FileHandler:
    """Handles file operations for both local and S3 storage"""
    
    def __init__(self):
        self.s3_client = None
        if config.IS_PRODUCTION and config.AWS_ACCESS_KEY_ID:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
                    region_name=config.AWS_REGION
                )
            except NoCredentialsError:
                print("Warning: AWS credentials not found, falling back to local storage")
                self.s3_client = None
    
    def is_s3_path(self, path: str) -> bool:
        """Check if a path is an S3 path"""
        return path.startswith('s3://')
    
    def read_json(self, path: str) -> Optional[Dict[str, Any]]:
        """Read JSON data from local file or S3"""
        try:
            if self.is_s3_path(path):
                return self._read_json_from_s3(path)
            else:
                return self._read_json_from_local(path)
        except Exception as e:
            print(f"Error reading JSON from {path}: {e}")
            return None
    
    def write_json(self, data: Dict[str, Any], path: str) -> bool:
        """Write JSON data to local file or S3"""
        try:
            if self.is_s3_path(path):
                return self._write_json_to_s3(data, path)
            else:
                return self._write_json_to_local(data, path)
        except Exception as e:
            print(f"Error writing JSON to {path}: {e}")
            return False
    
    def file_exists(self, path: str) -> bool:
        """Check if file exists in local filesystem or S3"""
        try:
            if self.is_s3_path(path):
                return self._s3_file_exists(path)
            else:
                return os.path.exists(path)
        except Exception as e:
            print(f"Error checking file existence for {path}: {e}")
            return False
    
    def open_binary(self, path: str):
        """Open binary file for reading (local only for now)"""
        if self.is_s3_path(path):
            raise NotImplementedError("Binary file reading from S3 not yet implemented")
        else:
            return open(path, 'rb')
    
    def _read_json_from_local(self, path: str) -> Dict[str, Any]:
        """Read JSON from local file"""
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _write_json_to_local(self, data: Dict[str, Any], path: str) -> bool:
        """Write JSON to local file"""
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    
    def _read_json_from_s3(self, s3_path: str) -> Dict[str, Any]:
        """Read JSON from S3"""
        if not self.s3_client:
            raise Exception("S3 client not initialized")
        
        bucket, key = self._parse_s3_path(s3_path)
        response = self.s3_client.get_object(Bucket=bucket, Key=key)
        return json.loads(response['Body'].read().decode('utf-8'))
    
    def _write_json_to_s3(self, data: Dict[str, Any], s3_path: str) -> bool:
        """Write JSON to S3"""
        if not self.s3_client:
            raise Exception("S3 client not initialized")
        
        bucket, key = self._parse_s3_path(s3_path)
        json_data = json.dumps(data, indent=2, ensure_ascii=False)
        self.s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=json_data.encode('utf-8'),
            ContentType='application/json'
        )
        return True
    
    def _s3_file_exists(self, s3_path: str) -> bool:
        """Check if file exists in S3"""
        if not self.s3_client:
            return False
        
        bucket, key = self._parse_s3_path(s3_path)
        try:
            self.s3_client.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise
    
    def _parse_s3_path(self, s3_path: str) -> tuple[str, str]:
        """Parse S3 path to get bucket and key"""
        if not s3_path.startswith('s3://'):
            raise ValueError(f"Invalid S3 path: {s3_path}")
        
        path_parts = s3_path[5:].split('/', 1)
        if len(path_parts) != 2:
            raise ValueError(f"Invalid S3 path format: {s3_path}")
        
        return path_parts[0], path_parts[1]

# Global file handler instance
file_handler = FileHandler() 