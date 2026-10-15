import sys
sys.path.insert(0, '.')
import comparator

file_a = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762399_9f880285.csv'
file_b = 'C:/Users/vini3/.gemini/antigravity/brain/943ec2d6-3ef8-47b1-b8af-2efb56bdba02/.user_uploaded/media_1792096762414_cadd41b4.csv'

df_a = comparator.read_tabular_file(file_a, 'media_a.csv')
df_b = comparator.read_tabular_file(file_b, 'media_b.csv')

# Clean BOM in columns
df_a.columns = [c.replace('\ufeff', '') for c in df_a.columns]
df_b.columns = [c.replace('\ufeff', '') for c in df_b.columns]

doc = '107276-1'
print(f"=== DOC: {doc} ===")
print("A:")
print(df_a[df_a['NRDOCFISCAL'] == doc][['NRDOCFISCAL', 'NMCLIENTE', 'NMVENDEDOR', 'IDCOLABORADOR', 'IDDOCFISCAL', 'DTEMISSAO', 'mes', 'DSSEGMENTO', 'VLVENDASEGMENTO']])
print("\nB:")
print(df_b[df_b['NRDOCFISCAL'] == doc][['NRDOCFISCAL', 'NMCLIENTE', 'NMVENDEDOR', 'IDCOLABORADOR', 'IDDOCFISCAL', 'DTEMISSAO', 'mes', 'DSSEGMENTO', 'VLVENDASEGMENTO']])

doc2 = '308662-1'
print(f"\n=== DOC: {doc2} ===")
print("A:")
print(df_a[df_a['NRDOCFISCAL'] == doc2][['NRDOCFISCAL', 'NMCLIENTE', 'NMVENDEDOR', 'IDCOLABORADOR', 'IDDOCFISCAL', 'DTEMISSAO', 'mes', 'DSSEGMENTO', 'VLVENDASEGMENTO']])
print("\nB:")
print(df_b[df_b['NRDOCFISCAL'] == doc2][['NRDOCFISCAL', 'NMCLIENTE', 'NMVENDEDOR', 'IDCOLABORADOR', 'IDDOCFISCAL', 'DTEMISSAO', 'mes', 'DSSEGMENTO', 'VLVENDASEGMENTO']])

