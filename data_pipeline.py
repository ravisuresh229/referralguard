"""
ReferralGuard Data Pipeline

This script serves as the main data processing pipeline for the ReferralGuard application.
It performs the following steps:
1.  Loads raw provider and Medicare data from CSV files.
2.  Cleans and preprocesses the data.
3.  Analyzes provider affiliations to identify major healthcare networks.
4.  Calculates market share and concentration for each zip code and specialty.
5.  Identifies potential revenue leakage risks and growth opportunities.
6.  Saves the final, structured analysis to 'real_insights.json'.

This script is designed to be modular and re-runnable. When new data is available,
simply place the updated CSV files in the 'data' directory and run this script
to refresh the insights for the dashboard.
"""

import pandas as pd
import numpy as np
import json
import os
from sklearn.preprocessing import LabelEncoder
# TODO: import NetworkX, geopy, and other libraries as needed

# --- Constants for File Paths ---
# Ensures all file locations are defined in one place for easy configuration.
DATA_DIR = 'data'
NPI_FILE = os.path.join(DATA_DIR, 'npidata_pfile_20050523-20250608.csv')
PHYSICIAN_COMPARE_FILE = os.path.join(DATA_DIR, 'DAC_NationalDownloadableFile (1).csv')
MEDICARE_UTILIZATION_FILE = os.path.join(DATA_DIR, 'Medicare Physician & Other Practitioners - by Provider and Service/2023/MUP_PHY_R25_P05_V20_D23_Prov_Svc.csv')
ENDPOINT_FILE = os.path.join(DATA_DIR, 'endpoint_pfile_20050523-20250608.csv')
OUTPUT_INSIGHTS_FILE = 'outputs/real_insights.json'
OUTPUT_FEATURES_FILE = 'outputs/provider_features.json'


def load_datasets(npi_rows=1500000, physician_rows=200000, medicare_rows=500000, endpoint_rows=200000):
    """
    Loads all necessary datasets. Increased row counts for richer feature engineering.
    """
    print("--- Starting Data Loading Stage ---")
    
    print(f"Loading NPI data (up to {npi_rows:,} rows)...")
    nppes_df = pd.read_csv(NPI_FILE, nrows=npi_rows, low_memory=False, on_bad_lines='skip')
    
    print(f"Loading Physician Compare data (up to {physician_rows:,} rows)...")
    physician_df = pd.read_csv(PHYSICIAN_COMPARE_FILE, nrows=physician_rows, low_memory=False, on_bad_lines='skip')
    
    print(f"Loading Medicare utilization data (up to {medicare_rows:,} rows)...")
    billing_df = pd.read_csv(MEDICARE_UTILIZATION_FILE, nrows=medicare_rows, low_memory=False, on_bad_lines='skip')
    
    print(f"Loading provider endpoint/affiliation data (up to {endpoint_rows:,} rows)...")
    endpoints_df = pd.read_csv(ENDPOINT_FILE, nrows=endpoint_rows, low_memory=False, on_bad_lines='skip')
    
    print("--- Data Loading Complete ---\n")
    return nppes_df, physician_df, billing_df, endpoints_df


def build_provider_name_map(nppes_df):
    """
    Creates a dictionary mapping a provider's NPI to their full name.

    Args:
        nppes_df (pd.DataFrame): The NPPES DataFrame containing NPI and name information.

    Returns:
        dict: A dictionary where keys are NPIs and values are formatted names.
    """
    print("Building provider NPI-to-Name map...")
    provider_names = {}
    for _, row in nppes_df.iterrows():
        npi = str(row['NPI'])
        last_name = str(row.get('Provider Last Name (Legal Name)', ''))
        first_name = str(row.get('Provider First Name', ''))
        provider_names[npi] = f"{last_name}, {first_name}".strip(', ')
    return provider_names


def analyze_provider_affiliations(endpoints_df):
    """
    Analyzes the endpoint data to identify and rank provider networks.

    Args:
        endpoints_df (pd.DataFrame): The DataFrame with provider affiliation data.

    Returns:
        pd.DataFrame: A DataFrame of provider networks, sorted by the number of affiliated providers.
    """
    print("--- Starting Provider Affiliation Analysis ---")
    
    affiliation_groups = endpoints_df.groupby('Affiliation Legal Business Name').agg(
        NPI_count=('NPI', 'nunique'),
        Endpoint_count=('Endpoint', 'nunique')
    ).reset_index()
    
    affiliation_groups = affiliation_groups.sort_values('NPI_count', ascending=False)
    
    print(f"Identified {len(affiliation_groups)} provider organizations.")
    print("--- Affiliation Analysis Complete ---\n")
    
    return affiliation_groups


def calculate_market_analysis(billing_df, provider_name_map):
    """
    Performs market share analysis on the Medicare billing data.
    Now outputs all providers and their market shares for each zip/specialty market.
    """
    print("--- Starting Market Share Analysis ---")
    
    billing_df['Rndrng_NPI'] = billing_df['Rndrng_NPI'].astype(str)
    billing_df['Total_Charges'] = billing_df['Tot_Srvcs'] * billing_df['Avg_Sbmtd_Chrg']
    zip_col = 'Rndrng_Prvdr_Zip5'
    specialty_col = 'Rndrng_Prvdr_Type'
    billing_df[zip_col] = billing_df[zip_col].astype(str).str.zfill(5).str[:5]
    
    print("Grouping data by zip code and specialty...")
    market_groups = billing_df.groupby([zip_col, specialty_col])
    market_analysis_results = []
    competitive_market_samples = []
    
    print(f"Analyzing {len(market_groups)} markets...")
    for (zip_code, specialty), group in market_groups:
        total_market_revenue = group['Total_Charges'].sum()
        provider_revenue = group.groupby('Rndrng_NPI')['Total_Charges'].sum()
        provider_services = group.groupby('Rndrng_NPI')['Tot_Srvcs'].sum()
        provider_count = provider_revenue.shape[0]
        market_providers = []
        for npi, revenue in provider_revenue.items():
            name = provider_name_map.get(npi, 'Unknown Provider')
            services = provider_services.get(npi, 0)
            market_share = (revenue / total_market_revenue) * 100 if total_market_revenue > 0 else 0
            market_providers.append({
                'zipCode': zip_code,
                'specialty': specialty,
                'providerName': name,
                'providerNPI': npi,
                'providerRevenue': revenue,
                'providerServices': services,
                'marketSharePercentage': market_share,
                'providerCount': provider_count,
                'totalMarketRevenue': total_market_revenue
            })
        # Add to results
        market_analysis_results.extend(market_providers)
        # Save a sample of competitive markets
        if provider_count > 1 and len(competitive_market_samples) < 5:
            competitive_market_samples.append(market_providers)
    # Logging: print a few competitive markets
    print("--- Sample competitive markets (multiple providers): ---")
    for market in competitive_market_samples:
        print(f"Zip: {market[0]['zipCode']}, Specialty: {market[0]['specialty']}, Providers: {len(market)}")
        for p in market:
            print(f"  {p['providerName']} (NPI: {p['providerNPI']}): {p['marketSharePercentage']:.1f}% share, Revenue: ${p['providerRevenue']:.2f}")
    print("--- Market Share Analysis Complete ---\n")
    return market_analysis_results


def identify_leakage_opportunities(market_analysis):
    """
    Identifies revenue leakage risks and opportunities from market analysis results.

    Args:
        market_analysis (list): A list of market analysis dictionaries.

    Returns:
        list: A list of dictionaries, each describing a specific leakage opportunity.
    """
    print("--- Identifying Leakage Opportunities ---")
    leakage_opportunities = []

    # High concentration markets are a risk (competitors can poach from the single dominant provider)
    high_concentration_markets = [m for m in market_analysis if m['marketSharePercentage'] > 80]
    for market in high_concentration_markets[:15]: # Top 15 risks
        leakage_opportunities.append({
            'type': 'High Concentration Risk',
            'zipCode': market['zipCode'],
            'specialty': market['specialty'],
            'description': f"{market['providerName']} has a {market['marketSharePercentage']:.1f}% market share in {market['specialty']} in zip {market['zipCode']}.",
            'revenue': market['totalMarketRevenue'],
        })

    # Low concentration (fragmented) markets are an opportunity for growth
    low_concentration_markets = [m for m in market_analysis if m['marketSharePercentage'] < 25 and m['providerCount'] > 5]
    for market in low_concentration_markets[:15]: # Top 15 opportunities
        leakage_opportunities.append({
            'type': 'Market Share Opportunity',
            'zipCode': market['zipCode'],
            'specialty': market['specialty'],
            'description': f"Fragmented market: {market['specialty']} in zip {market['zipCode']} has {market['providerCount']} providers, with the top provider holding only {market['marketSharePercentage']:.1f}% share.",
            'revenue': market['totalMarketRevenue'],
        })
        
    print(f"Identified {len(leakage_opportunities)} key opportunities and risks.")
    print("--- Leakage Opportunity Analysis Complete ---\n")
    return leakage_opportunities


def generate_insights_json(market_analysis, provider_networks, leakage_opportunities, output_file):
    """
    Assembles all analysis results into a final JSON structure and saves it to a file.
    """
    print("--- Generating Final Insights JSON ---")
    
    # Calculate summary statistics for the dashboard
    total_revenue_analyzed = sum(m['totalMarketRevenue'] for m in market_analysis)
    avg_market_share = np.mean([m['marketSharePercentage'] for m in market_analysis]) if market_analysis else 0
    
    # Handle provider_networks as list (from updated market analysis)
    if isinstance(provider_networks, list):
        provider_networks_data = provider_networks[:20]  # Top 20 networks
    else:
        # Fallback for DataFrame format
        provider_networks_data = provider_networks.head(20).to_dict(orient='records')
    
    insights = {
        'summary': {
            'totalMarketsAnalyzed': len(market_analysis),
            'highConcentrationMarkets': len([m for m in market_analysis if m['marketSharePercentage'] > 80]),
            'fragmentedMarkets': len([m for m in market_analysis if m['marketSharePercentage'] < 25 and m['providerCount'] > 5]),
            'totalRevenueAnalyzed': total_revenue_analyzed,
            'averageMarketShare': avg_market_share,
            'providerNetworksCount': len(provider_networks_data)
        },
        'marketAnalysis': market_analysis[:100],  # Top 100 concentrated markets
        'leakageOpportunities': leakage_opportunities,
        'providerNetworks': provider_networks_data
    }

    # Save the insights to the output file
    save_json_file(insights, output_file)


def create_provider_features(billing_df, nppes_df):
    """
    Engineers a rich feature set for each provider to be used in ML modeling.
    """
    print("--- Starting Advanced Feature Engineering ---")

    # 1. Core Provider Metrics
    provider_agg = billing_df.groupby('Rndrng_NPI').agg(
        total_revenue=('Total_Charges', 'sum'),
        total_services=('Tot_Srvcs', 'sum'),
        unique_patients=('Tot_Benes', 'sum'),
        unique_hcpc_codes=('HCPCS_Cd', 'nunique'),
        avg_charge_per_service=('Avg_Sbmtd_Chrg', 'mean'),
        std_dev_charge=('Avg_Sbmtd_Chrg', 'std'),
    ).reset_index()

    # 2. Temporal Features (Simulated)
    # In a real scenario, you'd use data from different time periods.
    # Here, we simulate trends using random multipliers.
    provider_agg['revenue_trend_3m'] = provider_agg['total_revenue'] * np.random.uniform(0.8, 1.2, size=len(provider_agg))
    provider_agg['revenue_trend_6m'] = provider_agg['total_revenue'] * np.random.uniform(0.7, 1.3, size=len(provider_agg))
    provider_agg['revenue_trend_12m'] = provider_agg['total_revenue'] * np.random.uniform(0.6, 1.4, size=len(provider_agg))
    
    # 3. Geographic and Specialty Features from NPPES
    provider_details = nppes_df[['NPI', 'Provider Business Practice Location Address Postal Code', 'Healthcare Provider Taxonomy Code_1']]
    provider_details = provider_details.rename(columns={
        'NPI': 'Rndrng_NPI',
        'Provider Business Practice Location Address Postal Code': 'zip_code',
        'Healthcare Provider Taxonomy Code_1': 'specialty_code'
    })
    
    # Ensure NPIs are of the same type for merging
    provider_agg['Rndrng_NPI'] = provider_agg['Rndrng_NPI'].astype(str)
    provider_details['Rndrng_NPI'] = provider_details['Rndrng_NPI'].astype(str)
    
    features_df = pd.merge(provider_agg, provider_details, on='Rndrng_NPI', how='left')
    features_df['zip_code'] = features_df['zip_code'].str.slice(0, 5)

    # 4. Market Concentration (Herfindahl-Hirschman Index)
    market_revenue = billing_df.groupby(['Rndrng_Prvdr_Zip5', 'Rndrng_Prvdr_Type'])['Total_Charges'].sum().reset_index()
    market_revenue = market_revenue.rename(columns={'Total_Charges': 'market_total_revenue', 'Rndrng_Prvdr_Zip5': 'zip_code', 'Rndrng_Prvdr_Type': 'specialty_code'})
    
    provider_market_revenue = billing_df.groupby(['Rndrng_NPI', 'Rndrng_Prvdr_Zip5', 'Rndrng_Prvdr_Type'])['Total_Charges'].sum().reset_index()
    provider_market_revenue = provider_market_revenue.rename(columns={'Rndrng_Prvdr_Zip5': 'zip_code', 'Rndrng_Prvdr_Type': 'specialty_code', 'Rndrng_NPI': 'Rndrng_NPI_str'})
    
    # This part is complex, will simplify for now.
    print("Skipping complex HHI calculation for this version.")
    features_df['market_concentration'] = np.random.rand(len(features_df)) # Placeholder

    # 5. Categorical Encoding
    for col in ['zip_code', 'specialty_code']:
        le = LabelEncoder()
        features_df[f'{col}_encoded'] = le.fit_transform(features_df[col].astype(str))

    # Placeholder for other advanced features
    features_df['geographic_distance'] = np.random.uniform(1, 100, size=len(features_df))
    features_df['specialty_alignment_score'] = np.random.rand(len(features_df))
    features_df['historical_leakage_rate'] = np.random.beta(a=2, b=5, size=len(features_df))
    
    print(f"Successfully engineered {len(features_df.columns)} features for {len(features_df)} providers.")
    print("--- Advanced Feature Engineering Complete ---\n")
    return features_df.fillna(0)


def save_json_file(data, file_path):
    """
    Saves data to a JSON file, creating directories if they don't exist.
    """
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"Successfully saved data to {file_path}")


def engineer_features(referral_df, provider_df, claims_df):
    features = pd.DataFrame()
    # TODO: Build referral network graph and compute centrality, clustering, etc.
    # TODO: Extract temporal patterns (seasonality, trend, sudden changes)
    # TODO: Compute geographic features (distance decay, regional preferences)
    # TODO: Build specialty interaction matrices
    # TODO: Calculate provider reputation scores from quality metrics
    # TODO: Analyze insurance mix and payer patterns
    # Example placeholder:
    features['dummy_feature'] = np.random.rand(len(referral_df))
    return features


def main():
    """
    Main function to orchestrate the entire data pipeline.
    """
    # 1. Load Data
    nppes_df, physician_df, billing_df, endpoints_df = load_datasets()
    
    # 2. Process and Clean Data
    provider_name_map = build_provider_name_map(nppes_df)
    
    # 3. Run Analyses
    market_analysis = calculate_market_analysis(billing_df, provider_name_map)
    provider_networks = analyze_provider_affiliations(endpoints_df)
    leakage_opportunities = identify_leakage_opportunities(market_analysis)
    
    # 4. Generate and Save Final Output
    generate_insights_json(
        market_analysis,
        provider_networks.to_dict(orient='records'),
        leakage_opportunities,
        OUTPUT_INSIGHTS_FILE
    )
    
    # --- Engineer and Save Advanced ML Features ---
    # Re-calculate total charges on the full dataset if needed
    if 'Total_Charges' not in billing_df.columns:
        billing_df['Total_Charges'] = billing_df['Tot_Srvcs'] * billing_df['Avg_Sbmtd_Chrg']
        
    provider_features_df = create_provider_features(billing_df, nppes_df)
    
    # Save the features to a file for the ML model to use
    save_json_file(provider_features_df.to_dict(orient='records'), OUTPUT_FEATURES_FILE)


if __name__ == "__main__":
    main() 