import os
import json

# Load the original data
with open('outputs/real_insights.json', 'r') as f:
    data = json.load(f)

# Filter for real providers only
real_providers = [
    p for p in data['marketAnalysis']
    if p.get('providerName') and p['providerName'].lower() not in ['unknown provider', 'nan, nan', 'nan']
]

# Sort by providerRevenue descending and take top 15
real_providers = sorted(real_providers, key=lambda x: x.get('providerRevenue', 0), reverse=True)[:15]

# Overwrite the data to only include these 15
new_data = {
    "summary": data.get("summary", {}),
    "marketAnalysis": real_providers
}

# Write to the public directory (absolute path)
public_dir = os.path.join(os.path.dirname(__file__), 'referralguard-dashboard', 'public')
os.makedirs(public_dir, exist_ok=True)
outfile = os.path.join(public_dir, 'real_insights.json')
with open(outfile, 'w') as f:
    json.dump(new_data, f, indent=2)

print(f"Wrote {len(real_providers)} real providers to {outfile}") 