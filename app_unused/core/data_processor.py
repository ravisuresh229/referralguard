"""
Data processing module for ReferralGuard.
Handles efficient loading and processing of large CMS datasets.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging
from datetime import datetime
import zipfile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CMSDataProcessor:
    """Handles loading and processing of CMS datasets efficiently."""
    
    def __init__(self, data_dir: str):
        """
        Initialize the data processor.
        
        Args:
            data_dir: Directory containing CMS data files
        """
        self.data_dir = Path(data_dir)
        self.nppes_df = None
        self.physician_compare_df = None
        self.medicare_services_df = None
        
    def load_nppes_data(self, chunk_size: int = 100000) -> None:
        """
        Load NPPES provider database efficiently using chunking.
        
        Args:
            chunk_size: Number of rows to process at once
        """
        logger.info("Loading NPPES provider database...")
        zip_path = self.data_dir / "NPPES_Data_Dissemination_June_2025.zip"
        
        # Define columns we need to reduce memory usage
        needed_columns = [
            'NPI', 'Provider Organization Name (Legal Business Name)',
            'Provider Last Name (Legal Name)', 'Provider First Name',
            'Provider Business Practice Location Address State Name',
            'Provider Business Practice Location Address Postal Code',
            'Healthcare Provider Taxonomy Code_1',
            'Provider License Number State Code_1'
        ]
        
        # Read in chunks with only needed columns
        chunks = []
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Find the main NPI data file
            npi_file = next(f for f in zip_ref.namelist() if f.startswith('npidata_pfile_') and f.endswith('.csv'))
            
            # Read the file in chunks
            with zip_ref.open(npi_file) as f:
                for chunk in pd.read_csv(
                    f,
                    usecols=needed_columns,
                    chunksize=chunk_size,
                    dtype={
                        'NPI': 'str',
                        'Provider Business Practice Location Address Postal Code': 'str',
                        'Healthcare Provider Taxonomy Code_1': 'str'
                    }
                ):
                    chunks.append(chunk)
        
        self.nppes_df = pd.concat(chunks, ignore_index=True)
        logger.info(f"Loaded {len(self.nppes_df):,} NPPES provider records")
        
    def load_physician_compare_data(self, chunk_size: int = 100000) -> None:
        """
        Load Physician Compare national file.
        
        Args:
            chunk_size: Number of rows to process at once
        """
        logger.info("Loading Physician Compare data...")
        file_path = self.data_dir / "DAC_NationalDownloadableFile (1).csv"
        
        needed_columns = [
            'NPI', 'Ind_PAC_ID', 'Ind_enrl_ID',
            'Provider Last Name', 'Provider First Name', 'Provider Middle Name',
            'pri_spec', 'Facility Name',
            'org_pac_id', 'num_org_mem',
            'adr_ln_1', 'adr_ln_2',
            'City/Town', 'State', 'ZIP Code'
        ]
        
        chunks = []
        for chunk in pd.read_csv(
            file_path,
            usecols=needed_columns,
            chunksize=chunk_size,
            dtype={
                'NPI': 'str',
                'Ind_PAC_ID': 'str',
                'Ind_enrl_ID': 'str',
                'ZIP Code': 'str'
            }
        ):
            chunks.append(chunk)
            
        self.physician_compare_df = pd.concat(chunks, ignore_index=True)
        logger.info(f"Loaded {len(self.physician_compare_df):,} Physician Compare records")
        
    def standardize_provider_names(self) -> None:
        """Standardize provider names across datasets."""
        if self.nppes_df is not None:
            # Standardize organization names
            self.nppes_df['Provider Organization Name (Legal Business Name)'] = (
                self.nppes_df['Provider Organization Name (Legal Business Name)']
                .str.upper()
                .str.strip()
                .str.replace(r'\s+', ' ', regex=True)
            )
            
            # Combine individual provider names
            self.nppes_df['Provider Full Name'] = (
                self.nppes_df['Provider First Name'] + ' ' + 
                self.nppes_df['Provider Last Name (Legal Name)']
            ).str.upper().str.strip()
            
    def get_provider_affiliations(self) -> pd.DataFrame:
        """
        Extract provider affiliations from the datasets.
        
        Returns:
            DataFrame with provider affiliations
        """
        if self.nppes_df is None or self.physician_compare_df is None:
            raise ValueError("Must load NPPES and Physician Compare data first")
            
        # Merge datasets on NPI
        affiliations = pd.merge(
            self.nppes_df[['NPI', 'Provider Organization Name (Legal Business Name)']],
            self.physician_compare_df[['NPI', 'Facility Name']],
            on='NPI',
            how='outer'
        )
        
        # Clean and standardize organization names
        affiliations['Organization Name'] = (
            affiliations['Facility Name']
            .fillna(affiliations['Provider Organization Name (Legal Business Name)'])
            .str.upper()
            .str.strip()
        )
        
        return affiliations.drop_duplicates()
        
    def analyze_data_structure(self) -> Dict:
        """
        Analyze the structure of loaded datasets.
        
        Returns:
            Dictionary containing dataset statistics
        """
        analysis = {
            'nppes': {
                'total_records': len(self.nppes_df) if self.nppes_df is not None else 0,
                'columns': list(self.nppes_df.columns) if self.nppes_df is not None else [],
                'memory_usage': self.nppes_df.memory_usage(deep=True).sum() if self.nppes_df is not None else 0
            },
            'physician_compare': {
                'total_records': len(self.physician_compare_df) if self.physician_compare_df is not None else 0,
                'columns': list(self.physician_compare_df.columns) if self.physician_compare_df is not None else [],
                'memory_usage': self.physician_compare_df.memory_usage(deep=True).sum() if self.physician_compare_df is not None else 0
            }
        }
        
        return analysis

def main():
    """Example usage of the CMSDataProcessor."""
    processor = CMSDataProcessor(".")
    
    # Load datasets
    processor.load_nppes_data()
    processor.load_physician_compare_data()
    
    # Standardize names
    processor.standardize_provider_names()
    
    # Get provider affiliations
    affiliations = processor.get_provider_affiliations()
    
    # Analyze data structure
    analysis = processor.analyze_data_structure()
    
    # Print some insights
    logger.info("\nDataset Analysis:")
    logger.info(f"NPPES Records: {analysis['nppes']['total_records']:,}")
    logger.info(f"Physician Compare Records: {analysis['physician_compare']['total_records']:,}")
    logger.info(f"Unique Provider Affiliations: {len(affiliations):,}")

if __name__ == "__main__":
    main() 