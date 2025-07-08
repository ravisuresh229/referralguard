"""
Script to analyze Medicare billing data and generate referral insights.
"""

import sys
from pathlib import Path
import logging
from datetime import datetime
import json

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.core.medicare_processor import MedicareProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'medicare_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Run the Medicare data analysis."""
    try:
        # Initialize the processor
        processor = MedicareProcessor(".")
        
        # Load Medicare data
        logger.info("Starting Medicare data analysis...")
        processor.load_medicare_data()
        
        # Identify referral pairs
        logger.info("Identifying referral relationships...")
        referral_pairs = processor.identify_referral_pairs()
        
        # Calculate referral volumes
        logger.info("Calculating referral volumes...")
        referral_volumes = processor.calculate_referral_volumes(referral_pairs)
        
        # Build and analyze network
        logger.info("Building referral network...")
        processor.build_referral_network(referral_volumes)
        analysis = processor.analyze_network()
        
        # Save detailed analysis
        output_file = f'referral_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(output_file, 'w') as f:
            json.dump(analysis, f, indent=2)
        
        # Print summary insights
        logger.info("\n=== Medicare Referral Analysis Results ===")
        logger.info(f"\nTotal Providers in Network: {analysis['total_providers']:,}")
        logger.info(f"Total Referral Relationships: {analysis['total_referrals']:,}")
        
        logger.info("\nTop 5 Referral Patterns:")
        for pattern, count in sorted(
            analysis['specialty_patterns'].items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]:
            logger.info(f"{pattern}: {count:,} referrals")
        
        logger.info("\nTop 5 Referring Providers:")
        for provider in analysis['top_referrers'][:5]:
            logger.info(
                f"NPI: {provider['npi']}, "
                f"Specialty: {provider['specialty']}, "
                f"Referrals: {provider['referrals']:,}"
            )
        
        logger.info("\nTop 5 Referred Providers:")
        for provider in analysis['top_referred'][:5]:
            logger.info(
                f"NPI: {provider['npi']}, "
                f"Specialty: {provider['specialty']}, "
                f"Referrals: {provider['referrals']:,}"
            )
        
        logger.info(f"\nDetailed analysis saved to {output_file}")
        
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main() 