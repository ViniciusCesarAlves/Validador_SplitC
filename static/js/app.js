document.addEventListener('DOMContentLoaded', () => {
    // Estado da Aplicação
    const state = {
        sessionId: null,
        reportId: null,
        fileA: null,
        fileB: null,
        columnsA: [],
        columnsB: [],
        initialMapping: {},
        mappingList: [],
        mapping: {},
        isManualMapping: false,
        selectedSecondaryKeys: [],
        diffRecords: [],
        allDiffRows: []
    };

    // ----------------------------------------------------
    // GERENCIAMENTO DO TEMA (CLARO / ESCURO)
    // ----------------------------------------------------
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const THEME_STORAGE_KEY = 'splitc_theme';

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.body.classList.add('dark-theme');
            if (themeToggleBtn) {
                themeToggleBtn.setAttribute('title', 'Mudar para tema claro');
                themeToggleBtn.setAttribute('aria-pressed', 'true');
            }
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.body.classList.remove('dark-theme');
            if (themeToggleBtn) {
                themeToggleBtn.setAttribute('title', 'Mudar para tema escuro');
                themeToggleBtn.setAttribute('aria-pressed', 'false');
            }
        }
    }

    const savedTheme = (function() {
        try {
            return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
        } catch(e) {
            return 'light';
        }
    })();
    applyTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark-theme');
            const newTheme = isDark ? 'light' : 'dark';
            applyTheme(newTheme);
            try {
                localStorage.setItem(THEME_STORAGE_KEY, newTheme);
            } catch (e) {}
        });
    }

    // Elementos DOM - Passo 1
    const fileInputA = document.getElementById('file-a');
    const fileInputB = document.getElementById('file-b');
    const dropzoneA = document.getElementById('dropzone-a');
    const dropzoneB = document.getElementById('dropzone-b');
    const fileMetaA = document.getElementById('file-meta-a');
    const fileMetaB = document.getElementById('file-meta-b');
    const filenameA = document.getElementById('filename-a');
    const filenameB = document.getElementById('filename-b');
    const filesizeA = document.getElementById('filesize-a');
    const filesizeB = document.getElementById('filesize-b');
    const btnReadHeaders = document.getElementById('btn-read-headers');

    // Elementos DOM - Passo 2
    const stepConfig = document.getElementById('step-config');
    const selectPrimaryKey = document.getElementById('primary-key');
    const secKeysTrigger = document.getElementById('sec-keys-trigger');
    const secKeysDropdown = document.getElementById('sec-keys-dropdown');
    const secKeysLabel = document.getElementById('sec-keys-label');
    const secKeysSearch = document.getElementById('sec-keys-search');
    const secKeysOptionsList = document.getElementById('sec-keys-options-list');
    const selectedSecKeysTags = document.getElementById('selected-sec-keys-tags');
    const btnClearSecKeys = document.getElementById('btn-clear-sec-keys');
    const btnCloseSecKeys = document.getElementById('btn-close-sec-keys');

    const normCurrency = document.getElementById('norm-currency');
    const normDates = document.getElementById('norm-dates');
    const normCase = document.getElementById('norm-case');
    const normTrim = document.getElementById('norm-trim');
    const mappedColsCount = document.getElementById('mapped-cols-count');
    const mappingTableBody = document.getElementById('mapping-table-body');
    const btnAddMapping = document.getElementById('btn-add-mapping');
    const btnRestoreMapping = document.getElementById('btn-restore-mapping');
    const btnClearMapping = document.getElementById('btn-clear-mapping');
    const unmappedHint = document.getElementById('unmapped-hint');
    const btnRunCompare = document.getElementById('btn-run-compare');

    // Elementos DOM - Modal de Limpeza / Seleção de Mapeamento
    const modalClearMapping = document.getElementById('modal-clear-mapping');
    const btnModalClose = document.getElementById('btn-modal-close');
    const btnModalClearAll = document.getElementById('btn-modal-clear-all');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const btnModalApply = document.getElementById('btn-modal-apply');
    const btnModalSelectAll = document.getElementById('btn-modal-select-all');
    const btnModalDeselectAll = document.getElementById('btn-modal-deselect-all');
    const modalSearchInput = document.getElementById('modal-search-input');
    const modalSearchClear = document.getElementById('modal-search-clear');
    const modalColumnsList = document.getElementById('modal-columns-list');
    const modalSelectedCount = document.getElementById('modal-selected-count');
    const modalTotalCount = document.getElementById('modal-total-count');
    const modalBtnApplyCount = document.getElementById('modal-btn-apply-count');

    // Elementos DOM - Passo 3
    const stepResults = document.getElementById('step-results');
    const bannerIdentical = document.getElementById('banner-identical');
    const bannerDiffs = document.getElementById('banner-diffs');
    const kpiRowsMatched = document.getElementById('kpi-rows-matched');
    const kpiRowsTotal = document.getElementById('kpi-rows-total');
    const kpiRowsDiff = document.getElementById('kpi-rows-diff');
    const kpiPctDiff = document.getElementById('kpi-pct-diff');
    const kpiCellsDiff = document.getElementById('kpi-cells-diff');
    const kpiColsDiff = document.getElementById('kpi-cols-diff');
    const kpiColsTotal = document.getElementById('kpi-cols-total');
    const btnDownloadExcel = document.getElementById('btn-download-excel');
    const diffColsSection = document.getElementById('diff-cols-section');
    const diffTagsContainer = document.getElementById('diff-tags-container');
    const diffTableSection = document.getElementById('diff-table-section');
    const diffTableBody = document.getElementById('diff-table-body');
    const diffSearch = document.getElementById('diff-search');
    const btnRestart = document.getElementById('btn-restart');

    // Elementos de Navegação e Sumarização Financeira
    const resultNavTabs = document.getElementById('result-nav-tabs');
    const tabBtnDiffs = document.getElementById('tab-btn-diffs');
    const tabBtnFinancial = document.getElementById('tab-btn-financial');
    const financialTableSection = document.getElementById('financial-table-section');
    const financialTableBody = document.getElementById('financial-table-body');
    const financialTableFooter = document.getElementById('financial-table-footer');
    const badgeDiffCount = document.getElementById('badge-diff-count');
    const badgeFinCount = document.getElementById('badge-fin-count');

    // ----------------------------------------------------
    // FUNÇÕES UTILITÁRIAS
    // ----------------------------------------------------
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function setBtnLoading(button, isLoading, originalText = '') {
        const textSpan = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');
        const icon = button.querySelector('.btn-circle-icon');
        if (isLoading) {
            button.disabled = true;
            if (textSpan) textSpan.dataset.original = textSpan.textContent;
            if (textSpan && originalText) textSpan.textContent = originalText;
            if (spinner) spinner.style.display = 'inline-block';
            if (icon) icon.style.display = 'none';
        } else {
            button.disabled = false;
            if (textSpan && textSpan.dataset.original) textSpan.textContent = textSpan.dataset.original;
            if (spinner) spinner.style.display = 'none';
            if (icon) icon.style.display = 'inline-flex';
        }
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ----------------------------------------------------
    // PASSO 1: UPLOAD & DRAG AND DROP
    // ----------------------------------------------------
    function setupDropzone(dropzone, input, metaBox, nameSpan, sizeSpan, fileKey) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('drag-over');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0], dropzone, metaBox, nameSpan, sizeSpan, fileKey);
            }
        });

        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0], dropzone, metaBox, nameSpan, sizeSpan, fileKey);
            }
        });
    }

    function handleFileSelect(file, dropzone, metaBox, nameSpan, sizeSpan, fileKey) {
        state[fileKey] = file;
        nameSpan.textContent = file.name;
        sizeSpan.textContent = formatBytes(file.size);
        metaBox.style.display = 'inline-flex';
        dropzone.classList.add('file-loaded');

        // Se ambos os arquivos foram selecionados, habilita o botão
        if (state.fileA && state.fileB) {
            btnReadHeaders.disabled = false;
        }
    }

    setupDropzone(dropzoneA, fileInputA, fileMetaA, filenameA, filesizeA, 'fileA');
    setupDropzone(dropzoneB, fileInputB, fileMetaB, filenameB, filesizeB, 'fileB');

    // ----------------------------------------------------
    // PASSO 1 -> PASSO 2: LER CABEÇALHOS
    // ----------------------------------------------------
    btnReadHeaders.addEventListener('click', async () => {
        if (!state.fileA || !state.fileB) return;

        setBtnLoading(btnReadHeaders, true, 'Lendo cabeçalhos e analisando...');

        const formData = new FormData();
        formData.append('file_a', state.fileA);
        formData.append('file_b', state.fileB);

        try {
            const response = await fetch('/api/upload-headers', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Erro ao processar planilhas.');
                setBtnLoading(btnReadHeaders, false);
                return;
            }

            state.sessionId = data.session_id;
            state.columnsA = data.cols_a;
            state.columnsB = data.cols_b;
            state.initialMapping = { ...(data.column_mapping || {}) };
            state.mapping = data.column_mapping || {};
            state.selectedSecondaryKeys = [];
            state.isManualMapping = false;

            // Inicializar lista de mapeamentos editáveis
            state.mappingList = Object.entries(state.mapping).map(([colA, colB], idx) => ({
                id: 'map_' + idx + '_' + Math.random().toString(36).substring(2, 7),
                colA: colA,
                colB: colB
            }));

            // Popular Dropdown de Chave Primária (Coluna da Esquerda)
            selectPrimaryKey.innerHTML = '<option value="">Selecione a chave primária...</option>';

            state.columnsA.forEach(col => {
                const opt = document.createElement('option');
                opt.value = col;
                opt.textContent = col;
                selectPrimaryKey.appendChild(opt);
            });

            // Selecionar sugestão inteligente automaticamente se houver
            if (data.suggested_keys && data.suggested_keys.length > 0) {
                selectPrimaryKey.value = data.suggested_keys[0];
            }

            // Inicializar o seletor múltiplo da coluna da direita
            renderSecondaryKeysOptions();
            updateSecondaryKeysUI();

            // Renderizar tabela de mapeamento de colunas
            renderMappingTable();

            // Exibir Passo 2 com transição suave
            stepConfig.style.display = 'block';
            stepConfig.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            console.error(err);
            alert('Falha na comunicação com o servidor: ' + err.message);
        } finally {
            setBtnLoading(btnReadHeaders, false);
        }
    });

    // ----------------------------------------------------
    // GERENCIAMENTO DO SELETOR MÚLTIPLO (COLUNA DA DIREITA)
    // ----------------------------------------------------
    function renderSecondaryKeysOptions(filterText = '') {
        secKeysOptionsList.innerHTML = '';
        const currentPk = selectPrimaryKey.value;
        const query = (filterText || '').toLowerCase().trim();

        // Lista de colunas disponíveis excluindo a chave primária
        const availableCols = state.columnsA.filter(c => c !== currentPk);

        const filteredCols = query 
            ? availableCols.filter(c => c.toLowerCase().includes(query))
            : availableCols;

        if (filteredCols.length === 0) {
            secKeysOptionsList.innerHTML = '<div style="padding: 12px; text-align: center; color: #64748b; font-size: 13px;">Nenhuma coluna encontrada</div>';
            return;
        }

        filteredCols.forEach(col => {
            const isChecked = state.selectedSecondaryKeys.includes(col);
            const label = document.createElement('label');
            label.className = 'multiselect-option' + (isChecked ? ' selected' : '');
            label.innerHTML = `
                <input type="checkbox" value="${escapeHtml(col)}" ${isChecked ? 'checked' : ''}>
                <span>${escapeHtml(col)}</span>
            `;

            const chk = label.querySelector('input');
            chk.addEventListener('change', (e) => {
                const val = e.target.value;
                if (e.target.checked) {
                    if (!state.selectedSecondaryKeys.includes(val)) {
                        state.selectedSecondaryKeys.push(val);
                    }
                    label.classList.add('selected');
                } else {
                    state.selectedSecondaryKeys = state.selectedSecondaryKeys.filter(k => k !== val);
                    label.classList.remove('selected');
                }
                updateSecondaryKeysUI();
            });

            secKeysOptionsList.appendChild(label);
        });
    }

    function updateSecondaryKeysUI() {
        const count = state.selectedSecondaryKeys.length;
        if (count === 0) {
            secKeysLabel.textContent = 'Nenhuma coluna complementar selecionada';
            secKeysLabel.style.color = 'var(--text-muted)';
        } else if (count === 1) {
            secKeysLabel.textContent = `1 coluna: ${state.selectedSecondaryKeys[0]}`;
            secKeysLabel.style.color = 'var(--text-main)';
        } else {
            secKeysLabel.textContent = `${count} colunas selecionadas para validação`;
            secKeysLabel.style.color = 'var(--text-main)';
        }

        // Renderizar tags/chips das colunas selecionadas
        selectedSecKeysTags.innerHTML = '';
        state.selectedSecondaryKeys.forEach(col => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `
                <span>${escapeHtml(col)}</span>
                <span class="tag-remove" data-col="${escapeHtml(col)}" title="Remover coluna">×</span>
            `;
            chip.querySelector('.tag-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                const removeCol = e.target.dataset.col;
                state.selectedSecondaryKeys = state.selectedSecondaryKeys.filter(k => k !== removeCol);
                updateSecondaryKeysUI();
                renderSecondaryKeysOptions(secKeysSearch.value);
            });
            selectedSecKeysTags.appendChild(chip);
        });
    }

    // Abertura e fechamento do dropdown multiselect
    secKeysTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = secKeysDropdown.style.display === 'flex';
        secKeysDropdown.style.display = isOpen ? 'none' : 'flex';
        secKeysTrigger.classList.toggle('active', !isOpen);
        if (!isOpen) {
            secKeysSearch.value = '';
            renderSecondaryKeysOptions();
            secKeysSearch.focus();
        }
    });

    secKeysSearch.addEventListener('input', (e) => {
        renderSecondaryKeysOptions(e.target.value);
    });

    btnClearSecKeys.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedSecondaryKeys = [];
        updateSecondaryKeysUI();
        renderSecondaryKeysOptions(secKeysSearch.value);
    });

    btnCloseSecKeys.addEventListener('click', (e) => {
        e.stopPropagation();
        secKeysDropdown.style.display = 'none';
        secKeysTrigger.classList.remove('active');
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        const container = document.getElementById('multiselect-container');
        if (container && !container.contains(e.target)) {
            secKeysDropdown.style.display = 'none';
            secKeysTrigger.classList.remove('active');
        }
    });

    // Se a chave primária for alterada, atualiza o seletor múltiplo para não conter a mesma chave
    selectPrimaryKey.addEventListener('change', () => {
        const pk = selectPrimaryKey.value;
        if (state.selectedSecondaryKeys.includes(pk)) {
            state.selectedSecondaryKeys = state.selectedSecondaryKeys.filter(k => k !== pk);
            updateSecondaryKeysUI();
        }
        renderSecondaryKeysOptions(secKeysSearch.value);
    });

    function updateMappingStateAndHints() {
        const newMapping = {};
        state.mappingList.forEach(item => {
            if (item.colA && item.colB) {
                newMapping[item.colA] = item.colB;
            }
        });
        state.mapping = newMapping;
        mappedColsCount.textContent = Object.keys(newMapping).length;

        // Alerta informativo sobre colunas não mapeadas
        if (unmappedHint) {
            const mappedA = new Set(state.mappingList.map(it => it.colA).filter(Boolean));
            const unmappedA = state.columnsA.filter(c => !mappedA.has(c));

            const mappedB = new Set(state.mappingList.map(it => it.colB).filter(Boolean));
            const unmappedB = state.columnsB.filter(c => !mappedB.has(c));

            if (unmappedA.length > 0 || unmappedB.length > 0) {
                let msg = '';
                if (unmappedA.length > 0) {
                    const maxShow = 8;
                    const previewA = unmappedA.slice(0, maxShow).map(c => escapeHtml(c)).join(', ');
                    const extraA = unmappedA.length > maxShow ? ` e mais ${unmappedA.length - maxShow} coluna(s)...` : '';
                    msg += `<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <svg class="splitc-icon splitc-icon-sm" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <strong>Colunas da Base Antiga ainda não mapeadas (${unmappedA.length}):</strong> <span style="color: #475569; font-weight: 500;">${previewA}${extraA}</span>
                    </div>`;
                }
                if (unmappedB.length > 0) {
                    const maxShow = 8;
                    const previewB = unmappedB.slice(0, maxShow).map(c => escapeHtml(c)).join(', ');
                    const extraB = unmappedB.length > maxShow ? ` e mais ${unmappedB.length - maxShow} coluna(s)...` : '';
                    msg += `<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <svg class="splitc-icon splitc-icon-sm" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <strong>Colunas da Base Nova ainda não mapeadas (${unmappedB.length}):</strong> <span style="color: #475569; font-weight: 500;">${previewB}${extraB}</span>
                    </div>`;
                }
                msg += `<div style="margin-top: 6px; font-weight: 600; color: #b45309; display: flex; align-items: center; gap: 6px;">
                    <svg class="splitc-icon splitc-icon-sm" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 16 16 12 12 8"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    <span>Se alguma dessas colunas corresponde a uma coluna na outra base com nome diferente, clique em <strong>"+ Adicionar Coluna"</strong> acima para associá-las manualmente.</span>
                </div>`;
                unmappedHint.innerHTML = msg;
                unmappedHint.style.display = 'block';
            } else {
                unmappedHint.style.display = 'none';
                unmappedHint.innerHTML = '';
            }
        }
    }

    // ----------------------------------------------------
    // CONTROLE DO DROPDOWN PESQUISÁVEL DE MAPEAMENTO
    // ----------------------------------------------------
    let activeDropdownState = null; // { itemId, colType: 'colA'|'colB', triggerEl }

    function normalizeSearch(str) {
        return (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    function openMappingDropdown(itemId, colType, triggerEl) {
        if (activeDropdownState && activeDropdownState.triggerEl === triggerEl) {
            closeMappingDropdown();
            return;
        }

        closeMappingDropdown();

        activeDropdownState = { itemId, colType, triggerEl };
        triggerEl.classList.add('active');

        const portal = document.getElementById('mapping-dropdown-portal');
        const searchInput = document.getElementById('mapping-dropdown-search');
        const clearBtn = document.getElementById('mapping-dropdown-clear-btn');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';

        renderMappingDropdownOptions('');

        if (portal) {
            portal.style.display = 'flex';
            positionMappingDropdown(triggerEl, portal);
        }

        setTimeout(() => {
            if (searchInput) searchInput.focus();
        }, 30);
    }

    function positionMappingDropdown(triggerEl, portal) {
        if (!triggerEl || !portal) return;
        const rect = triggerEl.getBoundingClientRect();
        const dropdownWidth = Math.max(rect.width, 280);
        const dropdownHeight = 310;
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        let left = rect.left;
        if (left + dropdownWidth > windowWidth - 16) {
            left = windowWidth - dropdownWidth - 16;
        }
        if (left < 16) left = 16;

        let top = rect.bottom + 4;
        if (rect.bottom + dropdownHeight > windowHeight - 16 && rect.top > dropdownHeight + 16) {
            top = rect.top - dropdownHeight - 4;
        }

        portal.style.top = `${top}px`;
        portal.style.left = `${left}px`;
        portal.style.width = `${dropdownWidth}px`;
    }

    function renderMappingDropdownOptions(filterText = '') {
        if (!activeDropdownState) return;
        const { itemId, colType } = activeDropdownState;
        const item = state.mappingList.find(it => it.id === itemId);
        if (!item) return;

        const allCols = colType === 'colA' ? state.columnsA : state.columnsB;
        const currentVal = colType === 'colA' ? item.colA : item.colB;

        const normFilter = normalizeSearch(filterText);
        const filteredCols = allCols.filter(c => normalizeSearch(c).includes(normFilter));

        const listEl = document.getElementById('mapping-dropdown-options');
        if (!listEl) return;
        listEl.innerHTML = '';

        // Opção para desmarcar / selecionar vazio
        const emptyOpt = document.createElement('div');
        emptyOpt.className = 'dropdown-option is-empty-option' + (!currentVal ? ' selected' : '');
        emptyOpt.innerHTML = `<span>(Nenhuma coluna selecionada)</span>`;
        emptyOpt.addEventListener('click', () => {
            selectMappingDropdownOption('');
        });
        listEl.appendChild(emptyOpt);

        if (filteredCols.length === 0) {
            const noRes = document.createElement('div');
            noRes.className = 'dropdown-no-results';
            noRes.textContent = 'Nenhuma coluna encontrada.';
            listEl.appendChild(noRes);
            return;
        }

        filteredCols.forEach(col => {
            const isSelected = col === currentVal;
            const opt = document.createElement('div');
            opt.className = 'dropdown-option' + (isSelected ? ' selected' : '');
            opt.innerHTML = `
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(col)}</span>
                ${isSelected ? '<span style="color: #f87f06; font-weight: 800; margin-left: 8px;">✓</span>' : ''}
            `;
            opt.addEventListener('click', () => {
                selectMappingDropdownOption(col);
            });
            listEl.appendChild(opt);
        });
    }

    function selectMappingDropdownOption(colValue) {
        if (!activeDropdownState) return;
        const { itemId, colType } = activeDropdownState;
        const item = state.mappingList.find(it => it.id === itemId);
        if (item) {
            if (colType === 'colA') {
                item.colA = colValue;
            } else {
                item.colB = colValue;
            }
            renderMappingTable();
        }
        closeMappingDropdown();
    }

    function closeMappingDropdown() {
        const portal = document.getElementById('mapping-dropdown-portal');
        if (portal) portal.style.display = 'none';
        if (activeDropdownState && activeDropdownState.triggerEl) {
            activeDropdownState.triggerEl.classList.remove('active');
        }
        activeDropdownState = null;
    }

    // Eventos do campo de busca do dropdown de mapeamento
    const mappingSearchInput = document.getElementById('mapping-dropdown-search');
    const mappingClearBtn = document.getElementById('mapping-dropdown-clear-btn');
    if (mappingSearchInput) {
        mappingSearchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (mappingClearBtn) mappingClearBtn.style.display = val ? 'block' : 'none';
            renderMappingDropdownOptions(val);
        });
        mappingSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const firstOption = document.querySelector('#mapping-dropdown-options .dropdown-option:not(.is-empty-option)');
                if (firstOption) {
                    firstOption.click();
                }
            } else if (e.key === 'Escape') {
                closeMappingDropdown();
            }
        });
    }
    if (mappingClearBtn) {
        mappingClearBtn.addEventListener('click', () => {
            if (mappingSearchInput) {
                mappingSearchInput.value = '';
                mappingClearBtn.style.display = 'none';
                renderMappingDropdownOptions('');
                mappingSearchInput.focus();
            }
        });
    }

    // Fechar dropdown de mapeamento ao clicar fora ou pressionar Escape
    document.addEventListener('click', (e) => {
        if (!activeDropdownState) return;
        const portal = document.getElementById('mapping-dropdown-portal');
        if (portal && (portal.contains(e.target) || activeDropdownState.triggerEl.contains(e.target))) {
            return;
        }
        closeMappingDropdown();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeDropdownState) {
            closeMappingDropdown();
        }
    });

    // Manter o dropdown ancorado ao rolar a página ou redimensionar a janela
    window.addEventListener('scroll', () => {
        if (activeDropdownState) {
            const portal = document.getElementById('mapping-dropdown-portal');
            if (portal && portal.style.display === 'flex') {
                positionMappingDropdown(activeDropdownState.triggerEl, portal);
            }
        }
    }, true);

    window.addEventListener('resize', () => {
        if (activeDropdownState) {
            const portal = document.getElementById('mapping-dropdown-portal');
            if (portal && portal.style.display === 'flex') {
                positionMappingDropdown(activeDropdownState.triggerEl, portal);
            }
        }
    });

    function renderMappingTable() {
        mappingTableBody.innerHTML = '';

        if (!state.mappingList || state.mappingList.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="4" style="text-align: center; color: #64748b; padding: 24px;">
                    Nenhuma coluna associada ainda. Clique no botão <strong>"+ Adicionar Coluna"</strong> acima para mapear.
                </td>
            `;
            mappingTableBody.appendChild(tr);
            updateMappingStateAndHints();
            return;
        }

        state.mappingList.forEach((item) => {
            const tr = document.createElement('tr');
            tr.dataset.id = item.id;
            tr.innerHTML = `
                <td>
                    <div class="searchable-select-trigger mapping-col-a ${item.colA ? 'has-value' : 'is-placeholder'}" data-id="${item.id}" data-type="colA" tabindex="0" title="${escapeHtml(item.colA || 'Clique para pesquisar e selecionar coluna')}">
                        <span class="trigger-text">${escapeHtml(item.colA || 'Selecione a coluna (Base Antiga)...')}</span>
                        <span class="trigger-arrow">▾</span>
                    </div>
                </td>
                <td style="color: #f87f06; text-align: center; font-weight: 800; font-size: 15px;">➔</td>
                <td>
                    <div class="searchable-select-trigger mapping-col-b ${item.colB ? 'has-value' : 'is-placeholder'}" data-id="${item.id}" data-type="colB" tabindex="0" title="${escapeHtml(item.colB || 'Clique para pesquisar e selecionar coluna')}">
                        <span class="trigger-text">${escapeHtml(item.colB || 'Selecione a coluna (Base Nova)...')}</span>
                        <span class="trigger-arrow">▾</span>
                    </div>
                </td>
                <td style="text-align: center;">
                    <button type="button" class="btn-remove-row" data-id="${item.id}" title="Remover mapeamento desta coluna">✕</button>
                </td>
            `;
            mappingTableBody.appendChild(tr);
        });

        // Eventos de clique nos triggers da coluna da esquerda e direita
        mappingTableBody.querySelectorAll('.mapping-col-a').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                openMappingDropdown(trigger.dataset.id, 'colA', trigger);
            });
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    trigger.click();
                }
            });
        });

        mappingTableBody.querySelectorAll('.mapping-col-b').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                openMappingDropdown(trigger.dataset.id, 'colB', trigger);
            });
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    trigger.click();
                }
            });
        });

        // Eventos do botão remover linha
        mappingTableBody.querySelectorAll('.btn-remove-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                state.mappingList = state.mappingList.filter(it => it.id !== id);
                renderMappingTable();
            });
        });

        updateMappingStateAndHints();
    }

    // Botão "+ Adicionar Coluna"
    if (btnAddMapping) {
        btnAddMapping.addEventListener('click', () => {
            let nextA = '';
            let nextB = '';

            // Se NÃO estiver em modo de seleção manual (pós-clique em Limpar Mapeamentos),
            // puxa automaticamente as colunas que estão faltando (igual funcionava antes)
            if (!state.isManualMapping) {
                const usedA = new Set(state.mappingList.map(it => it.colA).filter(Boolean));
                const unusedA = state.columnsA.filter(c => !usedA.has(c));
                nextA = unusedA.length > 0 ? unusedA[0] : '';

                const usedB = new Set(state.mappingList.map(it => it.colB).filter(Boolean));
                const unusedB = state.columnsB.filter(c => !usedB.has(c));
                if (nextA && state.initialMapping && state.initialMapping[nextA] && unusedB.includes(state.initialMapping[nextA])) {
                    nextB = state.initialMapping[nextA];
                } else {
                    nextB = unusedB.length > 0 ? unusedB[0] : '';
                }
            }

            const newItem = {
                id: 'map_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                colA: nextA,
                colB: nextB
            };

            state.mappingList.push(newItem);
            renderMappingTable();

            // Rolar a tabela para a nova linha criada
            const wrapper = document.querySelector('.mapping-table-wrapper');
            if (wrapper) {
                wrapper.scrollTop = wrapper.scrollHeight;
            }

            // Se estiver em modo manual, foca no seletor da nova linha
            if (state.isManualMapping) {
                setTimeout(() => {
                    const newRowTrigger = document.querySelector(`.mapping-col-a[data-id="${newItem.id}"]`);
                    if (newRowTrigger) {
                        newRowTrigger.focus();
                    }
                }, 60);
            }
        });
    }

    // Botão "Restaurar Mapeamento" (fundo verde com ícone de planilha)
    if (btnRestoreMapping) {
        btnRestoreMapping.addEventListener('click', () => {
            // Desativa modo manual para que a adição volte a auto-completar colunas faltantes
            state.isManualMapping = false;

            const sourceMap = (state.initialMapping && Object.keys(state.initialMapping).length > 0)
                ? state.initialMapping
                : (state.mapping || {});

            state.mappingList = Object.entries(sourceMap).map(([colA, colB], idx) => ({
                id: 'map_' + idx + '_' + Math.random().toString(36).substring(2, 7),
                colA: colA,
                colB: colB
            }));

            renderMappingTable();

            // Rolar a tabela para o topo
            const wrapper = document.querySelector('.mapping-table-wrapper');
            if (wrapper) {
                wrapper.scrollTop = 0;
            }
        });
    }

    // ----------------------------------------------------
    // MODAL DE LIMPEZA E SELEÇÃO DE MAPEAMENTOS POR CHECKBOX
    // ----------------------------------------------------
    let modalSelectedCols = new Set();
    let modalAutoPairs = [];

    function openClearMappingModal() {
        if (!modalClearMapping) return;

        // Fecha dropdown de coluna caso esteja aberto
        closeMappingDropdown();

        const sourceMap = (state.initialMapping && Object.keys(state.initialMapping).length > 0)
            ? state.initialMapping
            : (state.mapping || {});

        modalAutoPairs = Object.entries(sourceMap).map(([colA, colB]) => ({ colA, colB }));

        modalSelectedCols.clear();
        const currentlyMappedA = new Set(state.mappingList.map(it => it.colA).filter(Boolean));
        // Se apenas um subconjunto estava selecionado, mantém pré-marcado para facilitar ajustes;
        // se todas estavam mapeadas (estado inicial), inicia desmarcado para o usuário escolher as desejadas.
        if (currentlyMappedA.size > 0 && currentlyMappedA.size < modalAutoPairs.length) {
            modalAutoPairs.forEach(p => {
                if (currentlyMappedA.has(p.colA)) {
                    modalSelectedCols.add(p.colA);
                }
            });
        }

        if (modalSearchInput) modalSearchInput.value = '';
        if (modalSearchClear) modalSearchClear.style.display = 'none';

        renderModalColumnsList('');
        updateModalCounters();

        modalClearMapping.style.display = 'flex';
        requestAnimationFrame(() => {
            modalClearMapping.classList.add('is-open');
        });

        setTimeout(() => {
            if (modalSearchInput) modalSearchInput.focus();
        }, 60);
    }

    function closeClearMappingModal() {
        if (!modalClearMapping) return;
        modalClearMapping.classList.remove('is-open');
        setTimeout(() => {
            modalClearMapping.style.display = 'none';
        }, 200);
    }

    function updateModalCounters() {
        const count = modalSelectedCols.size;
        const total = modalAutoPairs.length;
        if (modalSelectedCount) modalSelectedCount.textContent = count;
        if (modalTotalCount) modalTotalCount.textContent = total;
        if (modalBtnApplyCount) modalBtnApplyCount.textContent = count;
    }

    function renderModalColumnsList(filterText = '') {
        if (!modalColumnsList) return;
        modalColumnsList.innerHTML = '';

        const normFilter = normalizeSearch(filterText);
        const filtered = normFilter
            ? modalAutoPairs.filter(p =>
                normalizeSearch(p.colA).includes(normFilter) ||
                normalizeSearch(p.colB).includes(normFilter)
              )
            : modalAutoPairs;

        if (filtered.length === 0) {
            modalColumnsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b; font-size: 13px;">Nenhuma coluna encontrada para esta pesquisa.</div>';
            return;
        }

        filtered.forEach(pair => {
            const isChecked = modalSelectedCols.has(pair.colA);
            const row = document.createElement('label');
            row.className = 'modal-col-row' + (isChecked ? ' is-checked' : '');
            row.innerHTML = `
                <input type="checkbox" class="modal-col-checkbox" value="${escapeHtml(pair.colA)}" ${isChecked ? 'checked' : ''}>
                <div class="modal-col-pair">
                    <span class="modal-col-a" title="${escapeHtml(pair.colA)}">${escapeHtml(pair.colA)}</span>
                    <span class="modal-col-arrow">➔</span>
                    <span class="modal-col-b" title="${escapeHtml(pair.colB)}">${escapeHtml(pair.colB)}</span>
                </div>
            `;

            const chk = row.querySelector('.modal-col-checkbox');
            chk.addEventListener('change', (e) => {
                if (e.target.checked) {
                    modalSelectedCols.add(pair.colA);
                    row.classList.add('is-checked');
                } else {
                    modalSelectedCols.delete(pair.colA);
                    row.classList.remove('is-checked');
                }
                updateModalCounters();
            });

            modalColumnsList.appendChild(row);
        });
    }

    // Botão "Limpar Mapeamentos" (fundo vermelho com lixeira) -> abre popup
    if (btnClearMapping) {
        btnClearMapping.addEventListener('click', () => {
            openClearMappingModal();
        });
    }

    // Opção 1 do Popup: "Limpar Tudo" (mantém exatamente como funcionava antes ao limpar)
    if (btnModalClearAll) {
        btnModalClearAll.addEventListener('click', () => {
            closeClearMappingModal();

            // Ativa o modo de seleção manual para que as colunas sejam escolhidas na mão
            state.isManualMapping = true;

            state.mappingList = [
                {
                    id: 'map_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                    colA: '',
                    colB: ''
                }
            ];
            renderMappingTable();

            // Rolar a tabela para o topo
            const wrapper = document.querySelector('.mapping-table-wrapper');
            if (wrapper) {
                wrapper.scrollTop = 0;
            }

            // Focar o seletor da primeira linha
            setTimeout(() => {
                const firstTrigger = mappingTableBody.querySelector('.mapping-col-a');
                if (firstTrigger) {
                    firstTrigger.focus();
                }
            }, 60);
        });
    }

    // Opção 2 do Popup: "Aplicar Mapeamento Selecionado" (traz direto o mapeamento automático das colunas marcadas)
    if (btnModalApply) {
        btnModalApply.addEventListener('click', () => {
            if (modalSelectedCols.size === 0) {
                alert('Marque pelo menos uma coluna na lista para manter no mapeamento, ou clique em "Limpar Tudo" acima para esvaziar a tabela.');
                return;
            }

            // Mantém o modo inteligente ativo (se deletar ou adicionar depois, puxa as colunas que faltam)
            state.isManualMapping = false;

            state.mappingList = modalAutoPairs
                .filter(p => modalSelectedCols.has(p.colA))
                .map((p, idx) => ({
                    id: 'map_' + idx + '_' + Math.random().toString(36).substring(2, 7),
                    colA: p.colA,
                    colB: p.colB
                }));

            renderMappingTable();
            closeClearMappingModal();

            const wrapper = document.querySelector('.mapping-table-wrapper');
            if (wrapper) {
                wrapper.scrollTop = 0;
            }
        });
    }

    // Botões Marcar Todas / Desmarcar Todas no Modal
    if (btnModalSelectAll) {
        btnModalSelectAll.addEventListener('click', () => {
            const currentFilter = modalSearchInput ? modalSearchInput.value : '';
            const normFilter = normalizeSearch(currentFilter);
            modalAutoPairs.forEach(p => {
                if (!normFilter || normalizeSearch(p.colA).includes(normFilter) || normalizeSearch(p.colB).includes(normFilter)) {
                    modalSelectedCols.add(p.colA);
                }
            });
            renderModalColumnsList(currentFilter);
            updateModalCounters();
        });
    }

    if (btnModalDeselectAll) {
        btnModalDeselectAll.addEventListener('click', () => {
            const currentFilter = modalSearchInput ? modalSearchInput.value : '';
            const normFilter = normalizeSearch(currentFilter);
            if (!normFilter) {
                modalSelectedCols.clear();
            } else {
                modalAutoPairs.forEach(p => {
                    if (normalizeSearch(p.colA).includes(normFilter) || normalizeSearch(p.colB).includes(normFilter)) {
                        modalSelectedCols.delete(p.colA);
                    }
                });
            }
            renderModalColumnsList(currentFilter);
            updateModalCounters();
        });
    }

    // Busca no Modal
    if (modalSearchInput) {
        modalSearchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (modalSearchClear) modalSearchClear.style.display = val ? 'block' : 'none';
            renderModalColumnsList(val);
        });
    }

    if (modalSearchClear) {
        modalSearchClear.addEventListener('click', () => {
            if (modalSearchInput) {
                modalSearchInput.value = '';
                modalSearchClear.style.display = 'none';
                renderModalColumnsList('');
                modalSearchInput.focus();
            }
        });
    }

    // Fechar Modal (botão X, botão Cancelar, clique no backdrop, tecla Escape)
    if (btnModalClose) {
        btnModalClose.addEventListener('click', closeClearMappingModal);
    }
    if (btnModalCancel) {
        btnModalCancel.addEventListener('click', closeClearMappingModal);
    }
    if (modalClearMapping) {
        modalClearMapping.addEventListener('click', (e) => {
            if (e.target === modalClearMapping) {
                closeClearMappingModal();
            }
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalClearMapping && modalClearMapping.classList.contains('is-open')) {
            closeClearMappingModal();
        }
    });

    // ----------------------------------------------------
    // PASSO 2 -> PASSO 3: RODAR VALIDAÇÃO
    // ----------------------------------------------------
    btnRunCompare.addEventListener('click', async () => {
        // Assegurar sincronização do mapeamento
        const finalMapping = {};
        state.mappingList.forEach(item => {
            if (item.colA && item.colB) {
                finalMapping[item.colA] = item.colB;
            }
        });
        state.mapping = finalMapping;

        const mappedPairsCount = Object.keys(finalMapping).length;
        if (mappedPairsCount === 0) {
            alert('Por favor, selecione e mapeie ao menos um par de colunas (Base Antiga e Base Nova) na tabela para realizar a validação.');
            return;
        }

        const pk = selectPrimaryKey.value;
        if (!pk) {
            alert('Por favor, selecione uma Chave Identificadora Principal na coluna da esquerda.');
            selectPrimaryKey.focus();
            return;
        }

        const pkB = state.mapping[pk] || pk;

        setBtnLoading(btnRunCompare, true, 'Validando e comparando células...');

        const payload = {
            session_id: state.sessionId,
            primary_key_a: pk,
            primary_key_b: pkB,
            secondary_keys_a: state.selectedSecondaryKeys,
            normalize_currency: normCurrency.checked,
            normalize_dates: normDates.checked,
            ignore_case: normCase.checked,
            trim_spaces: normTrim.checked,
            column_mapping: state.mapping
        };

        try {
            const response = await fetch('/api/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Erro durante a validação.');
                setBtnLoading(btnRunCompare, false);
                return;
            }

            state.reportId = data.report_id;
            state.diffRecords = data.diff_preview || [];
            
            // Exibir Resultados
            renderResults(data);

            stepResults.style.display = 'block';
            stepResults.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            console.error(err);
            alert('Erro ao executar a validação: ' + err.message);
        } finally {
            setBtnLoading(btnRunCompare, false);
        }
    });

    // ----------------------------------------------------
    // PASSO 3: RENDERIZAR RESULTADOS
    // ----------------------------------------------------
    function renderResults(data) {
        const s = data.summary;

        // Atualizar KPIs
        kpiRowsMatched.textContent = s.matched_keys_count.toLocaleString('pt-BR');
        kpiRowsTotal.textContent = `de ${s.total_rows_a.toLocaleString('pt-BR')} linhas em A`;

        kpiRowsDiff.textContent = s.different_rows_count.toLocaleString('pt-BR');
        const pctDiff = s.matched_keys_count > 0 ? ((s.different_rows_count / s.matched_keys_count) * 100).toFixed(1) : 0;
        kpiPctDiff.textContent = `${pctDiff}% das linhas`;

        kpiCellsDiff.textContent = s.total_cells_diff.toLocaleString('pt-BR');
        kpiColsDiff.textContent = s.columns_with_differences_count.toLocaleString('pt-BR');
        kpiColsTotal.textContent = `de ${s.total_columns_compared} colunas`;

        if (s.is_identical) {
            // Sucesso Total
            bannerIdentical.style.display = 'flex';
            bannerDiffs.style.display = 'none';
            diffColsSection.style.display = 'none';
            diffTableSection.style.display = 'none';
            if (resultNavTabs) resultNavTabs.style.display = 'none';
            if (financialTableSection) financialTableSection.style.display = 'none';
            btnDownloadExcel.classList.remove('btn-excel');
            btnDownloadExcel.classList.add('btn-success');
        } else {
            // Divergências Encontradas
            bannerIdentical.style.display = 'none';
            bannerDiffs.style.display = 'flex';
            btnDownloadExcel.classList.add('btn-excel');

            // Renderizar Tags de Colunas Divergentes
            diffTagsContainer.innerHTML = '';
            if (data.columns_with_differences) {
                diffColsSection.style.display = 'block';
                for (const [col, count] of Object.entries(data.columns_with_differences)) {
                    const tag = document.createElement('span');
                    tag.className = 'diff-tag';
                    tag.textContent = `${col} (${count.toLocaleString('pt-BR')} linhas)`;
                    diffTagsContainer.appendChild(tag);
                }
            }

            // Preparar dados para a tabela de diferenças
            flattenDiffRows(data.diff_preview);
            renderDiffTable(state.allDiffRows);
            diffTableSection.style.display = 'block';

            // Configurar Abas e Sumarização Financeira
            const fin = s.financial_summary;
            const hasFinancial = fin && fin.items && fin.items.length > 0;
            if (resultNavTabs) {
                resultNavTabs.style.display = 'flex';
                if (badgeDiffCount) badgeDiffCount.textContent = s.different_rows_count.toLocaleString('pt-BR');
                if (tabBtnFinancial) {
                    if (hasFinancial) {
                        tabBtnFinancial.style.display = 'inline-flex';
                        if (badgeFinCount) badgeFinCount.textContent = fin.items.length;
                        renderFinancialTable(fin);
                    } else {
                        tabBtnFinancial.style.display = 'none';
                    }
                }
                // Reseta para a aba de divergências detalhadas ativa
                if (tabBtnDiffs) tabBtnDiffs.classList.add('active');
                if (tabBtnFinancial) tabBtnFinancial.classList.remove('active');
                diffTableSection.style.display = 'block';
                if (financialTableSection) financialTableSection.style.display = 'none';
            }
        }
    }

    function flattenDiffRows(diffPreview) {
        state.allDiffRows = [];
        diffPreview.forEach(rec => {
            const keyStr = rec.secondary_key_val 
                ? `${rec.primary_key_val} [${rec.secondary_key_val}]` 
                : rec.primary_key_val;

            const lineVal = rec.line_display || rec.row_num_a || '-';

            for (const [colA, cDiff] of Object.entries(rec.cell_diffs)) {
                state.allDiffRows.push({
                    key: keyStr,
                    line: lineVal,
                    col: colA,
                    valA: cDiff.val_a_raw,
                    valB: cDiff.val_b_raw
                });
            }
        });
    }

    function renderDiffTable(rows) {
        diffTableBody.innerHTML = '';
        if (rows.length === 0) {
            diffTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">Nenhum registro encontrado para este filtro.</td></tr>`;
            return;
        }

        const maxDisplay = 200;
        const displayRows = rows.slice(0, maxDisplay);

        displayRows.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="key-code">${escapeHtml(item.key)}</span></td>
                <td style="text-align: center;"><span class="badge-line">${escapeHtml(String(item.line))}</span></td>
                <td><strong>${escapeHtml(item.col)}</strong></td>
                <td><span class="cell-diff-old">${escapeHtml(item.valA || '(Vazio)')}</span></td>
                <td class="diff-arrow">➔</td>
                <td><span class="cell-diff-new">${escapeHtml(item.valB || '(Vazio)')}</span></td>
            `;
            diffTableBody.appendChild(tr);
        });
    }

    // Busca rápida na tabela de diferenças
    diffSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderDiffTable(state.allDiffRows);
            return;
        }

        const filtered = state.allDiffRows.filter(r => 
            r.key.toLowerCase().includes(query) ||
            String(r.line).toLowerCase().includes(query) ||
            r.col.toLowerCase().includes(query) ||
            String(r.valA).toLowerCase().includes(query) ||
            String(r.valB).toLowerCase().includes(query)
        );

        renderDiffTable(filtered);
    });

    // ----------------------------------------------------
    // SUMARIZAÇÃO FINANCEIRA E ALTERNÂNCIA DE ABAS
    // ----------------------------------------------------
    function formatMoneyBR(val) {
        if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
        return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function renderFinancialTable(fin) {
        if (!financialTableBody || !fin || !fin.items) return;

        financialTableBody.innerHTML = '';
        fin.items.forEach(item => {
            const tr = document.createElement('tr');
            const isOk = item.status === 'OK';
            const diffClass = isOk ? 'text-success font-bold' : 'text-danger font-bold';
            const statusBadge = isOk 
                ? '<span class="status-badge-ok">OK / Conciliado</span>' 
                : '<span class="status-badge-diff">Divergente</span>';
            const pctText = (item.pct_diff > 0 ? '+' : '') + item.pct_diff.toFixed(2) + '%';

            tr.innerHTML = `
                <td><strong>${escapeHtml(item.col_a)}</strong></td>
                <td><strong>${escapeHtml(item.col_b)}</strong></td>
                <td style="text-align: right; font-family: monospace;">${formatMoneyBR(item.sum_a)}</td>
                <td style="text-align: right; font-family: monospace;">${formatMoneyBR(item.sum_b)}</td>
                <td style="text-align: right; font-family: monospace;" class="${diffClass}">${formatMoneyBR(item.diff)}</td>
                <td style="text-align: center;"><span class="badge-pct ${item.pct_diff !== 0 ? 'pct-alert' : ''}">${pctText}</span></td>
                <td style="text-align: center;">${statusBadge}</td>
                <td style="text-align: center;"><span class="badge-line">${item.diff_count}</span></td>
            `;
            financialTableBody.appendChild(tr);
        });

        if (financialTableFooter) {
            const totalOk = fin.divergent_pairs_count === 0;
            const diffClass = totalOk ? 'text-success font-bold' : 'text-danger font-bold';
            const totalPct = (fin.total_pct_diff > 0 ? '+' : '') + fin.total_pct_diff.toFixed(2) + '%';
            financialTableFooter.innerHTML = `
                <tr class="tfoot-total-row">
                    <td colspan="2"><strong>TOTAL GERAL CONSOLIDADO</strong></td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoneyBR(fin.total_sum_a)}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoneyBR(fin.total_sum_b)}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold;" class="${diffClass}">${formatMoneyBR(fin.total_diff)}</td>
                    <td style="text-align: center; font-weight: bold;">${totalPct}</td>
                    <td style="text-align: center;"><strong>${totalOk ? '100% CONCILIADO' : fin.divergent_pairs_count + ' PAR(ES) COM ERRO'}</strong></td>
                    <td style="text-align: center;">-</td>
                </tr>
            `;
        }
    }

    if (tabBtnDiffs && tabBtnFinancial) {
        tabBtnDiffs.addEventListener('click', () => {
            tabBtnDiffs.classList.add('active');
            tabBtnFinancial.classList.remove('active');
            if (diffTableSection) diffTableSection.style.display = 'block';
            if (financialTableSection) financialTableSection.style.display = 'none';
        });

        tabBtnFinancial.addEventListener('click', () => {
            tabBtnFinancial.classList.add('active');
            tabBtnDiffs.classList.remove('active');
            if (diffTableSection) diffTableSection.style.display = 'none';
            if (financialTableSection) financialTableSection.style.display = 'block';
        });
    }

    // ----------------------------------------------------
    // DOWNLOAD DO RELATÓRIO EXCEL
    // ----------------------------------------------------
    btnDownloadExcel.addEventListener('click', () => {
        if (!state.reportId) {
            alert('Nenhum relatório disponível para download.');
            return;
        }
        window.location.href = `/api/download-report/${state.reportId}`;
    });

    // ----------------------------------------------------
    // REINICIAR VALIDAÇÃO
    // ----------------------------------------------------
    btnRestart.addEventListener('click', () => {
        window.location.reload();
    });
});
