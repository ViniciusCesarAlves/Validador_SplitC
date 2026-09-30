# Validador de Dados Automatizado

Aplicação Web intuitiva e veloz desenvolvida em **Python (Flask)** e **HTML5/CSS3/JavaScript**, criada para eliminar conferências manuais de planilhas (`.xlsx` e `.csv`), resolvendo em segundos problemas de formatações de texto, diferenças em nomes de colunas, moedas com ponto/vírgula e datas.

---

## 🚀 Como Iniciar o Sistema

### Opção 1: Execução com 2 Cliques (Recomendado no Windows)
Basta dar dois cliques no arquivo:
```cmd
iniciar_validador.bat
```
Ele iniciará o servidor local e abrirá automaticamente o navegador em `http://127.0.0.1:5000`.

---

### Opção 2: Pelo Terminal / Linha de Comando
```bash
python app.py
```
Em seguida, abra o navegador e acesse:
```
http://127.0.0.1:5000
```

---

## 🛠️ Como Utilizar a Ferramenta

1. **Passo 1: Carregar Arquivos**
   - Arraste ou selecione a **Base Antiga** (ou base de referência).
   - Arraste ou selecione a **Base Nova** (ou base para validação).
   - Clique em **"Ler Cabeçalhos e Continuar"**.

2. **Passo 2: Configurar Identificadores e Regras**
   - **Chave Identificadora Principal**: Selecione a coluna única comum (ex: `SEQ_COM_SUM_VND`, `ID`, `TICKET`, `MATRICULA`). O sistema sugere automaticamente a melhor opção.
   - **Segunda Chave (Opcional)**: Caso seja uma chave composta (ex: `DATA_VENDA`, `DATA_FECHAMENTO`, etc.).
   - **Regras de Normalização Automática** (já ativadas por padrão):
     - Normalização de Moeda / Números: Trata `"R$ 15.650,00"`, `"15650.00"`, `"15650,00"` e floats como idênticos.
     - Normalização de Datas: Trata `"2026-08-01"`, `"01/08/2026"` e datetime.
     - Ignorar Maiúsculas/Minúsculas e Espaços no início e fim.
     - Associação Inteligente de Colunas: Detecta pequenas variações de escrita e erros de digitação (ex: `Data_Fechamento` ↔ `Data Fechametno`).
   - Clique em **"🚀 Rodar Validação Completa"**.

3. **Passo 3: Resultados e Relatório**
   - **Bases Idênticas**: Se estiverem iguais, um banner verde de confirmação é exibido com o total de linhas e colunas validadas.
   - **Divergências**: Se houver diferenças, é exibido:
     - Resumo em KPIs (linhas afetadas, células divergentes, colunas divergentes).
     - Tags com as colunas que divergiram.
     - Tabela interativa com busca rápida destacando em vermelho/amarelo as células que diferem (`Valor Base Antiga ➔ Valor Base Nova`).
     - Botão **"Baixar Relatório Excel (.xlsx) com Células Pintadas"** para envio direto ao cliente ou auditoria.

---

## 📁 Estrutura do Projeto

- `app.py`: Servidor Flask com rotas de upload, comparação e download de relatório.
- `comparator.py`: Motor de leitura, normalização inteligente e geração do Excel com formatação condicional e células pintadas (`openpyxl`).
- `templates/index.html`: Interface web moderna e responsiva.
- `static/css/style.css`: Estilos profissionais e responsivos.
- `static/js/app.js`: Lógica client-side para drag & drop, requisições assíncronas e renderização das diferenças.
- `iniciar_validador.bat`: Script de inicialização rápida no Windows.
- `test_app.py`: Script de testes automatizados ponta a ponta.

