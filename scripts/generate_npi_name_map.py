import csv
import json

NPI_CSV = 'data/npidata_pfile_20050523-20250608.csv'
OUTPUT_JSON = 'data/npi_name_map.json'

# These are the relevant columns from the header
NPI_COL = 'NPI'
ENTITY_TYPE_COL = 'Entity Type Code'
ORG_NAME_COL = 'Provider Organization Name (Legal Business Name)'
LAST_NAME_COL = 'Provider Last Name (Legal Name)'
FIRST_NAME_COL = 'Provider First Name'

# Read the header to get column indices
with open('data/npidata_pfile_20050523-20250608_fileheader.csv', 'r') as f:
    header = next(csv.reader(f))

col_idx = {col: i for i, col in enumerate(header)}

npi_map = {}

with open(NPI_CSV, 'r') as f:
    reader = csv.reader(f)
    for row in reader:
        npi = row[col_idx[NPI_COL]]
        entity_type = row[col_idx[ENTITY_TYPE_COL]]
        org_name = row[col_idx[ORG_NAME_COL]].strip()
        last_name = row[col_idx[LAST_NAME_COL]].strip()
        first_name = row[col_idx[FIRST_NAME_COL]].strip()

        if entity_type == '2' and org_name:
            # Organization
            name = org_name
        elif entity_type == '1' and (first_name or last_name):
            # Individual
            name = f"{first_name} {last_name}".strip()
        else:
            name = ''

        if npi and name:
            npi_map[npi] = name

with open(OUTPUT_JSON, 'w') as f:
    json.dump(npi_map, f)

print(f"Wrote {len(npi_map)} NPI name mappings to {OUTPUT_JSON}") 