"""
Core module for processing Medicare billing data and building referral networks.
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging
from pathlib import Path
import re
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)

class MedicareProcessor:
    """Process Medicare billing data to build referral networks."""
    
    # Provider type mappings
    PCP_SPECIALTIES = {
        'Internal Medicine',
        'Family Practice',
        'General Practice',
        'Pediatrics'
    }
    
    # Common referral patterns with trigger keywords and average values
    REFERRAL_PATTERNS = {
        'Cardiology': {
            'keywords': ['chest pain', 'heart', 'cardiac', 'echocardiogram'],
            'avg_value': 500
        },
        'Orthopedics': {
            'keywords': ['joint', 'bone', 'fracture', 'sports injury'],
            'avg_value': 800
        },
        'Gastroenterology': {
            'keywords': ['digestive', 'stomach', 'colon', 'endoscopy'],
            'avg_value': 600
        },
        'Neurology': {
            'keywords': ['headache', 'migraine', 'seizure', 'stroke'],
            'avg_value': 700
        }
    }
    
    # Evaluation and Management codes for PCPs
    PCP_EVAL_CODES = {
        '99201', '99202', '99203', '99204', '99205',  # New patient
        '99211', '99212', '99213', '99214', '99215'   # Established patient
    }
    
    # Consultation codes for specialists
    SPECIALIST_CONSULT_CODES = {
        '99241', '99242', '99243', '99244', '99245'  # Office consultations
    }
    
    def __init__(self, data_dir: str):
        """Initialize the processor with data directory."""
        self.data_dir = Path(data_dir)
        self.medicare_file = self.data_dir / 'data' / 'Medicare Physician & Other Practitioners - by Provider and Service' / '2023' / 'MUP_PHY_R25_P05_V20_D23_Prov_Svc.csv'
        self.providers_df = None
        self.referral_network = None
        
    def load_medicare_data(self) -> None:
        """Load Medicare billing data with memory-efficient chunking."""
        logger.info("Loading Medicare billing data...")
        
        # Get total size for progress tracking
        total_size = sum(1 for _ in open(self.medicare_file, 'r')) - 1  # Subtract header
        
        # Read in chunks to manage memory
        chunk_size = 100000  # Adjust based on available memory
        chunks = []
        
        for chunk in pd.read_csv(self.medicare_file, chunksize=chunk_size, low_memory=False):
            # Process each chunk
            chunk = self._process_chunk(chunk)
            chunks.append(chunk)
            
            # Log progress
            logger.info(f"Processed {len(chunks) * chunk_size:,} of {total_size:,} records")
        
        # Combine processed chunks
        self.providers_df = pd.concat(chunks, ignore_index=True)
        logger.info(f"Loaded {len(self.providers_df):,} provider records")
        
    def _process_chunk(self, chunk: pd.DataFrame) -> pd.DataFrame:
        """Process a chunk of Medicare data."""
        # Select relevant columns
        columns = [
            'Rndrng_NPI', 'Rndrng_Prvdr_Last_Org_Name', 'Rndrng_Prvdr_First_Name',
            'Rndrng_Prvdr_State_Abrvtn', 'Rndrng_Prvdr_Zip5',
            'Rndrng_Prvdr_City', 'Rndrng_Prvdr_Type',
            'HCPCS_Cd', 'HCPCS_Desc',
            'Tot_Srvcs', 'Tot_Benes',
            'Avg_Mdcr_Alowd_Amt'
        ]
        
        chunk = chunk[columns].copy()
        
        # Clean and standardize data
        chunk['Rndrng_Prvdr_Type'] = chunk['Rndrng_Prvdr_Type'].str.strip()
        chunk['HCPCS_Cd'] = chunk['HCPCS_Cd'].str.strip()
        
        # Rename columns to match our processing logic
        chunk = chunk.rename(columns={
            'Rndrng_NPI': 'NPI',
            'Rndrng_Prvdr_Last_Org_Name': 'Provider Last Name',
            'Rndrng_Prvdr_First_Name': 'Provider First Name',
            'Rndrng_Prvdr_State_Abrvtn': 'Provider State',
            'Rndrng_Prvdr_Zip5': 'Provider ZIP',
            'Rndrng_Prvdr_City': 'Provider City',
            'Rndrng_Prvdr_Type': 'Provider Type',
            'HCPCS_Cd': 'HCPCS Code',
            'HCPCS_Desc': 'HCPCS Description',
            'Tot_Srvcs': 'Number of Services',
            'Tot_Benes': 'Number of Medicare Beneficiaries',
            'Avg_Mdcr_Alowd_Amt': 'Average Medicare Allowed Amount'
        })
        
        return chunk
        
    def identify_referral_pairs(self) -> pd.DataFrame:
        """Identify potential referral pairs based on billing patterns."""
        logger.info("Identifying referral pairs...")
        
        # Group by provider and service
        provider_services = self.providers_df.groupby(
            ['NPI', 'Provider Type', 'HCPCS Code']
        ).agg({
            'Number of Services': 'sum',
            'Number of Medicare Beneficiaries': 'sum',
            'Average Medicare Allowed Amount': 'mean'
        }).reset_index()
        
        # Identify PCPs and specialists
        pcps = provider_services[
            provider_services['Provider Type'].isin(self.PCP_SPECIALTIES)
        ]
        specialists = provider_services[
            ~provider_services['Provider Type'].isin(self.PCP_SPECIALTIES)
        ]
        
        # Find potential referral pairs
        referral_pairs = []
        
        for _, pcp in pcps.iterrows():
            pcp_services = set(pcp['HCPCS Code'])
            
            for _, specialist in specialists.iterrows():
                # Check for consultation codes
                if specialist['HCPCS Code'] in self.SPECIALIST_CONSULT_CODES:
                    # Calculate referral probability based on:
                    # 1. Geographic proximity
                    # 2. Service volume
                    # 3. Patient overlap
                    
                    # For now, use a simple scoring system
                    score = (
                        specialist['Number of Services'] * 0.4 +
                        specialist['Number of Medicare Beneficiaries'] * 0.4 +
                        (1 if specialist['HCPCS Code'] in self.SPECIALIST_CONSULT_CODES else 0) * 0.2
                    )
                    
                    if score > 0.5:  # Threshold for considering a referral relationship
                        referral_pairs.append({
                            'referring_npi': pcp['NPI'],
                            'referred_npi': specialist['NPI'],
                            'referring_type': pcp['Provider Type'],
                            'referred_type': specialist['Provider Type'],
                            'referral_volume': specialist['Number of Services'],
                            'patient_volume': specialist['Number of Medicare Beneficiaries'],
                            'avg_value': specialist['Average Medicare Allowed Amount'],
                            'confidence_score': score
                        })
        
        return pd.DataFrame(referral_pairs)
        
    def calculate_leakage_metrics(self, referral_pairs: pd.DataFrame) -> Dict:
        """Calculate referral leakage metrics."""
        logger.info("Calculating leakage metrics...")
        
        # Group by provider type pairs
        type_pairs = referral_pairs.groupby(
            ['referring_type', 'referred_type']
        ).agg({
            'referral_volume': 'sum',
            'patient_volume': 'sum',
            'avg_value': 'mean',
            'confidence_score': 'mean'
        }).reset_index()
        
        # Calculate leakage metrics
        total_referrals = type_pairs['referral_volume'].sum()
        total_value = (type_pairs['referral_volume'] * type_pairs['avg_value']).sum()
        
        # For now, assume 30% leakage rate (this should be calculated based on actual data)
        leakage_rate = 0.30
        leaked_referrals = total_referrals * leakage_rate
        leaked_value = total_value * leakage_rate
        
        return {
            'total_referrals': total_referrals,
            'total_value': total_value,
            'leakage_rate': leakage_rate,
            'leaked_referrals': leaked_referrals,
            'leaked_value': leaked_value,
            'type_pairs': type_pairs
        }
        
    def generate_referral_network(self) -> Dict:
        """Generate the complete referral network dataset."""
        logger.info("Generating referral network...")
        
        # Identify referral pairs
        referral_pairs = self.identify_referral_pairs()
        
        # Calculate leakage metrics
        metrics = self.calculate_leakage_metrics(referral_pairs)
        
        # Combine results
        network_data = {
            'referral_pairs': referral_pairs,
            'metrics': metrics,
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Generated network with {len(referral_pairs):,} referral pairs")
        return network_data 