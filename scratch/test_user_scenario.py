import sys
sys.path.insert(0, '.')
import comparator
import pandas as pd

file_a = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762399_9f880285.csv'
file_b = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762414_cadd41b4.csv'

print("Lendo arquivos do usuário...")
df_a = comparator.read_tabular_file(file_a, 'base_a.csv')
df_b = comparator.read_tabular_file(file_b, 'base_b.csv')

# 1. Valida que o BOM foi removido
assert 'NRDOCFISCAL' in df_a.columns, f"BOM nao removido de A: {df_a.columns[0]}"
assert 'NRDOCFISCAL' in df_b.columns, f"BOM nao removido de B: {df_b.columns[0]}"
print("[OK] BOM (\ufeff) removido com sucesso de ambas as bases!")

# 2. Testa o cenário do usuário (NRDOCFISCAL + IDDOCFISCAL + IDCOLABORADOR)
mapping = comparator.suggest_column_mappings(df_a.columns, df_b.columns)
summary, diff_records, df_a_idx, df_b_idx, valid_cols_a, final_mapping, only_a, only_b = comparator.compare_datasets(
    df_a, df_b,
    primary_key_a='NRDOCFISCAL',
    primary_key_b='NRDOCFISCAL',
    secondary_keys_a=['IDDOCFISCAL', 'IDCOLABORADOR'],
    column_mapping=mapping
)

assert summary['matched_keys_count'] == 0
assert summary['only_in_a_count'] == 258
assert summary['only_in_b_count'] == 258
assert len(summary['sample_only_in_a']) > 0
assert len(summary['sample_only_in_b']) > 0
print(f"[OK] Cenário do usuário validado:")
print(f"  Chaves em comum: {summary['matched_keys_count']}")
print(f"  Apenas na Base Antiga: {summary['only_in_a_count']} chaves ({len(df_a)} linhas)")
print(f"  Apenas na Base Nova: {summary['only_in_b_count']} chaves ({len(df_b)} linhas)")
print(f"  Amostra Base Antiga gerada: {len(summary['sample_only_in_a'])} registros com linha e valores")
print(f"  Amostra Base Nova gerada: {len(summary['sample_only_in_b'])} registros com linha e valores")

# 3. Testa cenário alternativo comparando apenas por NRDOCFISCAL
summary_nr, diff_nr, _, _, _, _, _, _ = comparator.compare_datasets(
    df_a, df_b,
    primary_key_a='NRDOCFISCAL',
    primary_key_b='NRDOCFISCAL',
    secondary_keys_a=[],
    column_mapping=mapping
)
assert summary_nr['matched_keys_count'] == 257
print(f"[OK] Cenário com apenas NRDOCFISCAL validado: {summary_nr['matched_keys_count']} notas fiscais coincidentes.")
print("\nTODOS OS TESTES DO CENÁRIO DO USUÁRIO PASSARAM COM SUCESSO!")

