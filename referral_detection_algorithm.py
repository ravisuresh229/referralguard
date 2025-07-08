import pandas as pd
import numpy as np
import random
import json
import sys
from geopy.distance import geodesic

# Taxonomy codes for PCPs (Internal Medicine, Family Practice)
PCP_TAXONOMY_CODES = ["207Q00000X", "207R00000X"]  # Family Medicine, Internal Medicine
SPECIALIST_TAXONOMY_CODES = [
    "207RC0000X",  # Cardiovascular Disease
    "207RE0101X",  # Endocrinology
    "207RG0100X",  # Gastroenterology
    "207RH0000X",  # Hematology
    "207RI0011X",  # Infectious Disease
    "207RM1200X",  # Medical Oncology
    "207RN0300X",  # Nephrology
    "207RP1001X",  # Pulmonary Disease
    "207RR0500X",  # Rheumatology
    "207NS0135X",  # Neurology
    "207L00000X",  # Dermatology
    "207K00000X",  # Allergy & Immunology
    "207W00000X",  # Emergency Medicine
]

# Helper: get lat/lon from NPPES (if available)
def get_lat_lon(row):
    try:
        lat = float(row.get('Provider Business Practice Location Address Latitude', np.nan))
        lon = float(row.get('Provider Business Practice Location Address Longitude', np.nan))
        if np.isnan(lat) or np.isnan(lon):
            return None
        return (lat, lon)
    except Exception:
        return None

# Load data
nppes = pd.read_csv('data/npidata_pfile_20050523-20250608.csv', nrows=10000, low_memory=False)
billing = pd.read_csv('data/Medicare Physician & Other Practitioners - by Provider and Service/2023/MUP_PHY_R25_P05_V20_D23_Prov_Svc.csv', nrows=10000)

# Merge NPPES info into billing
nppes['NPI'] = nppes['NPI'].astype(str)
billing['Rndrng_NPI'] = billing['Rndrng_NPI'].astype(str)
billing = billing.merge(nppes, left_on='Rndrng_NPI', right_on='NPI', how='left')

# Define specialties
CARDIO_TAXONOMY = ['207RC0000X']
PCP_TAXONOMY = ['207Q00000X', '207R00000X']

# Market Share Analysis (Cardiology example)
cardio = billing[billing['Provider Taxonomy Code_1'].isin(CARDIO_TAXONOMY)]
cardio['zip'] = cardio['Rndrng_Prvdr_Zip5'].astype(str)
zip_market = cardio.groupby('zip').agg(total_cardio=('Tot_Srvcs', 'sum')).reset_index()

# For each hospital/org in each zip, calculate market share
cardio['org'] = cardio['Provider Organization Name (Legal Business Name)'].fillna('Unknown')
org_zip = cardio.groupby(['zip', 'org']).agg(org_cardio=('Tot_Srvcs', 'sum')).reset_index()
org_zip = org_zip.merge(zip_market, on='zip')
org_zip['market_share'] = (org_zip['org_cardio'] / org_zip['total_cardio']).round(2)

# PCPs in each zip
pcps = billing[billing['Provider Taxonomy Code_1'].isin(PCP_TAXONOMY)]
pcps['zip'] = pcps['Rndrng_Prvdr_Zip5'].astype(str)
pcps['org'] = pcps['Provider Organization Name (Legal Business Name)'].fillna('Unknown')

# For each org/zip, estimate expected vs actual specialty referrals
leakage_insights = []
for _, row in org_zip.iterrows():
    org = row['org']
    zipc = row['zip']
    market_share = row['market_share']
    # Find PCPs in this org/zip
    org_pcps = pcps[(pcps['org'] == org) & (pcps['zip'] == zipc)]
    pcp_patients = org_pcps['Tot_Srvcs'].sum()
    # Estimate expected share (if PCPs refer at org's market share)
    expected_cardio = int(row['total_cardio'] * market_share)
    # Actual: sum of all cardiology services for this org's PCPs' patients
    actual_cardio = row['org_cardio']
    if expected_cardio > 0 and actual_cardio < expected_cardio:
        leakage = expected_cardio - actual_cardio
        leakage_insights.append({
            'zip': zipc,
            'org': org,
            'expected_cardio': expected_cardio,
            'actual_cardio': int(actual_cardio),
            'leakage': int(leakage),
            'market_share': float(market_share),
            'insight': f"PCPs in zip {zipc} at {org} generate only {actual_cardio} cardiology visits vs expected {expected_cardio} (leakage: {leakage})"
        })

# Specialty Distribution Analysis
# For each PCP, compare actual specialty referrals to expected (e.g., 15% of patients should see a cardiologist)
expected_ratio = 0.15  # Example: 15% of PCP patients should see a cardiologist
specialty_leakage = []
for _, pcp in pcps.iterrows():
    pcp_name = f"{pcp['Provider Last Name (Legal Name)']}, {pcp['Provider First Name']}"
    pcp_zip = pcp['zip']
    pcp_org = pcp['org']
    pcp_services = pcp['Tot_Srvcs']
    # Find all cardiology in same zip
    zip_cardio = cardio[cardio['zip'] == pcp_zip]
    # Estimate expected
    expected = int(pcp_services * expected_ratio)
    # Actual: sum of all cardiology services in this zip
    actual = zip_cardio['Tot_Srvcs'].sum()
    if expected > 0 and actual < expected:
        specialty_leakage.append({
            'pcp': pcp_name,
            'zip': pcp_zip,
            'expected_cardio': expected,
            'actual_cardio': int(actual),
            'leakage': int(expected - actual),
            'insight': f"{pcp_name} in {pcp_zip} generated only {actual} cardiology visits vs expected {expected} (leakage: {expected-actual})"
        })

# Geographic Analysis: If specialist is >10 miles from PCP, likely out-of-network
geo_leakage = []
for _, pcp in pcps.head(50).iterrows():  # Limit for demo
    pcp_loc = get_lat_lon(pcp)
    if not pcp_loc:
        continue
    # Find specialists in same zip
    zip_specs = cardio[cardio['zip'] == pcp['zip']]
    for _, spec in zip_specs.iterrows():
        spec_loc = get_lat_lon(spec)
        if not spec_loc:
            continue
        dist = geodesic(pcp_loc, spec_loc).miles
        if dist > 10:
            geo_leakage.append({
                'pcp': f"{pcp['Provider Last Name (Legal Name)']}, {pcp['Provider First Name']}",
                'specialist': f"{spec['Provider Last Name (Legal Name)']}, {spec['Provider First Name']}",
                'distance_miles': round(dist, 1),
                'zip': pcp['zip'],
                'insight': f"PCP {pcp['Provider Last Name (Legal Name)']} refers to specialist {spec['Provider Last Name (Legal Name)']} {round(dist,1)} miles away (likely out-of-network)"
            })

# Output actionable insights
output = {
    'market_share_leakage': leakage_insights[:10],
    'specialty_distribution_leakage': specialty_leakage[:10],
    'geographic_leakage': geo_leakage[:10],
    'summary': {
        'example_market_share': leakage_insights[0]['insight'] if leakage_insights else None,
        'example_specialty': specialty_leakage[0]['insight'] if specialty_leakage else None,
        'example_geo': geo_leakage[0]['insight'] if geo_leakage else None,
        'intervention': "Adding 2 cardiologists in West LA could capture $3.2M in leaked revenue (example)"
    }
}

print(json.dumps(output, indent=2))

def main():
    nppes = pd.read_csv('data/npidata_pfile_20050523-20250608.csv', nrows=5000, low_memory=False)
    # Add taxonomy code columns if missing
    if 'Provider Taxonomy Code_1' not in nppes.columns:
        nppes['Provider Taxonomy Code_1'] = np.random.choice(PCP_TAXONOMY_CODES + SPECIALIST_TAXONOMY_CODES, size=len(nppes))
    journeys = simulate_patient_journeys(nppes, num_patients=1000)
    insights = analyze_leakage(journeys)
    print(json.dumps(insights, indent=2))

if __name__ == "__main__":
    main() 