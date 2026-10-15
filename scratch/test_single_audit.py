import os
import sys
import io
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pandas as pd
import app

def test_single_pipeline():
    print("Iniciando testes integrados da Auditoria de Planilha Unica (SplitC)...")
    client = app.app.test_client()

    # 1. Cria DataFrame de teste com cenarios variados
    df_test = pd.DataFrame({
        'ID_CLIENTE': [101, 102, 103, 101, 105], # 101 duplicado
        'NOME_CLIENTE': ['Carlos Silva', 'Maria 123', 'Joao Santos', 'Ana Paula', 'Pedro'], # Maria 123 tem numeros
        'VALOR_BRUTO': [150.0, 200.0, 50.0, 300.0, 450.0],
        'VALOR_LIQUIDO': [140.0, 210.0, 45.0, 290.0, 440.0], # Linha 2 tem Liquido > Bruto (inconsistente)
        'CODIGO_ALFA': ['ABC1', 'XYZ2', '9999', 'W1K2', 'DEF3'], # '9999' nao tem letras
        'DATA_CADASTRO': ['2026-01-10', '2026-02-15', '2026-03-20', '2026-04-25', '2026-05-30']
    })

    test_file_path = 'scratch/planilha_teste_single.xlsx'
    os.makedirs('scratch', exist_ok=True)
    df_test.to_excel(test_file_path, index=False)

    # 2. Upload para /api/single/upload-headers
    with open(test_file_path, 'rb') as f:
        data = { 'file': (io.BytesIO(f.read()), 'planilha_teste_single.xlsx') }
        res = client.post('/api/single/upload-headers', data=data, content_type='multipart/form-data')

    assert res.status_code == 200, f"Falha POST /api/single/upload-headers: {res.status_code}"
    res_json = res.get_json()
    assert 'session_id' in res_json
    session_id = res_json['session_id']
    assert res_json['total_rows'] == 5
    assert len(res_json['cols']) == 6
    print(f"[OK] Upload de arquivo unico funcionando perfeitamente! Sessao: {session_id}")

    # 3. Teste de Auditoria com diversas regras
    rules = [
        # Regra 1: Duplicatas em ID_CLIENTE
        {
            'col': 'ID_CLIENTE',
            'rule_type': 'duplicate',
            'desc': 'Verificar Duplicatas em ID_CLIENTE'
        },
        # Regra 2: Apenas Letras em NOME_CLIENTE
        {
            'col': 'NOME_CLIENTE',
            'rule_type': 'only_letters',
            'desc': 'Apenas Letras em NOME_CLIENTE'
        },
        # Regra 3: Comparar Colunas VALOR_BRUTO >= VALOR_LIQUIDO
        {
            'col': 'VALOR_BRUTO',
            'rule_type': 'compare_cols',
            'target_col': 'VALOR_LIQUIDO',
            'op': '>=',
            'desc': 'VALOR_BRUTO >= VALOR_LIQUIDO'
        },
        # Regra 4: Alfanumerico em CODIGO_ALFA
        {
            'col': 'CODIGO_ALFA',
            'rule_type': 'alphanumeric',
            'desc': 'Letras e Numeros em CODIGO_ALFA'
        },
        # Regra 5: Maior que zero em VALOR_BRUTO
        {
            'col': 'VALOR_BRUTO',
            'rule_type': 'greater_than',
            'threshold': '0',
            'desc': 'VALOR_BRUTO > 0'
        }
    ]

    res_audit = client.post('/api/single/audit', json={
        'session_id': session_id,
        'rules': rules
    })

    assert res_audit.status_code == 200, f"Falha POST /api/single/audit: {res_audit.status_code} - {res_audit.get_data(as_text=True)}"
    audit_data = res_audit.get_json()
    assert audit_data['success'] is True
    summary = audit_data['summary']

    print(f"[OK] Auditoria executada com sucesso!")
    print(f"  Total Linhas: {summary['total_rows']}")
    print(f"  Linhas com Inconsistencias: {summary['invalid_rows']}")
    print(f"  Total de Falhas: {summary['total_errors']}")
    print(f"  Taxa de Conformidade: {summary['conformity_rate']}%")

    # Verifica inconsistencias esperadas:
    # - ID 101 duplicado (2 linhas)
    # - Maria 123 (1 linha)
    # - Linha 2 com VALOR_LIQUIDO > VALOR_BRUTO (1 linha)
    # - '9999' sem letras (1 linha)
    assert summary['invalid_rows'] > 0
    assert summary['total_errors'] >= 4

    # 4. Teste de Download do Relatorio Excel
    report_id = audit_data['report_id']
    res_down = client.get(f'/api/single/download-report/{report_id}')
    assert res_down.status_code == 200
    assert len(res_down.data) > 0
    print(f"[OK] Download do Relatorio Excel gerado com sucesso ({len(res_down.data)} bytes)!")

    print("\nTODOS OS TESTES DO VALIDADOR DE PLANILHA UNICA PASSARAM COM SUCESSO!")

if __name__ == '__main__':
    test_single_pipeline()
