"""
Script to analyze CMS datasets and generate initial insights.
"""

import sys
from pathlib import Path
import logging
from datetime import datetime

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.core.data_processor import CMSDataProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'cms_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Run the CMS data analysis."""
    try:
        # Initialize the data processor
        processor = CMSDataProcessor(".")
        
        # Load and process NPPES data
        logger.info("Starting NPPES data analysis...")
        processor.load_nppes_data()
        processor.standardize_provider_names()
        
        # Load and process Physician Compare data
        logger.info("Starting Physician Compare data analysis...")
        processor.load_physician_compare_data()
        
        # Get provider affiliations
        affiliations = processor.get_provider_affiliations()
        
        # Analyze data structure
        analysis = processor.analyze_data_structure()
        
        # Print detailed analysis
        logger.info("\n=== CMS Data Analysis Results ===")
        logger.info("\nNPPES Dataset:")
        logger.info(f"Total Records: {analysis['nppes']['total_records']:,}")
        logger.info(f"Memory Usage: {analysis['nppes']['memory_usage'] / 1024 / 1024:.2f} MB")
        logger.info("Key Columns:")
        for col in analysis['nppes']['columns']:
            logger.info(f"  - {col}")
            
        logger.info("\nPhysician Compare Dataset:")
        logger.info(f"Total Records: {analysis['physician_compare']['total_records']:,}")
        logger.info(f"Memory Usage: {analysis['physician_compare']['memory_usage'] / 1024 / 1024:.2f} MB")
        logger.info("Key Columns:")
        for col in analysis['physician_compare']['columns']:
            logger.info(f"  - {col}")
            
        logger.info("\nProvider Affiliations:")
        logger.info(f"Total Unique Affiliations: {len(affiliations):,}")
        
        # Save affiliations to CSV for further analysis
        output_file = f'provider_affiliations_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        affiliations.to_csv(output_file, index=False)
        logger.info(f"\nSaved provider affiliations to {output_file}")
        
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main() 