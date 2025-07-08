import json
import csv
import os

INSIGHTS_PATH = 'outputs/real_insights.json'
NPI_MAP_PATH = 'data/npi_name_map.json'
REPORT_PATH = 'outputs/missing_provider_names_report.csv'

# Load insights
with open(INSIGHTS_PATH, 'r') as f:
    insights = json.load(f)

# Load NPI name map
with open(NPI_MAP_PATH, 'r') as f:
    npi_map = json.load(f)

missing = []
for rec in insights.get('marketAnalysis', []):
    npi = rec.get('providerNPI')
    specialty = rec.get('specialty', '')
    zip_code = rec.get('zipCode', '')
    provider_name = rec.get('providerName', '')
    revenue = rec.get('providerRevenue', 0)
    if not npi or npi not in npi_map:
        missing.append({
            'providerNPI': npi or '',
            'providerName': provider_name,
            'specialty': specialty,
            'zipCode': zip_code,
            'providerRevenue': revenue
        })

with open(REPORT_PATH, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['providerNPI', 'providerName', 'specialty', 'zipCode', 'providerRevenue'])
    writer.writeheader()
    for row in missing:
        writer.writerow(row)

print(f"Found {len(missing)} providers with missing or unmatched NPIs. Report written to {REPORT_PATH}") 