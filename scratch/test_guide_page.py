import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app

def test_routes():
    client = app.app.test_client()
    
    # 1. Rota inicial
    res_home = client.get('/')
    assert res_home.status_code == 200
    html_home = res_home.data.decode('utf-8')
    assert 'Validador Planilhas' in html_home
    assert 'Como usar?' in html_home
    assert '/como-usar' in html_home
    print('[OK] GET / contém menu de navegação correto.')

    # 2. Rota do Guia
    res_guide = client.get('/como-usar')
    assert res_guide.status_code == 200
    html_guide = res_guide.data.decode('utf-8')
    assert 'Como usar o' in html_guide
    assert 'Chave Primária' in html_guide
    assert 'Comparar 2 Bases' in html_guide
    assert 'Auditar 1 Base' in html_guide
    assert 'Dicas de Ouro' in html_guide
    print('[OK] GET /como-usar funcionando e com todo o conteúdo didático.')

    # 3. Arquivo CSS do Guia
    res_css = client.get('/static/css/guide.css')
    assert res_css.status_code == 200
    print('[OK] GET /static/css/guide.css carregado com sucesso.')

if __name__ == '__main__':
    test_routes()
    print('Todos os testes passaram com 100% de sucesso!')

