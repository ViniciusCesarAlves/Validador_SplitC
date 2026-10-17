import os
import io
import app

def test_full_pipeline():
    print("Iniciando testes integrados da aplicacao SplitC...")
    client = app.app.test_client()

    # 1. Teste da rota inicial e favicon
    res = client.get('/')
    assert res.status_code == 200, f"Falha GET /: {res.status_code}"
    print("[OK] GET / funcionando perfeitamente (HTTP 200)")

    res_fav = client.get('/favicon.ico')
    assert res_fav.status_code == 200, f"Falha GET /favicon.ico: {res_fav.status_code}"
    assert len(res_fav.data) > 0
    print("[OK] GET /favicon.ico funcionando (HTTP 200, logo carregado)")

    # 2. Teste de Upload dos arquivos de teste
    with open('planilha_antiga.xlsx', 'rb') as fa, open('planilha_nova.xlsx', 'rb') as fb:
        data = {
            'file_a': (io.BytesIO(fa.read()), 'planilha_antiga.xlsx'),
            'file_b': (io.BytesIO(fb.read()), 'planilha_nova.xlsx')
        }
        res = client.post('/api/upload-headers', data=data, content_type='multipart/form-data')
    
    assert res.status_code == 200, f"Falha POST /api/upload-headers: {res.status_code}"
    upload_res = res.get_json()
    assert 'session_id' in upload_res
    session_id = upload_res['session_id']
    print(f"[OK] Upload e leitura de cabecalhos realizado. Sessao: {session_id}")
    print(f"  Colunas detectadas em A: {len(upload_res['cols_a'])}")
    print(f"  Colunas detectadas em B: {len(upload_res['cols_b'])}")
    print(f"  Mapeamento de Data_Fechamento: {upload_res['column_mapping'].get('Data_Fechamento')}")

    # 3. Teste com seletor único da esquerda (sem colunas complementares)
    compare_payload_single = {
        'session_id': session_id,
        'primary_key_a': 'SEQ_COM_SUM_VND',
        'primary_key_b': 'SEQ_COM_SUM_VND',
        'secondary_keys_a': [],
        'normalize_currency': True,
        'normalize_dates': True,
        'ignore_case': True,
        'trim_spaces': True,
        'column_mapping': upload_res['column_mapping']
    }
    res = client.post('/api/compare', json=compare_payload_single)
    assert res.status_code == 200
    comp_single = res.get_json()
    assert comp_single['summary']['is_identical'] is True
    print("[OK] Teste com apenas a chave principal da esquerda: 100% identico")

    # 4. Teste com 1 coluna complementar na direita (ex: DATA_VENDA)
    compare_payload_one_sec = dict(compare_payload_single)
    compare_payload_one_sec['secondary_keys_a'] = ['DATA_VENDA']
    res = client.post('/api/compare', json=compare_payload_one_sec)
    assert res.status_code == 200
    comp_one = res.get_json()
    assert comp_one['summary']['is_identical'] is True
    print("[OK] Teste com 1 coluna complementar (DATA_VENDA): 100% identico")

    # 5. Teste com 2 ou mais colunas complementares na direita (ex: DATA_VENDA e FILIAL)
    compare_payload_multi_sec = dict(compare_payload_single)
    compare_payload_multi_sec['secondary_keys_a'] = ['DATA_VENDA', 'FILIAL']
    res = client.post('/api/compare', json=compare_payload_multi_sec)
    assert res.status_code == 200
    comp_multi = res.get_json()
    assert comp_multi['summary']['is_identical'] is True
    assert comp_multi['summary']['secondary_keys_a'] == ['DATA_VENDA', 'FILIAL']
    print("[OK] Teste com 2 colunas complementares (DATA_VENDA + FILIAL): 100% identico")

    # 6. Teste com divergencias intencionais (desativando normalizacao de moedas)
    compare_payload_diff = dict(compare_payload_multi_sec)
    compare_payload_diff['normalize_currency'] = False

    res = client.post('/api/compare', json=compare_payload_diff)
    assert res.status_code == 200
    comp_res_diff = res.get_json()
    print("[OK] Comparacao sem normalizacao de moeda (cenario com divergencias):")
    print(f"  Bases identicas? {comp_res_diff['summary']['is_identical']}")
    print(f"  Linhas divergentes: {comp_res_diff['summary']['different_rows_count']}")
    print(f"  Celulas divergentes: {comp_res_diff['summary']['total_cells_diff']}")
    assert comp_res_diff['summary']['is_identical'] is False
    assert len(comp_res_diff['diff_preview']) > 0

    # 7. Teste do download do relatorio Excel gerado com as celulas pintadas
    report_id = comp_res_diff['report_id']
    res_down = client.get(f'/api/download-report/{report_id}')
    assert res_down.status_code == 200
    assert len(res_down.data) > 10000, "Relatorio Excel gerado esta vazio ou corrompido!"

    # Valida que o Excel gerado contém as abas esperadas, incluindo a nova 3ª aba 'Sumarização Financeira'
    import openpyxl
    wb_test = openpyxl.load_workbook(io.BytesIO(res_down.data))
    assert 'Divergências Detalhadas' in wb_test.sheetnames
    assert 'Sumarização Financeira' in wb_test.sheetnames, "Aba 'Sumarização Financeira' deve existir quando houver divergências!"
    
    # Valida presença da logo no Resumo
    ws_resumo = wb_test['Resumo da Validação']
    assert len(ws_resumo._images) > 0, "Logo SplitC deve estar presente lateralmente na aba de resumo!"
    print(f"[OK] Logo da SplitC confirmada no Excel ({len(ws_resumo._images)} imagem inserida).")

    # Valida cabeçalhos e cores (#4FD580)
    ws_test = wb_test['Divergências Detalhadas']
    headers_test = [ws_test.cell(row=1, column=i).value for i in range(1, 6)]
    expected_headers = ["Chave Identificadora", "Linha", "Coluna", "Valor Base Antiga", "Valor Base Nova"]
    assert headers_test == expected_headers, f"Headers incorretos: {headers_test} vs {expected_headers}"
    assert ws_test.cell(row=2, column=2).value is not None, "Coluna Linha vazia na linha 2"
    assert ws_test.cell(row=1, column=1).fill.start_color.rgb == '004FD580', "Cabeçalho deve usar a cor #4FD580!"

    # Valida a 3ª aba 'Sumarização Financeira'
    ws_fin = wb_test['Sumarização Financeira']
    fin_headers = [ws_fin.cell(row=1, column=i).value for i in range(1, 9)]
    expected_fin_headers = [
        "Coluna Base Antiga", "Coluna Base Nova", "Total Base Antiga (R$)", "Total Base Nova (R$)",
        "Diferença (Nova - Antiga)", "% Variação", "Situação", "Qtd. Linhas Divergentes"
    ]
    assert fin_headers == expected_fin_headers, f"Cabeçalhos da aba financeira incorretos: {fin_headers}"
    assert ws_fin.cell(row=1, column=1).fill.start_color.rgb == '004FD580', "Cabeçalhos da aba financeira devem usar #4FD580!"
    assert ws_fin.cell(row=2, column=3).value is not None, "Total da Base Antiga deve estar preenchido!"
    print(f"[OK] 3ª Aba 'Sumarização Financeira' confirmada com cabeçalhos em #4FD580: {fin_headers}")

    # Valida que em bases idênticas a 3ª aba 'Sumarização Financeira' NÃO é criada
    report_id_single = comp_single['report_id']
    res_down_single = client.get(f'/api/download-report/{report_id_single}')
    wb_single = openpyxl.load_workbook(io.BytesIO(res_down_single.data))
    assert 'Sumarização Financeira' not in wb_single.sheetnames, "Aba financeira NÃO deve existir em bases 100% idênticas!"
    print("[OK] Verificado: em bases 100% idênticas, a terceira aba não é criada (mantida estrutura enxuta).")

    # 8. Teste de Mapeamento Manual de Colunas com nomes completamente diferentes (+ Adicionar Coluna)
    # Simula o usuário adicionando manualmente correspondências que o fuzzy matching não detectou
    import pandas as pd
    df_custom_a = pd.DataFrame({
        'MATRICULA_REF': ['M001', 'M002'],
        'SALARIO_BASE': [5000.0, 7500.0],
        'SETOR_ATUACAO': ['Financeiro', 'TI']
    })
    df_custom_b = pd.DataFrame({
        'COD_FUNCIONARIO': ['M001', 'M002'],
        'REMUNERACAO_BRUTA': ['5.000,00', '7.500,00'],
        'DEPARTAMENTO': ['Financeiro', 'TI']
    })
    buf_a = io.BytesIO()
    buf_b = io.BytesIO()
    with pd.ExcelWriter(buf_a, engine='openpyxl') as writer:
        df_custom_a.to_excel(writer, index=False)
    with pd.ExcelWriter(buf_b, engine='openpyxl') as writer:
        df_custom_b.to_excel(writer, index=False)
    buf_a.seek(0)
    buf_b.seek(0)

    data_custom = {
        'file_a': (buf_a, 'base_antiga_custom.xlsx'),
        'file_b': (buf_b, 'base_nova_custom.xlsx')
    }
    res_upload_custom = client.post('/api/upload-headers', data=data_custom, content_type='multipart/form-data')
    assert res_upload_custom.status_code == 200
    custom_session = res_upload_custom.get_json()

    # O fuzzy matching não mapeia porque os nomes são 100% diferentes
    assert len(custom_session['column_mapping']) == 0

    # Simula o mapeamento manual pelo botão '+' do front-end
    manual_custom_mapping = {
        'MATRICULA_REF': 'COD_FUNCIONARIO',
        'SALARIO_BASE': 'REMUNERACAO_BRUTA',
        'SETOR_ATUACAO': 'DEPARTAMENTO'
    }

    res_compare_custom = client.post('/api/compare', json={
        'session_id': custom_session['session_id'],
        'primary_key_a': 'MATRICULA_REF',
        'primary_key_b': 'COD_FUNCIONARIO',
        'secondary_keys_a': [],
        'normalize_currency': True,
        'normalize_dates': True,
        'ignore_case': True,
        'trim_spaces': True,
        'column_mapping': manual_custom_mapping
    })
    assert res_compare_custom.status_code == 200
    custom_result = res_compare_custom.get_json()
    assert custom_result['summary']['is_identical'] is True
    assert custom_result['summary']['total_columns_compared'] == 3
    # 9. Teste da feature de Limpar Mapeamentos e selecionar apenas colunas desejadas
    # Simula o usuário clicando no botão vermelho de Limpar Mapeamentos e escolhendo apenas 1 coluna
    res_compare_cleared = client.post('/api/compare', json={
        'session_id': session_id,
        'primary_key_a': 'SEQ_COM_SUM_VND',
        'primary_key_b': 'SEQ_COM_SUM_VND',
        'secondary_keys_a': [],
        'normalize_currency': True,
        'normalize_dates': True,
        'ignore_case': True,
        'trim_spaces': True,
        'column_mapping': {'Data_Fechamento': 'Data Fechametno'}  # Apenas 1 coluna selecionada pelo usuário
    })
    assert res_compare_cleared.status_code == 200
    cleared_result = res_compare_cleared.get_json()
    assert cleared_result['summary']['total_columns_compared'] == 1, f"Esperado 1 coluna comparada, obtido: {cleared_result['summary']['total_columns_compared']}"
    print("[OK] Teste de Limpar Mapeamento e comparar apenas colunas selecionadas: 1 coluna comparada com sucesso!")

    # 10. Teste da página Validador de Texto (/validador-texto) e rotas de comparação (.txt, .docx, .pdf) + Exportação PDF
    res_txt_page = client.get('/validador-texto')
    assert res_txt_page.status_code == 200, f"Falha GET /validador-texto: {res_txt_page.status_code}"
    html_txt_page = res_txt_page.data.decode('utf-8')
    assert 'Rich text' in html_txt_page
    assert 'Redline' in html_txt_page
    assert 'Plain text' in html_txt_page
    assert 'OCR' not in html_txt_page
    print("[OK] GET /validador-texto renderizado com os 3 modos (Rich text, Redline, Plain text) e sem Imagem/OCR!")

    # Teste 10.1: Upload de arquivos .docx reais
    import docx
    doc_a_buf = io.BytesIO()
    doc_a = docx.Document()
    doc_a.add_paragraph("Contrato de Prestação de Serviços ValidAí")
    doc_a.add_paragraph("Cláusula 1: O valor mensal será de R$ 3.000,00.")
    doc_a.add_paragraph("Cláusula 2: Vigência de 12 meses.")
    doc_a.save(doc_a_buf)
    doc_a_buf.seek(0)

    doc_b_buf = io.BytesIO()
    doc_b = docx.Document()
    doc_b.add_paragraph("Contrato de Prestação de Serviços ValidAí")
    doc_b.add_paragraph("Cláusula 1: O valor mensal será de R$ 4.500,00.")
    doc_b.add_paragraph("Cláusula 3: Foro da comarca de São Paulo.")
    doc_b.save(doc_b_buf)
    doc_b_buf.seek(0)

    res_docx_cmp = client.post(
        '/api/text/compare',
        data={
            'file_a': (doc_a_buf, 'contrato_antigo.docx'),
            'file_b': (doc_b_buf, 'contrato_novo.docx'),
            'trim_spaces': 'true',
            'ignore_case': 'false',
            'diff_granularity': 'word'
        },
        content_type='multipart/form-data'
    )
    assert res_docx_cmp.status_code == 200, f"Falha POST /api/text/compare (.docx): {res_docx_cmp.status_code}"
    docx_json = res_docx_cmp.get_json()
    assert docx_json['summary']['is_identical'] is False
    assert docx_json['summary']['file_type_a'] == 'DOCX'
    assert docx_json['summary']['total_diff_blocks'] >= 2
    assert 'report_id' in docx_json

    # Verifica download do relatório PDF gerado
    pdf_report_id = docx_json['report_id']
    res_pdf_down = client.get(f'/api/text/download-pdf/{pdf_report_id}')
    assert res_pdf_down.status_code == 200, f"Falha download PDF: {res_pdf_down.status_code}"
    assert res_pdf_down.data.startswith(b'%PDF-'), "Arquivo baixado não é um PDF válido!"
    assert len(res_pdf_down.data) > 1500
    print(f"[OK] Comparação de .docx e exportação de relatório PDF validada ({len(res_pdf_down.data)} bytes)!")

    # Teste 10.2: Upload de arquivos .pdf reais (usando o próprio PDF gerado ou criando um PDF de teste)
    pdf_a_buf = io.BytesIO(res_pdf_down.data)
    pdf_b_buf = io.BytesIO(res_pdf_down.data)
    res_pdf_cmp = client.post(
        '/api/text/compare',
        data={
            'file_a': (pdf_a_buf, 'relatorio_v1.pdf'),
            'file_b': (pdf_b_buf, 'relatorio_v2.pdf'),
        },
        content_type='multipart/form-data'
    )
    assert res_pdf_cmp.status_code == 200, f"Falha POST /api/text/compare (.pdf): {res_pdf_cmp.status_code}"
    pdf_cmp_json = res_pdf_cmp.get_json()
    assert pdf_cmp_json['summary']['file_type_a'] == 'PDF'
    assert pdf_cmp_json['summary']['is_identical'] is True
    print("[OK] Leitura e comparação de arquivos .pdf funcionando perfeitamente!")

    # 11. Teste da página "Como usar?" (/como-usar) com Toggle Planilhas / Texto
    res_guide = client.get('/como-usar')
    assert res_guide.status_code == 200, f"Falha GET /como-usar: {res_guide.status_code}"
    html_guide = res_guide.data.decode('utf-8')
    assert 'btn-guide-planilhas' in html_guide
    assert 'btn-guide-texto' in html_guide
    assert 'guide-view-planilhas' in html_guide
    assert 'guide-view-texto' in html_guide
    print("[OK] GET /como-usar renderizado com toggle Validar Planilhas / Validar Texto e ambos os guias!")

    # 12. Teste do Dropdown de Idiomas (PT, ES, EN) e Internacionalização (i18n) em todas as páginas
    res_i18n_js = client.get('/static/js/i18n.js')
    assert res_i18n_js.status_code == 200, f"Falha GET /static/js/i18n.js: {res_i18n_js.status_code}"
    i18n_content = res_i18n_js.data.decode('utf-8')
    assert 'pt:' in i18n_content, "Dicionário PT ausente em i18n.js"
    assert 'es:' in i18n_content, "Dicionário ES ausente em i18n.js"
    assert 'en:' in i18n_content, "Dicionário EN ausente em i18n.js"
    print("[OK] Arquivo estático i18n.js carregado com sucesso contendo os 3 idiomas (PT, ES, EN)!")

    # Checar presença do dropdown e scripts em /, /validador-texto e /como-usar
    pages_to_check = [
        ('/', 'Validador Planilhas'),
        ('/validador-texto', 'Validador Texto'),
        ('/como-usar', 'Como Usar')
    ]
    for path, label in pages_to_check:
        res_p = client.get(path)
        assert res_p.status_code == 200, f"Falha GET {path}: {res_p.status_code}"
        html_p = res_p.data.decode('utf-8')
        assert 'lang-dropdown-wrapper' in html_p, f"Dropdown de idiomas ausente na página {label} ({path})"
        assert 'lang-toggle-btn' in html_p, f"Botão de alternância de idioma ausente na página {label} ({path})"
        assert 'data-lang="pt"' in html_p, f"Opção Português ausente na página {label} ({path})"
        assert 'data-lang="es"' in html_p, f"Opção Espanhol ausente na página {label} ({path})"
        assert 'data-lang="en"' in html_p, f"Opção Inglês ausente na página {label} ({path})"
        assert 'i18n.js' in html_p, f"Script i18n.js não importado na página {label} ({path})"
        assert 'data-i18n=' in html_p, f"Atributos data-i18n ausentes na página {label} ({path})"
        assert 'data-i18n="footer_copyright"' in html_p, f"Footer com data-i18n ausente na página {label} ({path})"
        print(f"[OK] Página {label} ({path}) validada com dropdown de idiomas e i18n!")

    print("\nTODOS OS TESTES PASSARAM COM 100% DE SUCESSO!")

if __name__ == '__main__':
    test_full_pipeline()
