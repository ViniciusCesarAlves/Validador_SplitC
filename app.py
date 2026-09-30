import os
import uuid
import json
from flask import Flask, render_template, request, jsonify, send_file
import comparator

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # Suporta até 100MB de arquivo

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
REPORT_DIR = os.path.join(BASE_DIR, 'reports')

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

# Armazenamento em memória para sessões ativas
SESSIONS = {}
REPORTS = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload-headers', methods=['POST'])
def upload_headers():
    try:
        file_a = request.files.get('file_a')
        file_b = request.files.get('file_b')

        if not file_a or not file_b:
            return jsonify({'error': 'Envie ambos os arquivos (Base Antiga e Base Nova).'}), 400

        session_id = str(uuid.uuid4())
        session_folder = os.path.join(UPLOAD_DIR, session_id)
        os.makedirs(session_folder, exist_ok=True)

        filename_a = file_a.filename
        filename_b = file_b.filename

        path_a = os.path.join(session_folder, 'base_a_' + filename_a)
        path_b = os.path.join(session_folder, 'base_b_' + filename_b)

        file_a.save(path_a)
        file_b.save(path_b)

        # Ler colunas dos arquivos
        df_a = comparator.read_tabular_file(path_a, filename_a)
        df_b = comparator.read_tabular_file(path_b, filename_b)

        cols_a = list(df_a.columns)
        cols_b = list(df_b.columns)

        mapping = comparator.suggest_column_mappings(cols_a, cols_b)

        # Sugestões de chaves primárias inteligentes
        key_keywords = ['ID', 'SEQ', 'TICKET', 'MATRICULA', 'CODIGO', 'CHAVE', 'CPF', 'NUMERO', 'REGISTRO']
        suggested_keys = []
        
        # Colunas que mapeiam entre si e possuem palavras-chave de identificador
        for col_a, col_b in mapping.items():
            col_norm = comparator.normalize_column_name(col_a)
            if any(k in col_norm for k in key_keywords):
                suggested_keys.append({
                    'col_a': col_a,
                    'col_b': col_b,
                    'score': 10
                })

        # Adiciona outras colunas comuns se não houver muitas
        for col_a, col_b in mapping.items():
            if not any(s['col_a'] == col_a for s in suggested_keys):
                suggested_keys.append({
                    'col_a': col_a,
                    'col_b': col_b,
                    'score': 1
                })

        suggested_keys.sort(key=lambda x: x['score'], reverse=True)

        SESSIONS[session_id] = {
            'path_a': path_a,
            'path_b': path_b,
            'filename_a': filename_a,
            'filename_b': filename_b,
            'cols_a': cols_a,
            'cols_b': cols_b,
            'mapping': mapping,
            'rows_a_count': len(df_a),
            'rows_b_count': len(df_b)
        }

        return jsonify({
            'session_id': session_id,
            'filename_a': filename_a,
            'filename_b': filename_b,
            'rows_a_count': len(df_a),
            'rows_b_count': len(df_b),
            'cols_a': cols_a,
            'cols_b': cols_b,
            'suggested_keys': [s['col_a'] for s in suggested_keys],
            'column_mapping': mapping
        })

    except Exception as e:
        return jsonify({'error': f'Falha ao processar arquivos: {str(e)}'}), 500

@app.route('/favicon.ico')
def favicon():
    ico_path = os.path.join(BASE_DIR, 'static', 'favicon.ico')
    if os.path.exists(ico_path):
        return send_file(ico_path, mimetype='image/x-icon')
    return send_file(os.path.join(BASE_DIR, 'static', 'images', 'favicon.png'), mimetype='image/png')

@app.route('/api/compare', methods=['POST'])
def compare():
    try:
        data = request.json or {}
        session_id = data.get('session_id')

        if not session_id or session_id not in SESSIONS:
            return jsonify({'error': 'Sessão inválida ou expirada. Faça o upload novamente.'}), 400

        sess = SESSIONS[session_id]
        if 'column_mapping' in data and isinstance(data['column_mapping'], dict):
            custom_mapping = data['column_mapping']
        else:
            custom_mapping = sess.get('mapping', {})
        primary_key_a = data.get('primary_key_a')
        primary_key_b = data.get('primary_key_b')
        if not primary_key_b or primary_key_b not in sess['cols_b']:
            primary_key_b = custom_mapping.get(primary_key_a) or sess.get('mapping', {}).get(primary_key_a, primary_key_a)
        
        # Suporta lista de colunas complementares ou coluna única
        secondary_keys_a = data.get('secondary_keys_a')
        if not secondary_keys_a and data.get('secondary_key_a'):
            secondary_keys_a = [data.get('secondary_key_a')]
        elif not secondary_keys_a:
            secondary_keys_a = []

        normalize_currency = bool(data.get('normalize_currency', True))
        normalize_dates = bool(data.get('normalize_dates', True))
        ignore_case = bool(data.get('ignore_case', True))
        trim_spaces = bool(data.get('trim_spaces', True))

        df_a = comparator.read_tabular_file(sess['path_a'], sess['filename_a'])
        df_b = comparator.read_tabular_file(sess['path_b'], sess['filename_b'])

        summary, diff_records, df_a_idx, df_b_idx, valid_cols_a, final_mapping, only_a, only_b = comparator.compare_datasets(
            df_a, df_b,
            primary_key_a=primary_key_a,
            primary_key_b=primary_key_b,
            secondary_keys_a=secondary_keys_a,
            column_mapping=custom_mapping,
            normalize_currency=normalize_currency,
            normalize_dates=normalize_dates,
            ignore_case=ignore_case,
            trim_spaces=trim_spaces,
            max_sample_rows=300
        )

        # Gera o relatório Excel em background
        report_id = str(uuid.uuid4())
        report_filename = f"Relatorio_Validacao_{report_id[:8]}.xlsx"
        report_path = os.path.join(REPORT_DIR, report_filename)

        comparator.generate_excel_diff_report(
            summary=summary,
            diff_records=diff_records,
            df_a_indexed=df_a_idx,
            df_b_indexed=df_b_idx,
            valid_cols_a=valid_cols_a,
            column_mapping=final_mapping,
            only_in_a=only_a,
            only_in_b=only_b,
            output_path=report_path
        )

        REPORTS[report_id] = {
            'path': report_path,
            'filename': report_filename
        }

        # Formata resposta com resumo e amostra de diferenças para tabela dinâmica
        return jsonify({
            'success': True,
            'report_id': report_id,
            'summary': summary,
            'has_differences': not summary['is_identical'],
            'diff_preview': summary['sample_diff_records'],
            'columns_with_differences': summary['columns_with_differences']
        })

    except Exception as e:
        return jsonify({'error': f'Erro na comparação: {str(e)}'}), 500

@app.route('/api/download-report/<report_id>', methods=['GET'])
def download_report(report_id):
    if report_id not in REPORTS:
        return jsonify({'error': 'Relatório não encontrado.'}), 404

    rep = REPORTS[report_id]
    return send_file(
        rep['path'],
        as_attachment=True,
        download_name=rep['filename'],
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

if __name__ == '__main__':
    print("Iniciando Validador de Dados em http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True, use_reloader=False)

