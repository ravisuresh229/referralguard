import pandas as pd
import numpy as np
import json
import os
from geopy.distance import geodesic
from config import config
from utils.file_handler import file_handler

# File paths
NPI_CSV = 'data/npidata_pfile_20050523-20250608.csv'
PHYSICIAN_CSV = 'DAC_NationalDownloadableFile (1).csv'
MEDICARE_CSV = 'data/Medicare Physician & Other Practitioners - by Provider and Service/2023/MUP_PHY_R25_P05_V20_D23_Prov_Svc.csv'
ENDPOINT_CSV = 'data/endpoint_pfile_20050523-20250608.csv'

print('=== SMART MEDICARE MARKET ANALYSIS ===')
print('Loading NPI data...')
nppes = pd.read_csv(NPI_CSV, nrows=200000, low_memory=False)
print('Loading Physician Compare data...')
physician = pd.read_csv(PHYSICIAN_CSV, nrows=100000, low_memory=False)
print('Loading Medicare utilization data...')
billing = pd.read_csv(MEDICARE_CSV, nrows=200000, low_memory=False)
print('Loading provider endpoint/affiliation data...')
endpoints = pd.read_csv(ENDPOINT_CSV, nrows=100000, low_memory=False)

# Build provider name map
provider_names = {}
for _, row in nppes.iterrows():
    npi = str(row['NPI'])
    last = str(row.get('Provider Last Name (Legal Name)', ''))
    first = str(row.get('Provider First Name', ''))
    provider_names[npi] = f"{last}, {first}".strip(', ')

# Build organization map
organizations = {}
for _, row in physician.iterrows():
    npi = str(row['NPI'])
    org = str(row.get('Facility Name', '')) if pd.notna(row.get('Facility Name', '')) else None
    organizations[npi] = org

print('\n=== STEP 1: ANALYZING PROVIDER AFFILIATIONS ===')
print('Finding provider network patterns...')

# Analyze provider affiliations from endpoint data
affiliation_analysis = []
affiliation_groups = endpoints.groupby('Affiliation Legal Business Name').agg({
    'NPI': 'nunique',
    'Endpoint': 'nunique'
}).reset_index()

affiliation_groups = affiliation_groups.sort_values('NPI', ascending=False)
print(f"Found {len(affiliation_groups)} provider organizations")

# Top provider networks
top_networks = affiliation_groups.head(20).to_dict(orient='records')
for i, network in enumerate(top_networks[:5]):
    print(f"  {i+1}. {network['Affiliation Legal Business Name']}: {network['NPI']} providers, {network['Endpoint']} endpoints")

print('\n=== STEP 2: MARKET SHARE ANALYSIS ===')
print('Analyzing market concentration by zip code and specialty...')

# Merge NPPES info into billing for provider names and locations
nppes['NPI'] = nppes['NPI'].astype(str)
billing['Rndrng_NPI'] = billing['Rndrng_NPI'].astype(str)
billing = billing.merge(nppes, left_on='Rndrng_NPI', right_on='NPI', how='left')

# Compute total charges per row
billing['Total_Charges'] = billing['Tot_Srvcs'] * billing['Avg_Sbmtd_Chrg']

# Market share analysis by zip code and specialty
market_analysis = []

# Group by zip code and specialty
if 'Rndrng_Prvdr_Zip5' in billing.columns:
    zip_col = 'Rndrng_Prvdr_Zip5'
elif 'Provider Business Practice Location Address Postal Code' in billing.columns:
    zip_col = 'Provider Business Practice Location Address Postal Code'
else:
    zip_col = None

if zip_col and 'Rndrng_Prvdr_Type' in billing.columns:
    # Clean zip codes
    billing[zip_col] = billing[zip_col].astype(str).str[:5]
    
    # Group by zip and specialty
    market_groups = billing.groupby([zip_col, 'Rndrng_Prvdr_Type']).agg({
        'Total_Charges': 'sum',
        'Rndrng_NPI': 'nunique',
        'Tot_Srvcs': 'sum'
    }).reset_index()
    
    # Calculate market share within each zip-specialty group
    for zip_code in market_groups[zip_col].unique():
        zip_data = market_groups[market_groups[zip_col] == zip_code]
        
        for _, row in zip_data.iterrows():
            specialty = row['Rndrng_Prvdr_Type']
            total_revenue = row['Total_Charges']
            provider_count = row['Rndrng_NPI']
            total_services = row['Tot_Srvcs']
            
            # Find top provider in this zip-specialty
            zip_specialty_data = billing[
                (billing[zip_col] == zip_code) & 
                (billing['Rndrng_Prvdr_Type'] == specialty)
            ]
            
            if not zip_specialty_data.empty:
                top_provider = zip_specialty_data.groupby('Rndrng_NPI').agg({
                    'Total_Charges': 'sum',
                    'Tot_Srvcs': 'sum'
                }).sort_values('Total_Charges', ascending=False).iloc[0]
                
                top_provider_npi = top_provider.name
                top_provider_name = provider_names.get(str(top_provider_npi), 'Unknown')
                top_provider_revenue = top_provider['Total_Charges']
                top_provider_services = top_provider['Tot_Srvcs']
                market_share = (top_provider_revenue / total_revenue) * 100
                
                market_analysis.append({
                    'zipCode': zip_code,
                    'specialty': specialty,
                    'topProvider': top_provider_name,
                    'topProviderNPI': str(top_provider_npi),
                    'totalRevenue': total_revenue,
                    'topProviderRevenue': top_provider_revenue,
                    'marketShare': market_share,
                    'providerCount': provider_count,
                    'totalServices': total_services,
                    'topProviderServices': top_provider_services
                })

# Sort by market share to find concentration opportunities
market_analysis.sort(key=lambda x: x['marketShare'], reverse=True)

print(f"Analyzed {len(market_analysis)} zip-specialty markets")

print('\n=== STEP 3: REVENUE LEAKAGE OPPORTUNITIES ===')
print('Identifying potential referral leakage based on market concentration...')

# Find markets with high concentration (potential for referral leakage)
high_concentration_markets = [m for m in market_analysis if m['marketShare'] > 50]
low_concentration_markets = [m for m in market_analysis if m['marketShare'] < 20 and m['providerCount'] > 3]

leakage_opportunities = []

# High concentration = risk of losing referrals to competitors
for market in high_concentration_markets[:10]:
    leakage_opportunities.append({
        'type': 'High Concentration Risk',
        'zipCode': market['zipCode'],
        'specialty': market['specialty'],
        'description': f"{market['topProvider']} dominates {market['specialty']} in {market['zipCode']} with {market['marketShare']:.1f}% market share",
        'risk': 'Competitors may target this market',
        'revenue': market['totalRevenue'],
        'marketShare': market['marketShare']
    })

# Low concentration = opportunity to capture market share
for market in low_concentration_markets[:10]:
    leakage_opportunities.append({
        'type': 'Market Share Opportunity',
        'zipCode': market['zipCode'],
        'specialty': market['specialty'],
        'description': f"Fragmented {market['specialty']} market in {market['zipCode']} - {market['providerCount']} providers, top has only {market['marketShare']:.1f}% share",
        'opportunity': 'Room for market consolidation',
        'revenue': market['totalRevenue'],
        'providerCount': market['providerCount']
    })

print('\n=== STEP 4: PROVIDER NETWORK INSIGHTS ===')
print('Analyzing provider network patterns...')

# Find providers with multiple affiliations (potential referral sources)
multi_affiliation_providers = endpoints.groupby('NPI').agg({
    'Affiliation Legal Business Name': 'nunique',
    'Endpoint': 'nunique'
}).reset_index()

multi_affiliation_providers = multi_affiliation_providers[
    multi_affiliation_providers['Affiliation Legal Business Name'] > 1
].sort_values('Affiliation Legal Business Name', ascending=False)

network_insights = []
for _, row in multi_affiliation_providers.head(20).iterrows():
    npi = str(row['NPI'])
    provider_name = provider_names.get(npi, 'Unknown')
    affiliations = row['Affiliation Legal Business Name']
    endpoints_count = row['Endpoint']
    
    network_insights.append({
        'providerName': provider_name,
        'providerNPI': npi,
        'affiliationCount': int(affiliations),
        'endpointCount': int(endpoints_count),
        'description': f"{provider_name} has {affiliations} affiliations across {endpoints_count} endpoints"
    })

print('\n=== STEP 5: GENERATING INSIGHTS ===')

# Calculate summary metrics
total_markets = len(market_analysis)
high_concentration_count = len(high_concentration_markets)
low_concentration_count = len(low_concentration_markets)
total_revenue_analyzed = sum(m['totalRevenue'] for m in market_analysis)
avg_market_share = np.mean([m['marketShare'] for m in market_analysis]) if market_analysis else 0

print(f"📊 Analyzed {total_markets:,} zip-specialty markets")
print(f"💰 Total revenue analyzed: ${total_revenue_analyzed:,.0f}")
print(f"🏥 Found {high_concentration_count} high-concentration markets (risk)")
print(f"🎯 Found {low_concentration_count} fragmented markets (opportunity)")
print(f"📈 Average market share: {avg_market_share:.1f}%")

if top_networks:
    print(f"\n🏢 Top provider networks:")
    for i, network in enumerate(top_networks[:5]):
        print(f"  {i+1}. {network['Affiliation Legal Business Name']}: {network['NPI']} providers")

if leakage_opportunities:
    print(f"\n🚨 Top leakage opportunities:")
    for i, opp in enumerate(leakage_opportunities[:5]):
        print(f"  {i+1}. {opp['description']}")

# Save insights using the file handler
insights = {
    'summary': {
        'totalMarketsAnalyzed': total_markets,
        'highConcentrationMarkets': high_concentration_count,
        'fragmentedMarkets': low_concentration_count,
        'totalRevenueAnalyzed': total_revenue_analyzed,
        'averageMarketShare': avg_market_share,
        'providerNetworksCount': len(affiliation_groups),
        'multiAffiliationProviders': len(multi_affiliation_providers)
    },
    'marketAnalysis': market_analysis[:50],
    'leakageOpportunities': leakage_opportunities,
    'providerNetworks': top_networks,
    'networkInsights': network_insights
}

# Use the file handler to save to the configured outputs directory
insights_path = config.get_insights_path()
if file_handler.write_json(insights, insights_path):
    print(f'\n✅ Saved insights to {insights_path} with {total_markets:,} market insights and {len(leakage_opportunities)} leakage opportunities!')
else:
    print(f'\n❌ Failed to save insights to {insights_path}') 