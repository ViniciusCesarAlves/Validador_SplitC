import sys
sys.path.insert(0, '.')
import pandas as pd
import comparator

file_a = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762399_9f880285.csv'
file_b = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762414_cadd41b4.csv'

df_a = comparator.read_tabular_file(file_a, 'media_a.csv')
df_b = comparator.read_tabular_file(file_b, 'media_b.csv')

mapping = comparator.suggest_column_mappings(df_a.columns, df_b.columns)
pk_a = df_a.columns[0]
pk_b = df_b.columns[0]

print(f"pk_a: {repr(pk_a)}, pk_b: {repr(pk_b)}")

summary, diff_records, df_a_idx, df_b_idx, valid_cols_a, final_mapping, only_a, only_b = comparator.compare_datasets(
    df_a, df_b,
    primary_key_a=pk_a,
    primary_key_b=pk_b,
    secondary_keys_a=['IDDOCFISCAL', 'IDCOLABORADOR'],
    column_mapping=mapping,
    normalize_currency=True,
    normalize_dates=True,
    ignore_case=True,
    trim_spaces=True
)

print("\n--- Summary Results ---")
print("matched_keys_count:", summary['matched_keys_count'])
print("total_rows_a:", summary['total_rows_a'])
print("total_rows_b:", summary['total_rows_b'])
print("only_in_a_count:", summary['only_in_a_count'])
print("only_in_b_count:", summary['only_in_b_count'])
print("is_identical:", summary['is_identical'])
print("different_rows_count:", summary['different_rows_count'])

