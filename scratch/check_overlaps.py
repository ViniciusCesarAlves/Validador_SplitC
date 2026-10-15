import sys
sys.path.insert(0, '.')
import comparator
import pandas as pd

file_a = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762399_9f880285.csv'
file_b = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762414_cadd41b4.csv'

df_a = comparator.read_tabular_file(file_a, 'media_a.csv')
df_b = comparator.read_tabular_file(file_b, 'media_b.csv')
df_a.columns = [c.replace('\ufeff', '') for c in df_a.columns]
df_b.columns = [c.replace('\ufeff', '') for c in df_b.columns]

print("=== BASE A ===")
print("Dates in A:", df_a['DTEMISSAO'].unique()[:5])
print("Months in A:", df_a['mes'].unique())
print("Total rows A:", len(df_a))

print("\n=== BASE B ===")
print("Dates in B:", df_b['DTEMISSAO'].unique()[:5])
print("Months in B:", df_b['mes'].unique())
print("Total rows B:", len(df_b))

# Are there any common IDDOCFISCAL?
print("Common IDDOCFISCAL:", len(set(df_a['IDDOCFISCAL']) & set(df_b['IDDOCFISCAL'])))

# What columns do match?
common_cols = set(df_a.columns) & set(df_b.columns)
print(f"\nChecking column value overlaps across all {len(common_cols)} columns:")
for col in sorted(list(common_cols)):
    sa = set(df_a[col].dropna().astype(str))
    sb = set(df_b[col].dropna().astype(str))
    overlap = len(sa & sb)
    if overlap > 0:
        print(f"  Col '{col}': {overlap} common unique values (in A: {len(sa)}, in B: {len(sb)})")

