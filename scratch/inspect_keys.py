import sys
sys.path.insert(0, '.')
import comparator

file_a = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762399_9f880285.csv'
file_b = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762414_cadd41b4.csv'

df_a = comparator.read_tabular_file(file_a, 'media_a.csv')
df_b = comparator.read_tabular_file(file_b, 'media_b.csv')

pk_a = df_a.columns[0]
pk_b = df_b.columns[0]

# Inspect the values of NRDOCFISCAL, IDDOCFISCAL, IDCOLABORADOR in A and B
print("Sample A:")
for i, row in df_a[['\ufeffNRDOCFISCAL', 'IDDOCFISCAL', 'IDCOLABORADOR']].head(10).iterrows():
    print(f"A: doc={repr(row['\ufeffNRDOCFISCAL'])}, iddoc={repr(row['IDDOCFISCAL'])}, idcolab={repr(row['IDCOLABORADOR'])}")

print("\nSample B:")
for i, row in df_b[['\ufeffNRDOCFISCAL', 'IDDOCFISCAL', 'IDCOLABORADOR']].head(10).iterrows():
    print(f"B: doc={repr(row['\ufeffNRDOCFISCAL'])}, iddoc={repr(row['IDDOCFISCAL'])}, idcolab={repr(row['IDCOLABORADOR'])}")

# Check if ANY NRDOCFISCAL in A is in B
docs_a = set(df_a['\ufeffNRDOCFISCAL'].astype(str))
docs_b = set(df_b['\ufeffNRDOCFISCAL'].astype(str))
common_docs = docs_a & docs_b
print(f"\nUnique docs in A: {len(docs_a)}, in B: {len(docs_b)}, common docs: {len(common_docs)}")
print("Sample common docs:", list(common_docs)[:5])

# For common docs, what are the IDDOCFISCAL and IDCOLABORADOR in A vs B?
sample_doc = list(common_docs)[0]
print(f"\nLooking at common doc: {sample_doc}")
print("In A:")
print(df_a[df_a['\ufeffNRDOCFISCAL'].astype(str) == sample_doc][['\ufeffNRDOCFISCAL', 'IDDOCFISCAL', 'IDCOLABORADOR', 'DTEMISSAO', 'mes', 'VLVENDASEGMENTO']])
print("In B:")
print(df_b[df_b['\ufeffNRDOCFISCAL'].astype(str) == sample_doc][['\ufeffNRDOCFISCAL', 'IDDOCFISCAL', 'IDCOLABORADOR', 'DTEMISSAO', 'mes', 'VLVENDASEGMENTO']])

