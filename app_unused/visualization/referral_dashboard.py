"""
ReferralGuard visualization module for generating executive dashboards.
"""

import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import logging
from datetime import datetime
import json
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ReferralDashboard:
    """Generates executive dashboards for referral analytics."""
    
    def __init__(self, network_data: pd.DataFrame):
        """
        Initialize the dashboard generator.
        
        Args:
            network_data: DataFrame containing referral network data
        """
        self.network_data = network_data
        self.colors = {
            'in_network': '#2ecc71',  # Green
            'leaked': '#e74c3c',      # Red
            'background': '#2c3e50',  # Dark blue
            'text': '#ecf0f1'         # Light gray
        }
    
    def create_sankey_diagram(self) -> go.Figure:
        """Create a Sankey diagram showing referral flows."""
        # Prepare data for Sankey diagram
        pcp_nodes = self.network_data['referring_organization'].unique()
        specialist_nodes = self.network_data['referred_organization'].unique()
        
        # Create node labels
        all_nodes = list(pcp_nodes) + list(specialist_nodes)
        node_labels = all_nodes
        
        # Create source and target indices
        source_indices = [all_nodes.index(org) for org in self.network_data['referring_organization']]
        target_indices = [all_nodes.index(org) + len(pcp_nodes) 
                         for org in self.network_data['referred_organization']]
        
        # Create values (referral counts)
        values = self.network_data['referral_count']
        
        # Create colors based on in-network status
        colors = [self.colors['in_network'] if in_net else self.colors['leaked']
                 for in_net in self.network_data['is_in_network']]
        
        # Create Sankey diagram
        fig = go.Figure(data=[go.Sankey(
            node=dict(
                pad=15,
                thickness=20,
                line=dict(color="black", width=0.5),
                label=node_labels,
                color=self.colors['background']
            ),
            link=dict(
                source=source_indices,
                target=target_indices,
                value=values,
                color=colors
            )
        )])
        
        # Update layout
        fig.update_layout(
            title="Referral Flow Network",
            font=dict(size=10, color=self.colors['text']),
            paper_bgcolor=self.colors['background'],
            plot_bgcolor=self.colors['background']
        )
        
        return fig
    
    def create_leakage_by_specialty(self) -> go.Figure:
        """Create a bar chart showing leakage rates by specialty."""
        # Calculate leakage rates by specialty
        specialty_metrics = self.network_data.groupby('specialty').agg({
            'referral_count': 'sum',
            'revenue_loss': 'sum'
        }).reset_index()
        
        # Calculate leakage rate
        specialty_metrics['leakage_rate'] = (
            specialty_metrics['revenue_loss'] / 
            specialty_metrics['referral_count'] * 100
        )
        
        # Sort by leakage rate
        specialty_metrics = specialty_metrics.sort_values('leakage_rate', ascending=False)
        
        # Create bar chart
        fig = px.bar(
            specialty_metrics.head(10),
            x='specialty',
            y='leakage_rate',
            color='revenue_loss',
            title="Top 10 Leaking Specialties",
            labels={
                'specialty': 'Specialty',
                'leakage_rate': 'Leakage Rate (%)',
                'revenue_loss': 'Revenue at Risk ($)'
            }
        )
        
        # Update layout
        fig.update_layout(
            paper_bgcolor=self.colors['background'],
            plot_bgcolor=self.colors['background'],
            font=dict(color=self.colors['text']),
            coloraxis_colorbar=dict(
                title="Revenue at Risk",
                tickformat="$,.0f"
            )
        )
        
        return fig
    
    def create_referral_heatmap(self) -> go.Figure:
        """Create a heatmap of referral patterns."""
        # Create pivot table of referral counts
        heatmap_data = pd.pivot_table(
            self.network_data,
            values='referral_count',
            index='referring_organization',
            columns='referred_organization',
            aggfunc='sum',
            fill_value=0
        )
        
        # Create heatmap
        fig = px.imshow(
            heatmap_data,
            title="Referral Patterns Between Organizations",
            labels=dict(
                x="Referred Organization",
                y="Referring Organization",
                color="Number of Referrals"
            ),
            color_continuous_scale='Viridis'
        )
        
        # Update layout
        fig.update_layout(
            paper_bgcolor=self.colors['background'],
            plot_bgcolor=self.colors['background'],
            font=dict(color=self.colors['text'])
        )
        
        return fig
    
    def create_financial_impact(self) -> go.Figure:
        """Create a financial impact visualization."""
        # Calculate monthly revenue loss
        self.network_data['month'] = pd.to_datetime(self.network_data['referral_date']).dt.to_period('M')
        monthly_loss = self.network_data.groupby('month')['revenue_loss'].sum().reset_index()
        monthly_loss['month'] = monthly_loss['month'].astype(str)
        
        # Create line chart
        fig = px.line(
            monthly_loss,
            x='month',
            y='revenue_loss',
            title="Monthly Revenue Loss from Referral Leakage",
            labels={
                'month': 'Month',
                'revenue_loss': 'Revenue Loss ($)'
            }
        )
        
        # Update layout
        fig.update_layout(
            paper_bgcolor=self.colors['background'],
            plot_bgcolor=self.colors['background'],
            font=dict(color=self.colors['text']),
            yaxis=dict(tickformat="$,.0f")
        )
        
        return fig
    
    def generate_executive_summary(self) -> Dict:
        """Generate an executive summary of the analysis."""
        total_referrals = len(self.network_data)
        leaked_referrals = len(self.network_data[~self.network_data['is_in_network']])
        total_revenue_loss = self.network_data['revenue_loss'].sum()
        
        # Calculate leakage rate
        leakage_rate = (leaked_referrals / total_referrals) * 100
        
        # Find top leaking specialties
        top_leaking = self.network_data[~self.network_data['is_in_network']].groupby('specialty').agg({
            'referral_count': 'sum',
            'revenue_loss': 'sum'
        }).sort_values('revenue_loss', ascending=False).head(3)
        
        # Calculate projected ROI
        current_annual_loss = total_revenue_loss * 12
        projected_savings = current_annual_loss * 0.1  # 10% reduction
        
        summary = {
            'total_referrals': total_referrals,
            'leaked_referrals': leaked_referrals,
            'leakage_rate': leakage_rate,
            'total_revenue_loss': total_revenue_loss,
            'annual_revenue_loss': current_annual_loss,
            'top_leaking_specialties': [
                {
                    'specialty': specialty,
                    'referrals': data['referral_count'],
                    'revenue_loss': data['revenue_loss']
                }
                for specialty, data in top_leaking.iterrows()
            ],
            'projected_savings': projected_savings,
            'roi_multiplier': 34  # Based on your business case
        }
        
        return summary
    
    def save_results(self, output_dir: str) -> None:
        """
        Save all analysis results to files.
        
        Args:
            output_dir: Directory to save results
        """
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save network data
        self.network_data.to_csv(
            output_path / 'referral_network.csv',
            index=False
        )
        
        # Save leakage summary
        leakage_summary = self.network_data[~self.network_data['is_in_network']].groupby('specialty').agg({
            'referral_count': 'sum',
            'revenue_loss': 'sum'
        }).reset_index()
        leakage_summary.to_csv(
            output_path / 'leakage_summary.csv',
            index=False
        )
        
        # Save financial impact
        financial_impact = self.network_data.groupby('referring_organization').agg({
            'referral_count': 'sum',
            'revenue_loss': 'sum'
        }).reset_index()
        financial_impact.to_csv(
            output_path / 'financial_impact.csv',
            index=False
        )
        
        # Save executive summary
        summary = self.generate_executive_summary()
        with open(output_path / 'executive_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"Results saved to {output_path}")

def main():
    """Example usage of the ReferralDashboard."""
    # Load network data
    network_data = pd.read_csv('referral_network.csv')
    
    # Create dashboard
    dashboard = ReferralDashboard(network_data)
    
    # Generate visualizations
    sankey = dashboard.create_sankey_diagram()
    leakage = dashboard.create_leakage_by_specialty()
    heatmap = dashboard.create_referral_heatmap()
    financial = dashboard.create_financial_impact()
    
    # Save visualizations
    sankey.write_html('referral_flow.html')
    leakage.write_html('leakage_by_specialty.html')
    heatmap.write_html('referral_patterns.html')
    financial.write_html('financial_impact.html')
    
    # Generate and save summary
    dashboard.save_results('analysis_results')

if __name__ == "__main__":
    main() 