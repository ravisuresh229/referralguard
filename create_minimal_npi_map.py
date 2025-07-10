#!/usr/bin/env python3
"""
Create a minimal NPI name map containing only providers used in the dashboard
"""

import json
import os

def create_minimal_npi_map():
    # Load the dashboard data to see which NPIs we actually use
    insights_path = "outputs/real_insights.json"
    full_npi_map_path = "data/npi_name_map.json"
    output_path = "referralguard-dashboard/public/npi_name_map.json"
    
    print("Loading real_insights.json...")
    with open(insights_path, 'r') as f:
        insights = json.load(f)
    
    # Extract all NPIs used in the dashboard
    used_npis = set()
    
    # Get NPIs from marketAnalysis (this is where the provider data is)
    if 'marketAnalysis' in insights:
        for market in insights['marketAnalysis']:
            if 'providerNPI' in market:
                used_npis.add(str(market['providerNPI']))
    
    # Also check for any other sections that might have provider data
    for key, value in insights.items():
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    # Check for various possible NPI field names
                    for npi_field in ['npi', 'providerNPI', 'NPI']:
                        if npi_field in item:
                            used_npis.add(str(item[npi_field]))
    
    print(f"Found {len(used_npis)} unique NPIs in dashboard data")
    
    # Load the full NPI map
    print("Loading full NPI name map...")
    with open(full_npi_map_path, 'r') as f:
        full_npi_map = json.load(f)
    
    # Create minimal map with only the NPIs we use
    minimal_map = {}
    found_count = 0
    
    for npi in used_npis:
        if npi in full_npi_map:
            minimal_map[npi] = full_npi_map[npi]
            found_count += 1
        else:
            print(f"Warning: NPI {npi} not found in full map")
    
    print(f"Created minimal map with {found_count}/{len(used_npis)} NPIs")
    
    # Save minimal map
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(minimal_map, f, indent=2)
    
    # Check file size
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Minimal NPI map saved to {output_path}")
    print(f"File size: {size_mb:.2f} MB")
    
    if size_mb > 50:
        print("⚠️  File is still large - consider further optimization")
    else:
        print("✅ File size is good for GitHub/Vercel")

if __name__ == "__main__":
    create_minimal_npi_map() 