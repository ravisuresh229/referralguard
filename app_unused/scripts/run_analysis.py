"""
Script to run the complete ReferralGuard analysis pipeline.
"""

import sys
from pathlib import Path
import logging
from datetime import datetime
import json

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.core.medicare_processor import MedicareProcessor
from app.visualization.referral_dashboard import ReferralDashboard

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'referral_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Run the complete referral analysis pipeline."""
    try:
        # Initialize processors
        logger.info("Initializing analysis pipeline...")
        medicare_processor = MedicareProcessor(".")
        
        # Load and process Medicare data
        logger.info("Loading Medicare billing data...")
        medicare_processor.load_medicare_data()
        
        # Generate referral network
        logger.info("Generating referral network...")
        network_data = medicare_processor.generate_referral_network()
        
        # Create dashboard
        logger.info("Creating executive dashboard...")
        dashboard = ReferralDashboard(network_data)
        
        # Generate visualizations
        logger.info("Generating visualizations...")
        sankey = dashboard.create_sankey_diagram()
        leakage = dashboard.create_leakage_by_specialty()
        heatmap = dashboard.create_referral_heatmap()
        financial = dashboard.create_financial_impact()
        
        # Save visualizations
        output_dir = Path('analysis_results')
        output_dir.mkdir(exist_ok=True)
        
        sankey.write_html(output_dir / 'referral_flow.html')
        leakage.write_html(output_dir / 'leakage_by_specialty.html')
        heatmap.write_html(output_dir / 'referral_patterns.html')
        financial.write_html(output_dir / 'financial_impact.html')
        
        # Generate and save summary
        logger.info("Generating executive summary...")
        dashboard.save_results(output_dir)
        
        # Print executive summary
        summary = dashboard.generate_executive_summary()
        
        logger.info("\n=== REFERRALGUARD EXECUTIVE SUMMARY ===")
        logger.info(f"\nTotal Referrals Analyzed: {summary['total_referrals']:,}")
        logger.info(f"Overall Leakage Rate: {summary['leakage_rate']:.1f}%")
        logger.info(f"Total Revenue at Risk: ${summary['total_revenue_loss']:,.2f}")
        logger.info(f"Annual Revenue Loss: ${summary['annual_revenue_loss']:,.2f}")
        
        logger.info("\nTop 3 Leaking Specialties:")
        for specialty in summary['top_leaking_specialties']:
            logger.info(
                f"{specialty['specialty']}: "
                f"{specialty['referrals']:,} referrals, "
                f"${specialty['revenue_loss']:,.2f} at risk"
            )
        
        logger.info("\nProjected Impact:")
        logger.info(f"10% Reduction in Leakage: ${summary['projected_savings']:,.2f} annual savings")
        logger.info(f"ROI Multiplier: {summary['roi_multiplier']}x")
        
        logger.info(f"\nDetailed analysis saved to {output_dir}")
        
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main() 