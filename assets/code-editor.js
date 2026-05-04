/**
 * Code Editor JavaScript
 * Angepasst an die neue main.php Struktur
 */

class CodeFileBrowser {
    constructor() {
        this.currentPath = '';
        this.currentFile = null;
        this.monacoEditor = null;
        this.isFileModified = false;
        this.pathHistory = [];
        this.isFullscreen = false;
        
        // Cache-Busting für bessere Entwicklererfahrung
        this.clearBrowserCache();
    }
    
    clearBrowserCache() {
        // Browser Cache leeren wenn möglich
        if ('caches' in window) {
            caches.keys().then(function(names) {
                for (let name of names) {
                    caches.delete(name);
                }
            });
        }
        
        // Service Worker Cache leeren
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.update();
                }
            });
        }
    }

    async init(startPath = '') {
        console.log('CodeFileBrowser initializing with path:', startPath);
        
        // Event Listeners binden
        this.bindEvents();
        
        // Monaco Editor laden
        await this.loadMonacoEditor();
        
        // Erste Dateiliste laden
        this.loadFileList(startPath);
        
        // Favoriten laden
        this.loadFavorites();
    }

    bindEvents() {
        // Toolbar Buttons
        $('#btn-new-file').on('click', () => {
            this.createFile('file');
        });
        
        $('#btn-new-folder').on('click', () => {
            this.createFile('folder');
        });
        
        $('#btn-refresh').on('click', () => {
            this.loadFileList(this.currentPath);
        });
        
        $('#btn-hard-refresh').on('click', () => {
            this.clearBrowserCache();
            location.reload(true); // Hard reload
        });

        $('#btn-fix-permissions').on('click', () => {
            this.fixPermissions();
        });
        
        $('#btn-home').on('click', () => {
            this.loadFileList('');
        });
        
        $('#btn-back').on('click', () => {
            if (this.pathHistory.length > 1) {
                this.pathHistory.pop(); // Current path entfernen
                const previousPath = this.pathHistory.pop() || '';
                this.loadFileList(previousPath);
            }
        });
        
        // Favorites Button
        $('#btn-add-favorite').on('click', () => {
            this.addFavorite(this.currentPath);
        });
        
        // Editor Buttons
        $('#btn-save').on('click', () => {
            this.saveCurrentFile();
        });
        
        $('#btn-close-editor, #btn-modal-close').on('click', () => {
            this.closeEditor();
        });

        $('#btn-modal-fullscreen').on('click', () => {
            this.toggleFullscreen();
        });

        // Snippets Toggle Button
        $('#btn-toggle-snippets').on('click', () => {
            this.toggleSnippets();
        });

        // Snippet Search
        $('#snippet-search').on('input', (e) => {
            this.filterSnippets(e.target.value);
        });

        // Theme Switcher Init & Event
        const themeSwitcher = $('#theme-switcher');
        if (themeSwitcher.length) {
            const currentTheme = localStorage.getItem('rex_code_theme') || 'redaxo-dark';
            themeSwitcher.val(currentTheme);
            themeSwitcher.on('change', (e) => {
                const newTheme = e.target.value;
                localStorage.setItem('rex_code_theme', newTheme);
                if (this.monacoEditor) {
                    monaco.editor.setTheme(newTheme);
                }
            });
        }
        
        // Font Size Switcher Init & Event
        const fontsizeSwitcher = $('#fontsize-switcher');
        if (fontsizeSwitcher.length) {
            const currentFontSize = localStorage.getItem('rex_code_fontsize') || '14';
            fontsizeSwitcher.val(currentFontSize);
            fontsizeSwitcher.on('change', (e) => {
                const newFontSize = parseInt(e.target.value);
                localStorage.setItem('rex_code_fontsize', newFontSize.toString());
                
                // Update File-Browser-Editor
                if (this.monacoEditor) {
                    this.monacoEditor.updateOptions({ fontSize: newFontSize });
                }
                
                // Update alle rex-code Editoren
                $('textarea.rex-code').each(function() {
                    const editor = $(this).data('monaco-instance');
                    if (editor) {
                        editor.updateOptions({ fontSize: newFontSize });
                    }
                });
                
                // Update alle Font-Size-Switcher
                $('.fontsize-switcher').val(newFontSize);
            });
        }
        
        // Modal Events für Layout-Refresh
        $('#code-editor-modal').off('shown.bs.modal.code').on('shown.bs.modal.code', () => {
            if (this.monacoEditor) {
                this.monacoEditor.layout();
                this.monacoEditor.focus();
            }
        });

        // Cleanup bei erfolgreichem Schließen
        $('#code-editor-modal').off('hidden.bs.modal.code').on('hidden.bs.modal.code', () => {
            this.currentFile = null;
            this.setFileModified(false);
        });
        
        // File Filter
        $('#file-filter').on('input', (e) => {
            this.filterFiles(e.target.value);
        });
    }

    async loadMonacoEditor() {
        if (typeof monaco !== 'undefined') {
            console.log('Monaco already loaded');
            this.defineREDAXOThemes();
            return;
        }

        console.log('Loading Monaco Editor (local version)...');
        
        // Prüfe ob Monaco Loader verfügbar ist
        if (typeof MonacoLoader !== 'undefined') {
            await MonacoLoader.load();
            this.defineREDAXOThemes();
            return;
        }
        
        // Fallback: Lade Monaco Loader erst
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/assets/addons/code/monaco-loader.js';
            
            script.onload = async () => {
                try {
                    await MonacoLoader.load();
                    this.defineREDAXOThemes();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            script.onerror = () => {
                console.error('Failed to load Monaco Loader (local).');
                reject(new Error('Failed to load Monaco Loader (local). No CDN fallback allowed.'));
            };
            
            document.head.appendChild(script);
        });
    }

    // CDN Code removed for security/privacy reasons
    
    defineREDAXOThemes() {
        if (typeof monaco === 'undefined') return;
        
        // REDAXO Custom Themes definieren
        monaco.editor.defineTheme('redaxo-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', foreground: 'dfe3e9', background: '20262e' },
                { token: 'comment', foreground: '6c7a89', fontStyle: 'italic' },
                { token: 'keyword', foreground: '5bc0de', fontStyle: 'bold' },
                { token: 'string', foreground: 'a8d08d' },
                { token: 'number', foreground: 'f5ab35' },
                { token: 'variable', foreground: '9b59b6' },
                { token: 'function', foreground: '52c6db' },
                { token: 'type', foreground: '3498db' },
                { token: 'class', foreground: 'e67e22' },
                { token: 'operator', foreground: 'e74c3c' },
                { token: 'delimiter', foreground: 'bdc3c7' },
            ],
            colors: {
                'editor.background': '#20262e',
                'editor.foreground': '#dfe3e9',
                'editorLineNumber.foreground': '#6c7a89',
                'editorLineNumber.activeForeground': '#dfe3e9',
                'editor.selectionBackground': '#3b4351',
                'editor.lineHighlightBackground': '#2a313a',
                'editorCursor.foreground': '#5bc0de',
                'editorWhitespace.foreground': '#3b4351',
                'editorIndentGuide.background': '#3b4351',
                'editorIndentGuide.activeBackground': '#6c7a89',
                'editor.selectionHighlightBackground': '#3b435155',
                'editorBracketMatch.background': '#3b435199',
                'editorBracketMatch.border': '#5bc0de',
                'scrollbarSlider.background': '#3b435188',
                'scrollbarSlider.hoverBackground': '#3b4351bb',
                'scrollbarSlider.activeBackground': '#3b4351dd'
            }
        });

        // REDAXO Light Theme definieren
        monaco.editor.defineTheme('redaxo-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: '', foreground: '333333', background: 'f9fcfb' },
                { token: 'comment', foreground: '95a5a6', fontStyle: 'italic' },
                { token: 'keyword', foreground: '2980b9', fontStyle: 'bold' },
                { token: 'string', foreground: '229954' },
                { token: 'number', foreground: 'e67e22' },
                { token: 'variable', foreground: '8e44ad' },
                { token: 'function', foreground: '138d75' },
                { token: 'type', foreground: '3498db' },
                { token: 'class', foreground: 'd35400' },
                { token: 'operator', foreground: 'c0392b' },
                { token: 'delimiter', foreground: '7f8c8d' },
            ],
            colors: {
                'editor.background': '#f9fcfb',
                'editor.foreground': '#333333',
                'editorLineNumber.foreground': '#95a5a6',
                'editorLineNumber.activeForeground': '#333333',
                'editor.selectionBackground': '#d6eaf8',
                'editor.lineHighlightBackground': '#ecf5f2',
                'editorCursor.foreground': '#2980b9',
                'editorWhitespace.foreground': '#ecf5f2',
                'editorIndentGuide.background': '#ecf5f2',
                'editorIndentGuide.activeBackground': '#bdc3c7',
                'editor.selectionHighlightBackground': '#d6eaf855',
                'editorBracketMatch.background': '#d6eaf899',
                'editorBracketMatch.border': '#2980b9',
                'scrollbarSlider.background': '#bdc3c788',
                'scrollbarSlider.hoverBackground': '#bdc3c7bb',
                'scrollbarSlider.activeBackground': '#bdc3c7dd'
            }
        });

        // Bernstein 8-bit Theme – klassischer Phosphor-Bildschirm (Amber CRT)
        monaco.editor.defineTheme('bernstein-8bit', {
            base: 'vs-dark',
            inherit: false,
            rules: [
                { token: '',           foreground: 'ffb000', background: '1a0f00' },
                { token: 'comment',    foreground: '7a4f00', fontStyle: 'italic' },
                { token: 'keyword',    foreground: 'ffd700', fontStyle: 'bold' },
                { token: 'string',     foreground: 'ff8c00' },
                { token: 'number',     foreground: 'ffcc44' },
                { token: 'variable',   foreground: 'ffa500' },
                { token: 'function',   foreground: 'ffd700' },
                { token: 'type',       foreground: 'ffb000' },
                { token: 'class',      foreground: 'ffc200', fontStyle: 'bold' },
                { token: 'operator',   foreground: 'ff6600' },
                { token: 'delimiter',  foreground: 'cc8800' },
                { token: 'tag',        foreground: 'ffd700', fontStyle: 'bold' },
                { token: 'attribute',  foreground: 'ffaa00' },
            ],
            colors: {
                'editor.background':                    '#1a0f00',
                'editor.foreground':                    '#ffb000',
                'editorLineNumber.foreground':          '#7a4f00',
                'editorLineNumber.activeForeground':    '#ffb000',
                'editor.selectionBackground':           '#4d2e00',
                'editor.lineHighlightBackground':       '#261500',
                'editorCursor.foreground':              '#ffb000',
                'editorCursor.background':              '#1a0f00',
                'editorWhitespace.foreground':          '#3d2200',
                'editorIndentGuide.background1':        '#3d2200',
                'editorIndentGuide.activeBackground1':  '#7a4f00',
                'editor.selectionHighlightBackground':  '#4d2e0055',
                'editorBracketMatch.background':        '#4d2e0099',
                'editorBracketMatch.border':            '#ffb000',
                'editorWidget.background':              '#261500',
                'editorWidget.foreground':              '#ffb000',
                'editorWidget.border':                  '#7a4f00',
                'input.background':                     '#261500',
                'input.foreground':                     '#ffb000',
                'input.border':                         '#7a4f00',
                'scrollbarSlider.background':           '#4d2e0088',
                'scrollbarSlider.hoverBackground':      '#7a4f00bb',
                'scrollbarSlider.activeBackground':     '#7a4f00dd',
                'statusBar.background':                 '#261500',
                'statusBar.foreground':                 '#ffb000'
            }
        });

        // AGK – Grüner Phosphor-Monitor (Green CRT)
        monaco.editor.defineTheme('agk', {
            base: 'vs-dark',
            inherit: false,
            rules: [
                { token: '',           foreground: '33ff33', background: '001a00' },
                { token: 'comment',    foreground: '1a6e1a', fontStyle: 'italic' },
                { token: 'keyword',    foreground: '66ff66', fontStyle: 'bold' },
                { token: 'string',     foreground: '00cc44' },
                { token: 'number',     foreground: '99ff99' },
                { token: 'variable',   foreground: '44dd44' },
                { token: 'function',   foreground: '66ff66' },
                { token: 'type',       foreground: '33ff33' },
                { token: 'class',      foreground: '88ff88', fontStyle: 'bold' },
                { token: 'operator',   foreground: '00aa22' },
                { token: 'delimiter',  foreground: '228822' },
                { token: 'tag',        foreground: '66ff66', fontStyle: 'bold' },
                { token: 'attribute',  foreground: '44cc44' },
            ],
            colors: {
                'editor.background':                    '#001a00',
                'editor.foreground':                    '#33ff33',
                'editorLineNumber.foreground':          '#1a6e1a',
                'editorLineNumber.activeForeground':    '#33ff33',
                'editor.selectionBackground':           '#004400',
                'editor.lineHighlightBackground':       '#002200',
                'editorCursor.foreground':              '#33ff33',
                'editorCursor.background':              '#001a00',
                'editorWhitespace.foreground':          '#003300',
                'editorIndentGuide.background1':        '#003300',
                'editorIndentGuide.activeBackground1':  '#1a6e1a',
                'editor.selectionHighlightBackground':  '#00440055',
                'editorBracketMatch.background':        '#00440099',
                'editorBracketMatch.border':            '#33ff33',
                'editorWidget.background':              '#002200',
                'editorWidget.foreground':              '#33ff33',
                'editorWidget.border':                  '#1a6e1a',
                'input.background':                     '#002200',
                'input.foreground':                     '#33ff33',
                'input.border':                         '#1a6e1a',
                'scrollbarSlider.background':           '#00440088',
                'scrollbarSlider.hoverBackground':      '#1a6e1abb',
                'scrollbarSlider.activeBackground':     '#1a6e1add',
                'statusBar.background':                 '#002200',
                'statusBar.foreground':                 '#33ff33'
            }
        });

        // ST – Raumschiff-Terminal (LCARS-inspiriert: Orange/Lila/Blau auf Schwarz)
        monaco.editor.defineTheme('st', {
            base: 'vs-dark',
            inherit: false,
            rules: [
                { token: '',           foreground: 'ff9900', background: '000000' },
                { token: 'comment',    foreground: '664400', fontStyle: 'italic' },
                { token: 'keyword',    foreground: 'cc88ff', fontStyle: 'bold' },
                { token: 'string',     foreground: '66ccff' },
                { token: 'number',     foreground: 'ffcc00' },
                { token: 'variable',   foreground: 'ff6600' },
                { token: 'function',   foreground: '99ccff' },
                { token: 'type',       foreground: 'cc88ff' },
                { token: 'class',      foreground: 'ffaa33', fontStyle: 'bold' },
                { token: 'operator',   foreground: 'ff6600' },
                { token: 'delimiter',  foreground: '996633' },
                { token: 'tag',        foreground: 'cc88ff', fontStyle: 'bold' },
                { token: 'attribute',  foreground: '66ccff' },
            ],
            colors: {
                'editor.background':                    '#000000',
                'editor.foreground':                    '#ff9900',
                'editorLineNumber.foreground':          '#664400',
                'editorLineNumber.activeForeground':    '#ffcc00',
                'editor.selectionBackground':           '#331a00',
                'editor.lineHighlightBackground':       '#190d00',
                'editorCursor.foreground':              '#ffcc00',
                'editorCursor.background':              '#000000',
                'editorWhitespace.foreground':          '#331a00',
                'editorIndentGuide.background1':        '#331a00',
                'editorIndentGuide.activeBackground1':  '#664400',
                'editor.selectionHighlightBackground':  '#331a0055',
                'editorBracketMatch.background':        '#331a0099',
                'editorBracketMatch.border':            '#cc88ff',
                'editorWidget.background':              '#190d00',
                'editorWidget.foreground':              '#ff9900',
                'editorWidget.border':                  '#664400',
                'input.background':                     '#190d00',
                'input.foreground':                     '#ff9900',
                'input.border':                         '#664400',
                'scrollbarSlider.background':           '#33190088',
                'scrollbarSlider.hoverBackground':      '#664400bb',
                'scrollbarSlider.activeBackground':     '#664400dd',
                'statusBar.background':                 '#190d00',
                'statusBar.foreground':                 '#ff9900'
            }
        });

        console.log('REDAXO custom themes defined');
    }
    
    async loadFileList(path = '') {
        console.log('Loading file list for path:', path);
        
        // Loading anzeigen
        $('#file-list').html(`
            <tr>
                <td colspan="5" class="text-center">
                    <i class="rex-icon fa-spinner fa-spin"></i> Lade Dateien...
                </td>
            </tr>
        `);

        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/main&code_api=1&action=list&path=${encodeURIComponent(path)}&_cb=${cacheBuster}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.success) {
                this.currentPath = path;
                this.updatePathHistory(path);
                this.updateBreadcrumb(path);
                this.renderFileList(data.data);
                this.updateBackButton();
            } else {
                throw new Error(data.error || 'Unbekannter Fehler');
            }
            
        } catch (error) {
            console.error('Error loading files:', error);
            $('#file-list').html(`
                <tr>
                    <td colspan="5" class="alert alert-danger">
                        Fehler beim Laden der Dateien: ${error.message}
                    </td>
                </tr>
            `);
        }
    }

    /**
     * Prüft ob eine Datei geschützt ist und nicht gelöscht werden darf
     */
    isProtectedFile(filePath) {
        const fileName = filePath.split('/').pop(); // Dateiname extrahieren
        
        // Liste der geschützten Dateien (muss mit PHP-Code synchron sein)
        const protectedFiles = [
            '.htaccess',
            'index.php',
            'config.yml',
            'config.yaml', 
            '.env',
            '.env.local',
            '.env.production',
            'composer.json',
            'composer.lock',
            'package.json',
            'package-lock.json',
            'yarn.lock',
            'boot.php',
            'install.php',
            'console.php',
            'console',
            'AppPathProvider.php',
            'README.md',
            'LICENSE',
            'robots.txt',
            'sitemap.xml',
            'web.config'
        ];
        
        // Direkte Dateinamen-Überprüfung
        if (protectedFiles.includes(fileName)) {
            return true;
        }
        
        // Pattern-basierte Überprüfung
        const protectedPatterns = [
            /^\.htaccess$/,           // .htaccess-Dateien
            /^index\.php$/,           // index.php-Dateien
            /^config\.(yml|yaml)$/,   // config.yml/yaml-Dateien
            /^\.env/,                 // Alle .env-Dateien
            /^boot\.php$/,            // boot.php-Dateien
            /^install\.php$/,         // install.php-Dateien
            /composer\.(json|lock)$/, // composer-Dateien
            /package(-lock)?\.json$/, // npm/node-Dateien
            /yarn\.lock$/,            // yarn-Dateien
        ];
        
        for (const pattern of protectedPatterns) {
            if (pattern.test(fileName)) {
                return true;
            }
        }
        
        return false;
    }

    renderFileList(files) {
        const fileList = $('#file-list');
        
        if (!files || files.length === 0) {
            fileList.html(`
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        Keine Dateien gefunden
                    </td>
                </tr>
            `);
            return;
        }

        let html = '';
        
        files.forEach(item => {
            const icon = this.getFileIcon(item);
            const size = item.type === 'folder' ? '-' : this.formatFileSize(item.size);
            const ownerGroup = item.owner_group || '-';
            const permissions = item.permissions_octal ? `${item.permissions_octal} (${item.permissions_symbolic || '-'})` : '-';
            const cssClass = item.type === 'folder' ? 'folder-item' : 'file-item';
            const clickable = item.type === 'folder' || this.isEditableFile(item.extension);
            
            html += `
                <tr class="${cssClass} ${clickable ? 'code-file-editable' : 'code-file-readonly'}" 
                    data-path="${item.path}" 
                    data-type="${item.type}"
                    ${clickable ? 'style="cursor: pointer;"' : ''}>
                    <td class="code-file-icon">
                        <i class="rex-icon ${icon}"></i>
                    </td>
                    <td>${this.escapeHtml(item.name)}</td>
                    <td class="file-size">${size}</td>
                    <td>${item.modified || '-'}</td>
                    <td class="file-size">${this.escapeHtml(ownerGroup)}</td>
                    <td class="file-size">${this.escapeHtml(permissions)}</td>
                    <td>
                        ${item.type === 'file' && this.isEditableFile(item.extension) ? 
                            `<div class="btn-group" role="group">
                                <button class="btn btn-xs btn-primary edit-file-btn" data-path="${item.path}" title="Bearbeiten">
                                    <i class="rex-icon fa-edit"></i>
                                </button>
                                <button class="btn btn-xs btn-info copy-file-btn" data-path="${item.path}" title="Kopieren">
                                    <i class="rex-icon fa-copy"></i>
                                </button>
                                ${!this.isProtectedFile(item.path) ? 
                                    `<button class="btn btn-xs btn-danger delete-file-btn" data-path="${item.path}" title="Löschen">
                                        <i class="rex-icon fa-trash"></i>
                                    </button>` : 
                                    `<button class="btn btn-xs btn-secondary" disabled title="Systemdatei - kann nicht gelöscht werden">
                                        <i class="rex-icon fa-lock"></i>
                                    </button>`
                                }
                            </div>` : ''
                        }
                    </td>
                </tr>
            `;
        });
        
        fileList.html(html);
        
        // Event Listeners für Dateien/Ordner
        this.bindFileEvents();
    }

    bindFileEvents() {
        // Folder Navigation
        $('.folder-item.code-file-editable').off('click').on('click', (e) => {
            const path = $(e.currentTarget).data('path');
            this.loadFileList(path);
        });
        
        // File Open (Row Click)
        $('.file-item.code-file-editable').off('click').on('click', (e) => {
            // Prevent if clicked on action buttons
            if ($(e.target).closest('.btn').length > 0) {
                return;
            }
            const filePath = $(e.currentTarget).data('path');
            this.openFile(filePath);
        });
        
        // File Edit Buttons
        $('.edit-file-btn').off('click').on('click', (e) => {
            e.stopPropagation();
            const filePath = $(e.currentTarget).data('path');
            this.openFile(filePath);
        });
        
        // File Copy Buttons
        $('.copy-file-btn').off('click').on('click', (e) => {
            e.stopPropagation();
            const filePath = $(e.currentTarget).data('path');
            this.copyFile(filePath);
        });
        
        // File Delete Buttons
        $('.delete-file-btn').off('click').on('click', (e) => {
            e.stopPropagation();
            const filePath = $(e.currentTarget).data('path');
            this.deleteFile(filePath);
        });
        
        // File Double Click
        $('.file-item.code-file-editable').off('dblclick').on('dblclick', (e) => {
            const filePath = $(e.currentTarget).data('path');
            this.openFile(filePath);
        });
    }

    async openFile(filePath) {
        console.log('Opening file:', filePath);
        
        if (this.isFileModified) {
            if (!confirm('Es gibt ungespeicherte Änderungen. Trotzdem fortfahren?')) {
                return Promise.reject('User cancelled');
            }
        }

        try {
            // Cache-Busting Parameter hinzufügen
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/main&code_api=1&action=read&file=${encodeURIComponent(filePath)}&_cb=${cacheBuster}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.currentFile = data.data;
                this.displayFileInEditor(data.data);
                this.showEditor();
                return Promise.resolve();
            } else {
                alert('Fehler beim Öffnen der Datei: ' + data.error);
                return Promise.reject(data.error);
            }
            
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Fehler beim Öffnen der Datei: ' + error.message);
            return Promise.reject(error);
        }
    }

    displayFileInEditor(fileData) {
        console.log('Displaying file in editor:', fileData.name);
        
        // Monaco Editor erstellen falls nicht vorhanden (nutzt createMonacoEditor mit REDAXO Themes & Toolbar)
        if (!this.monacoEditor) {
            this.createMonacoEditor();
            
            // Cursor Position anzeigen
            this.monacoEditor.onDidChangeCursorPosition((e) => {
                $('#cursor-position').text(`Ln ${e.position.lineNumber}, Col ${e.position.column}`);
            });
        }
        
        // Sprache bestimmen
        const language = this.getMonacoLanguage(fileData.extension);
        
        // Existierendes Model entfernen
        const existingModel = this.monacoEditor.getModel();
        if (existingModel) {
            existingModel.dispose();
        }
        
        // Neues Model erstellen
        const model = monaco.editor.createModel(fileData.content, language);
        this.monacoEditor.setModel(model);
        
        // UI aktualisieren
        $('#current-file-name').text(fileData.name);
        this.setFileModified(false);
    }

    getTheme() {
        return localStorage.getItem('rex_code_theme') || 'vs-dark';
    }

    setTheme(themeName) {
        localStorage.setItem('rex_code_theme', themeName);
        console.log('Theme set to:', themeName);
        if (typeof monaco !== 'undefined') {
            monaco.editor.setTheme(themeName);
        }
    }

    createMonacoEditor() {
        const container = document.getElementById('monaco-editor');
        if (!container) {
            console.error('Monaco editor container not found');
            return;
        }

        // LocalStorage Einstellungen laden
        const currentTheme = localStorage.getItem('rex_code_theme') || 'redaxo-dark';
        const currentFontSize = localStorage.getItem('rex_code_fontsize') || '14';
        const showLineNumbers = localStorage.getItem('rex_code_line_numbers') !== 'false';
        const enableWordWrap = localStorage.getItem('rex_code_word_wrap') !== 'false';
        const showMinimap = localStorage.getItem('rex_code_minimap') === 'true';
        const showWhitespace = localStorage.getItem('rex_code_whitespace') === 'true';
        const showStickyScroll = localStorage.getItem('rex_code_sticky_scroll') !== 'false';

        // REDAXO Themes sind bereits in defineREDAXOThemes() definiert
        
        // Editor erstellen mit localStorage Settings
        this.monacoEditor = monaco.editor.create(container, {
            theme: currentTheme,
            fontSize: parseInt(currentFontSize),
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            minimap: { enabled: showMinimap, showRegionSectionHeaders: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: enableWordWrap ? 'on' : 'off',
            lineNumbers: showLineNumbers ? 'on' : 'off',
            renderWhitespace: showWhitespace ? 'all' : 'none',
            stickyScroll: { enabled: showStickyScroll },
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            inlayHints: { enabled: 'on' }
        });

        // Toolbar für Editor-Optionen hinzufügen
        this.createEditorToolbar();

        // Change Detection
        this.monacoEditor.onDidChangeModelContent(() => {
            this.setFileModified(true);
        });

        // Keyboard Shortcuts
        this.monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            this.saveCurrentFile();
        });
        
        console.log('Monaco Editor created with REDAXO themes and toolbar controls');
    }

    createEditorToolbar() {
        // LocalStorage Einstellungen laden
        const showLineNumbers = localStorage.getItem('rex_code_line_numbers') !== 'false';
        const enableWordWrap = localStorage.getItem('rex_code_word_wrap') !== 'false';
        const showMinimap = localStorage.getItem('rex_code_minimap') === 'true';
        const showWhitespace = localStorage.getItem('rex_code_whitespace') === 'true';
        const showStickyScroll = localStorage.getItem('rex_code_sticky_scroll') !== 'false';

        // Button-States setzen
        $('#toggle-line-numbers').css('opacity', showLineNumbers ? '1' : '0.5');
        $('#toggle-word-wrap').css('opacity', enableWordWrap ? '1' : '0.5');
        $('#toggle-minimap').css('opacity', showMinimap ? '1' : '0.5');
        $('#toggle-whitespace').css('opacity', showWhitespace ? '1' : '0.5');
        $('#toggle-sticky-scroll').css('opacity', showStickyScroll ? '1' : '0.5');

        // Referenz auf Editor für Event-Handler
        const editor = this.monacoEditor;

        // Event-Handler für Toolbar-Buttons
        $('#toggle-line-numbers').off('click').on('click', () => {
            const currentValue = localStorage.getItem('rex_code_line_numbers') !== 'false';
            const newValue = !currentValue;
            localStorage.setItem('rex_code_line_numbers', newValue.toString());
            
            if (editor) {
                editor.updateOptions({
                    lineNumbers: newValue ? 'on' : 'off'
                });
            }
            
            $('#toggle-line-numbers').css('opacity', newValue ? '1' : '0.5');
            console.log('Line numbers:', newValue);
        });

        $('#toggle-word-wrap').off('click').on('click', () => {
            const currentValue = localStorage.getItem('rex_code_word_wrap') !== 'false';
            const newValue = !currentValue;
            localStorage.setItem('rex_code_word_wrap', newValue.toString());
            
            if (editor) {
                editor.updateOptions({
                    wordWrap: newValue ? 'on' : 'off'
                });
            }
            
            $('#toggle-word-wrap').css('opacity', newValue ? '1' : '0.5');
            console.log('Word wrap:', newValue);
        });

        $('#toggle-minimap').off('click').on('click', () => {
            const currentValue = localStorage.getItem('rex_code_minimap') === 'true';
            const newValue = !currentValue;
            localStorage.setItem('rex_code_minimap', newValue.toString());
            
            if (editor) {
                editor.updateOptions({
                    minimap: { enabled: newValue }
                });
            }
            
            $('#toggle-minimap').css('opacity', newValue ? '1' : '0.5');
            console.log('Minimap:', newValue);
        });

        $('#toggle-whitespace').off('click').on('click', () => {
            const currentValue = localStorage.getItem('rex_code_whitespace') === 'true';
            const newValue = !currentValue;
            localStorage.setItem('rex_code_whitespace', newValue.toString());
            
            if (editor) {
                editor.updateOptions({
                    renderWhitespace: newValue ? 'all' : 'none'
                });
            }
            
            $('#toggle-whitespace').css('opacity', newValue ? '1' : '0.5');
            console.log('Whitespace:', newValue);
        });

        $('#toggle-sticky-scroll').off('click').on('click', () => {
            const currentValue = localStorage.getItem('rex_code_sticky_scroll') !== 'false';
            const newValue = !currentValue;
            localStorage.setItem('rex_code_sticky_scroll', newValue.toString());
            
            if (editor) {
                editor.updateOptions({
                    stickyScroll: { enabled: newValue }
                });
            }
            
            $('#toggle-sticky-scroll').css('opacity', newValue ? '1' : '0.5');
            console.log('Sticky scroll:', newValue);
        });
        
        console.log('Editor toolbar initialized');
    }

    showEditor() {
        $('#code-editor-modal').modal('show');
    }

    goToLine(lineNumber) {
        if (!this.monacoEditor) {
            console.error('Monaco editor not available');
            return;
        }

        console.log('Going to line:', lineNumber);
        
        // Zur Zeile springen
        this.monacoEditor.revealLineInCenter(lineNumber);
        this.monacoEditor.setPosition({ lineNumber: lineNumber, column: 1 });
        
        // Zeile für kurze Zeit highlighten
        const model = this.monacoEditor.getModel();
        if (model) {
            const decoration = this.monacoEditor.createDecorationsCollection([
                {
                    range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
                    options: {
                        className: 'highlight-line',
                        isWholeLine: true
                    }
                }
            ]);
            
            // Highlight nach 3 Sekunden entfernen
            setTimeout(() => {
                decoration.clear();
            }, 3000);
        }
        
        this.monacoEditor.focus();
    }

    closeEditor() {
        const modal = $('#code-editor-modal');
        modal.modal('hide');

        // Fallback: Falls Bootstrap-Modal intern hängen bleibt, hart schließen
        setTimeout(() => {
            if (modal.hasClass('in') || modal.is(':visible')) {
                modal.removeClass('in').hide();
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open').css('padding-right', '');
            }
        }, 150);

        // Reset fullscreen state
        if (this.isFullscreen) {
            this.toggleFullscreen();
        }
    }
    
    toggleFullscreen() {
        const modal = $('#code-editor-modal');
        const btn = $('#btn-modal-fullscreen i');
        
        if (!this.isFullscreen) {
            modal.addClass('modal-fullscreen');
            btn.removeClass('fa-expand').addClass('fa-compress');
            this.isFullscreen = true;
        } else {
            modal.removeClass('modal-fullscreen');
            btn.removeClass('fa-compress').addClass('fa-expand');
            this.isFullscreen = false;
        }
        
        // Trigger resize for Monaco
        if (this.monacoEditor) {
            setTimeout(() => {
                this.monacoEditor.layout();
            }, 100);
        }
    }

    async saveCurrentFile() {
        if (!this.currentFile || !this.monacoEditor) {
            console.log('Save aborted: no current file or editor');
            return;
        }

        const content = this.monacoEditor.getValue();
        console.log('Saving file:', this.currentFile.path);
        console.log('Content length:', content.length);
        console.log('Content preview:', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
        
        try {
            const formData = new FormData();
            formData.append('file', this.currentFile.path);
            formData.append('content', content);
            
            console.log('Sending POST request...');
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/main&code_api=1&action=save&_cb=${cacheBuster}`, {
                method: 'POST',
                body: formData,
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                throw new Error('Invalid JSON response: ' + responseText.substring(0, 200));
            }
            
            console.log('Parsed response:', data);
            
            if (data.success) {
                this.setFileModified(false);
                
                // Verification: Re-read the file to confirm it was saved
                console.log('Verifying save by re-reading file...');
                setTimeout(async () => {
                    try {
                        const cacheBuster = Date.now();
                        const verifyResponse = await fetch(`index.php?page=code/main&code_api=1&action=read&file=${encodeURIComponent(this.currentFile.path)}&_cb=${cacheBuster}`, {
                            cache: 'no-cache',
                            headers: {
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            }
                        });
                        const verifyData = await verifyResponse.json();
                        
                        if (verifyData.success) {
                            const savedContent = verifyData.data.content;
                            if (savedContent === content) {
                                console.log('✅ Verification successful: File was actually saved');
                                alert('Datei erfolgreich gespeichert und verifiziert!');
                            } else {
                                console.log('❌ Verification failed: Content differs');
                                console.log('Expected length:', content.length);
                                console.log('Actual length:', savedContent.length);
                                console.log('First 200 chars expected:', content.substring(0, 200));
                                console.log('First 200 chars actual:', savedContent.substring(0, 200));
                                alert('Warnung: Die Datei wurde möglicherweise nicht korrekt gespeichert!');
                            }
                        } else {
                            console.log('❌ Verification failed: Could not re-read file');
                            alert('Warnung: Konnte die gespeicherte Datei nicht zur Verifikation lesen!');
                        }
                    } catch (verifyError) {
                        console.error('Verification error:', verifyError);
                        alert('Datei gespeichert, aber Verifikation fehlgeschlagen.');
                    }
                }, 500); // 500ms delay to ensure file system has processed the write
                
                console.log('Save successful');
            } else {
                throw new Error(data.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Fehler beim Speichern: ' + error.message);
        }
    }

    setFileModified(modified) {
        this.isFileModified = modified;
        const status = $('#file-status');
        
        if (modified) {
            status.text('Geändert').removeClass('saved').addClass('modified');
        } else {
            status.text('Gespeichert').removeClass('modified').addClass('saved');
        }
    }

    updatePathHistory(path) {
        // Vermeidet Duplikate
        if (this.pathHistory[this.pathHistory.length - 1] !== path) {
            this.pathHistory.push(path);
        }
        
        // Begrenzt History auf 50 Einträge
        if (this.pathHistory.length > 50) {
            this.pathHistory.shift();
        }
    }

    updateBreadcrumb(path) {
        const breadcrumb = $('#current-path-breadcrumb');
        
        if (!path) {
            breadcrumb.html('<i class="rex-icon fa-home"></i> Hauptverzeichnis');
            return;
        }
        
        const parts = path.split('/').filter(p => p);
        let html = '<a href="#" class="breadcrumb-home"><i class="rex-icon fa-home"></i> Home</a>';
        let currentPath = '';
        
        parts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            html += ` / <a href="#" class="breadcrumb-part" data-path="${currentPath}">${this.escapeHtml(part)}</a>`;
        });
        
        breadcrumb.html(html);
        
        // Breadcrumb Click Events
        $('.breadcrumb-home').on('click', (e) => {
            e.preventDefault();
            this.loadFileList('');
        });
        
        $('.breadcrumb-part').on('click', (e) => {
            e.preventDefault();
            const path = $(e.target).data('path');
            this.loadFileList(path);
        });
    }

    updateBackButton() {
        const backBtn = $('#btn-back');
        if (this.pathHistory.length > 1) {
            backBtn.prop('disabled', false);
        } else {
            backBtn.prop('disabled', true);
        }
    }

    filterFiles(searchTerm) {
        const rows = $('#file-table tbody tr');
        
        if (!searchTerm) {
            rows.show();
            return;
        }
        
        rows.each((index, row) => {
            const $row = $(row);
            const fileName = $row.find('td:nth-child(2)').text().toLowerCase();
            
            if (fileName.includes(searchTerm.toLowerCase())) {
                $row.show();
            } else {
                $row.hide();
            }
        });
    }

    // Helper Methods
    getFileIcon(item) {
        if (item.type === 'folder') {
            return 'fa-folder';
        }
        
        const iconMap = {
            'php': 'fa-file-code-o',
            'html': 'fa-file-code-o',
            'htm': 'fa-file-code-o',
            'css': 'fa-file-code-o',
            'scss': 'fa-file-code-o',
            'js': 'fa-file-code-o',
            'json': 'fa-file-code-o',
            'xml': 'fa-file-code-o',
            'sql': 'fa-database',
            'md': 'fa-file-text-o',
            'txt': 'fa-file-text-o',
            'csv': 'fa-file-text-o',
            'tsv': 'fa-file-text-o',
            'log': 'fa-file-text-o',
            'rst': 'fa-file-text-o',
            'yml': 'fa-file-code-o',
            'yaml': 'fa-file-code-o',
            'toml': 'fa-file-code-o',
            'cfg': 'fa-file-code-o',
            'properties': 'fa-file-code-o'
        };
        
        return iconMap[item.extension] || 'fa-file-o';
    }

    getMonacoLanguage(extension) {
        const languageMap = {
            'php': 'php',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'js': 'javascript',
            'json': 'json',
            'xml': 'xml',
            'sql': 'sql',
            'md': 'markdown',
            'txt': 'plaintext',
            'csv': 'plaintext',
            'tsv': 'plaintext',
            'log': 'plaintext',
            'rst': 'plaintext',
            'yml': 'yaml',
            'yaml': 'yaml',
            'toml': 'plaintext',
            'cfg': 'plaintext',
            'properties': 'plaintext'
        };
        
        return languageMap[extension] || 'plaintext';
    }

    isEditableFile(extension) {
        const editableExtensions = [
            'php', 'html', 'htm', 'css', 'scss', 'less', 'js', 'json', 'xml', 'sql',
            'md', 'txt', 'csv', 'tsv', 'log', 'rst', 'toml', 'cfg', 'properties',
            'yml', 'yaml', 'ini', 'conf', 'htaccess', 'gitignore', 'env'
        ];
        
        return editableExtensions.includes(extension);
    }

    formatFileSize(sizeString) {
        // sizeString kommt bereits formatiert von der API
        return sizeString || '0 B';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleSnippets() {
        const sidebar = $('#snippets-sidebar');
        const editor = $('#monaco-editor');
        const isVisible = sidebar.hasClass('visible');
        
        if (isVisible) {
            sidebar.removeClass('visible');
            editor.removeClass('with-sidebar');
        } else {
            sidebar.addClass('visible');
            editor.addClass('with-sidebar');
            this.renderSnippets();
        }
        
        // Editor Layout neu berechnen
        if (this.monacoEditor) {
            setTimeout(() => {
                this.monacoEditor.layout();
            }, 350);
        }
    }

    renderSnippets(filter = '') {
        const snippets = this.getSnippets();
        const list = $('#snippets-list');
        list.empty();
        
        const term = filter.toLowerCase();
        
        Object.keys(snippets).forEach(category => {
            const categoryDiv = $('<div class="snippet-category"></div>');
            const categoryTitle = $('<div class="snippet-category-title"></div>').text(category);
            categoryDiv.append(categoryTitle);
            
            let hasVisibleItems = false;
            
            Object.keys(snippets[category]).forEach(name => {
                const code = snippets[category][name];
                
                // Filter anwenden
                if (term && !name.toLowerCase().includes(term) && !category.toLowerCase().includes(term) && !code.toLowerCase().includes(term)) {
                    return;
                }
                
                hasVisibleItems = true;
                
                const item = $('<div class="snippet-item"></div>');
                item.html(`
                    <div class="snippet-item-name">${this.escapeHtml(name)}</div>
                    <div class="snippet-item-preview">${this.escapeHtml(code.substring(0, 50))}${code.length > 50 ? '...' : ''}</div>
                `);
                
                item.on('click', () => {
                    this.insertSnippet(code);
                });
                
                categoryDiv.append(item);
            });
            
            if (hasVisibleItems) {
                list.append(categoryDiv);
            }
        });
        
        if (list.children().length === 0) {
            list.html('<div style="text-align: center; color: #999; padding: 20px;">Keine Snippets gefunden</div>');
        }
    }

    filterSnippets(term) {
        this.renderSnippets(term);
    }

    insertSnippet(code) {
        if (!this.monacoEditor) return;
        
        const position = this.monacoEditor.getPosition();
        this.monacoEditor.executeEdits('snippet', [{
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: code,
            forceMoveMarkers: true
        }]);
        
        this.monacoEditor.focus();
    }

    getSnippets() {
        return {
            'Module': {
                'Value 1': 'REX_VALUE[1]',
                'Value 2': 'REX_VALUE[2]',
                'Value Output (HTML)': 'REX_VALUE[id=1 output=html]',
                'Media 1': 'REX_MEDIA[1]',
                'Link 1': 'REX_LINK[1]',
                'Linklist 1': 'REX_LINKLIST[1]',
                'Is Value Set?': 'if ("REX_VALUE[1]" != "") {\n    \n}'
            },
            'REDAXO Core': {
                'Current Article ID': 'rex_article::getCurrentId()',
                'Current Language ID': 'rex_clang::getCurrentId()',
                'Current User': '$user = rex::getUser();',
                'Is Backend?': 'if (rex::isBackend()) {\n    \n}',
                'Table Prefix': 'rex::getTablePrefix()',
                'Server URL': 'rex::getServer()',
                'Frontend Path': 'rex_path::frontend()',
                'Media Path': 'rex_path::media()',
                'Assets URI': 'rex_url::assets()',
                'Media URI': 'rex_url::media()',
                'DB Query': '$sql = rex_sql::factory();\n$sql->setQuery("SELECT * FROM " . rex::getTable("article") . " WHERE id = :id", ["id" => 1]);',
                'Escape HTML': 'rex_escape($string)'
            },
            'Slice Values (PHP)': {
                'Get Slice by ID': '$slice = rex_article_slice::getArticleSliceById($id);',
                'Value 1': '$slice->getValue(1)',
                'Media 1': '$slice->getMedia(1)',
                'MediaList 1': '$slice->getMediaList(1)',
                'Link 1': '$slice->getLink(1)',
                'LinkList 1': '$slice->getLinkList(1)'
            },
            'Formatting / Intl': {
                'Intl Date (Full)': 'rex_formatter::format(time(), \'intlDate\', [IntlDateFormatter::FULL]);',
                'Intl Date (Short)': 'rex_formatter::format(time(), \'intlDate\', [IntlDateFormatter::SHORT]);',
                'Intl DateTime': 'rex_formatter::format(time(), \'intlDateTime\', [IntlDateFormatter::MEDIUM, IntlDateFormatter::SHORT]);',
                'Custom Strftime': 'rex_formatter::format(time(), \'strftime\', \'%d.%m.%Y\');',
                'Format Number': 'rex_formatter::number(1234.56, [2, \',\', \'.\']);',
                'Format Bytes': 'rex_formatter::bytes($filesize);',
                'Format URL': 'rex_formatter::url($url, [\'target\' => \'_blank\']);',
                'Format Email': 'rex_formatter::email($email);',
                'Truncate Text': 'rex_formatter::truncate($string, [\'length\' => 100, \'etc\' => \'...\']);'
            },
            'Template': {
                'Article Content': 'echo $this->getArticle();',
                'Template Title': 'echo rex_view::title(rex_article::getCurrent()->getName());',
                'Include File': 'include rex_path::assets(\'addons/project/file.php\');'
            },
            'MForm': {
                'Init': 'use FriendsOfRedaxo\\MForm\\MForm;\n\n$mform = MForm::factory();\n// Fields...\necho $mform->show();',
                'Text Input': '$mform->addTextField(1, [\'label\' => \'Label\']);',
                'Textarea': '$mform->addTextAreaField(2, [\'label\' => \'Label\']);',
                'Media Button': '$mform->addMediaField(1, [\'label\' => \'Image\']);',
                'Link Button': '$mform->addLinkField(1, [\'label\' => \'Link\']);',
                'Select': '$mform->addSelectField(1, [\'opt1\' => \'Option 1\'], [\'label\' => \'Select\']);',
                'Checkbox': '$mform->addCheckboxField(1, [1 => \'Active\'], [\'label\' => \'Checkbox\']);',
                'Repeater (New)': '$mform->addRepeaterElement(1, function(MForm $mform) {\n    $mform->addTextField(\'text\', [\'label\' => \'Text\']);\n    $mform->addMediaField(\'media\', [\'label\' => \'Bild\']);\n});'
            },
            'MBlock': {
                'Show': 'echo \FriendsOfRedaxo\MBlock\MBlock::show(1, \'module_key\');',
                'Config Example': 'echo \FriendsOfRedaxo\MBlock\MBlock::show(1, \'module_key\', [\'min\' => 1, \'max\' => 10]);'
            },
            'REX_VALUE': {
                'VALUE Output': 'REX_VALUE[1]',
                'VALUE mit HTML': 'REX_VALUE[id=1 output=html]',
                'VALUE mit PHP': 'REX_VALUE[id=1 output=php]',
                'VALUE isset Check': 'REX_VALUE[id=1 isset=1]',
                'VALUE Input Field': '<input type="text" name="REX_INPUT_VALUE[1]" value="REX_VALUE[1]" />',
                'VALUE Textarea': '<textarea name="REX_INPUT_VALUE[1]">REX_VALUE[1]</textarea>',
                'VALUE Array Input': '<input type="text" name="REX_INPUT_VALUE[1][text1]" />',
                'VALUE via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getValue(1);',
                'VALUE mit prefix/suffix': 'REX_VALUE[id=1 prefix="<p>" suffix="</p>"]',
                'VALUE mit ifempty': 'REX_VALUE[id=1 ifempty="Kein Inhalt"]'
            },
            'REX_MEDIA': {
                'MEDIA Output': 'REX_MEDIA[1]',
                'MEDIA Widget Input': 'REX_MEDIA[id=1 widget=1]',
                'MEDIA mit Preview': 'REX_MEDIA[id=1 widget=1 preview=1]',
                'MEDIA mit Types': 'REX_MEDIA[id=1 widget=1 types=jpg,png,gif]',
                'MEDIA mit Kategorie': 'REX_MEDIA[id=1 widget=1 category=1]',
                'MEDIA field': 'REX_MEDIA[id=1 field=med_description]',
                'MEDIA mimetype': 'REX_MEDIA[id=1 output=mimetype]',
                'MEDIA img Tag': '<img src="/media/REX_MEDIA[1]" alt="Bild" />',
                'MEDIA via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getMedia(1);',
                'MEDIA URL via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getMediaUrl(1);'
            },
            'REX_MEDIALIST': {
                'MEDIALIST Output': 'REX_MEDIALIST[1]',
                'MEDIALIST Widget Input': 'REX_MEDIALIST[id=1 widget=1]',
                'MEDIALIST mit Preview': 'REX_MEDIALIST[id=1 widget=1 preview=1]',
                'MEDIALIST mit Types': 'REX_MEDIALIST[id=1 widget=1 types=jpg,png]',
                'MEDIALIST Loop': '<?php foreach (explode(\',\', \'REX_MEDIALIST[1]\') as $image): ?>\n<img src="/media/<?=$image;?>" alt="Bild" />\n<?php endforeach;?>',
                'MEDIALIST via PHP': '$slice = $this->getCurrentSlice();\n$images = $slice->getMedialist(1);',
                'MEDIALIST Array': '$slice = $this->getCurrentSlice();\n$images = $slice->getMediaListArray(1);'
            },
            'REX_LINK': {
                'LINK Output (ID)': 'REX_LINK[1]',
                'LINK Output (URL)': 'REX_LINK[id=1 output=url]',
                'LINK Widget Input': 'REX_LINK[id=1 widget=1]',
                'LINK mit Kategorie': 'REX_LINK[id=1 widget=1 category=1]',
                'LINK isset Check': 'REX_LINK[id=1 isset=1]',
                'LINK als Anchor': '<a href="REX_LINK[id=1 output=url]">zum Artikel REX_LINK[1]</a>',
                'LINK via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getLink(1);',
                'LINK URL via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getLinkUrl(1);'
            },
            'REX_LINKLIST': {
                'LINKLIST Output': 'REX_LINKLIST[1]',
                'LINKLIST Widget Input': 'REX_LINKLIST[id=1 widget=1]',
                'LINKLIST mit Kategorie': 'REX_LINKLIST[id=1 widget=1 category=1]',
                'LINKLIST isset Check': 'REX_LINKLIST[id=1 isset=1]',
                'LINKLIST Loop': '<?php foreach (explode(\',\', \'REX_LINKLIST[1]\') as $article_id): ?>\n<a href="<?=rex_getUrl($article_id);?>">Artikel <?=$article_id;?></a>\n<?php endforeach;?>',
                'LINKLIST via PHP': '$slice = $this->getCurrentSlice();\n$links = $slice->getLinklist(1);',
                'LINKLIST Array': '$slice = $this->getCurrentSlice();\n$links = $slice->getLinkListArray(1);'
            },
            'REX_ARTICLE': {
                'ARTICLE aktuell': 'REX_ARTICLE[]',
                'ARTICLE per ID': 'REX_ARTICLE[5]',
                'ARTICLE mit ctype': 'REX_ARTICLE[id=5 ctype=1]',
                'ARTICLE mit clang': 'REX_ARTICLE[id=5 clang=2]',
                'ARTICLE field': 'REX_ARTICLE[id=5 field=name]',
                'ARTICLE_ID': 'REX_ARTICLE_ID',
                'ARTICLE via PHP': 'echo rex_article::getCurrent()->getValue(\'name\');',
                'ARTICLE Content': 'echo rex_article::get(5)->getArticle();'
            },
            'REX_CATEGORY': {
                'CATEGORY field': 'REX_CATEGORY[field=name]',
                'CATEGORY per ID': 'REX_CATEGORY[id=5 field=title]',
                'CATEGORY mit clang': 'REX_CATEGORY[id=5 field=name clang=2]',
                'CATEGORY_ID': 'REX_CATEGORY_ID',
                'CATEGORY via PHP': 'echo rex_category::getCurrent()->getName();',
                'CATEGORY Parent': 'echo rex_category::getCurrent()->getParent()->getName();'
            },
            'REX_TEMPLATE': {
                'TEMPLATE per ID': 'REX_TEMPLATE[1]',
                'TEMPLATE per Key': 'REX_TEMPLATE[key=default]',
                'TEMPLATE_ID': 'REX_TEMPLATE_ID',
                'TEMPLATE_KEY': 'REX_TEMPLATE_KEY',
                'TEMPLATE via PHP': '$template = new rex_template(1);\necho $template->getTemplate();',
                'TEMPLATE in Template': 'echo $this->getArticle();'
            },
            'REX_CONFIG': {
                'CONFIG get': 'REX_CONFIG[namespace=core key=server]',
                'CONFIG addon': 'REX_CONFIG[namespace=myAddon key=setting]',
                'CONFIG via PHP': 'echo rex_config::get(\'core\', \'server\');'
            },
            'REX_CLANG': {
                'CLANG_ID': 'REX_CLANG_ID',
                'CLANG field': 'REX_CLANG[id=1 field=name]',
                'CLANG via PHP': 'echo rex_clang::getCurrent()->getName();',
                'CLANG Code': 'echo rex_clang::getCurrent()->getCode();'
            },
            'REX_MODULE/SLICE/CTYPE': {
                'MODULE_ID': 'REX_MODULE_ID',
                'MODULE_KEY': 'REX_MODULE_KEY',
                'SLICE_ID': 'REX_SLICE_ID',
                'CTYPE_ID': 'REX_CTYPE_ID'
            },
            'REX_USER': {
                'USER_ID': 'REX_USER_ID',
                'USER_LOGIN': 'REX_USER_LOGIN',
                'USER via PHP': 'if (rex::getUser()) {\n    echo rex::getUser()->getLogin();\n}'
            },
            'REX_PROPERTY': {
                'PROPERTY core': 'REX_PROPERTY[key=version]',
                'PROPERTY addon': 'REX_PROPERTY[namespace=myAddon key=author]',
                'PROPERTY via PHP': 'echo rex::getProperty(\'version\');'
            },
            'Parameter': {
                'callback': 'REX_VALUE[id=1 callback="myFunction"]',
                'prefix/suffix': 'REX_VALUE[id=1 prefix="<p>" suffix="</p>"]',
                'instead': 'REX_VALUE[id=1 instead="Anderer Text"]',
                'ifempty': 'REX_VALUE[id=1 ifempty="Kein Inhalt"]',
                'Verschachtelt': 'REX_VALUE[prefix=<REX_VALUE[2]> id=1 suffix=</REX_VALUE[2]>]'
            },
        };
    }

    async deleteFile(filePath) {
        console.log('Deleting file:', filePath);
        
        if (!confirm(`Möchten Sie die Datei "${filePath}" wirklich löschen? Sie wird in den Papierkorb verschoben.`)) {
            return;
        }
        
        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/main&code_api=1&action=delete&_cb=${cacheBuster}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: `file=${encodeURIComponent(filePath)}`,
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Delete response:', data);

            if (data.success) {
                alert(data.message || 'Datei erfolgreich in den Papierkorb verschoben!');
                // Dateiliste aktualisieren
                this.loadFileList(this.currentPath);
                
                // Editor schließen falls die gelöschte Datei geöffnet war
                if (this.currentFile === filePath) {
                    this.closeEditor();
                }
            } else {
                throw new Error(data.error || 'Fehler beim Löschen der Datei');
            }

        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Fehler beim Löschen der Datei: ' + error.message);
        }
    }

    async createFile(type = 'file') {
        const name = prompt(type === 'folder' ? 'Ordnername eingeben:' : 'Dateiname eingeben (mit Erweiterung, z.B. test.php):');
        
        if (!name || name.trim() === '') {
            return;
        }

        const trimmedName = name.trim();

        // Prüfe auf ungültige Zeichen
        if (/[\/\\:\*\?"<>\|]/.test(trimmedName)) {
            alert('Der Name enthält ungültige Zeichen. Bitte vermeiden Sie: / \\ : * ? " < > |');
            return;
        }

        try {
            const cacheBuster = Date.now();
            const formData = new FormData();
            formData.append('path', this.currentPath);
            formData.append('name', trimmedName);
            formData.append('type', type);

            const response = await fetch(`index.php?page=code/main&code_api=1&action=create&_cb=${cacheBuster}`, {
                method: 'POST',
                body: formData,
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Create response:', data);

            if (data.success) {
                alert(data.message || (type === 'folder' ? 'Ordner erfolgreich erstellt!' : 'Datei erfolgreich erstellt!'));
                
                // Dateiliste aktualisieren
                this.loadFileList(this.currentPath);
                
                // Bei Datei: Optional automatisch öffnen
                if (type === 'file' && data.path) {
                    setTimeout(() => {
                        if (confirm('Möchten Sie die neue Datei jetzt bearbeiten?')) {
                            this.openFile(data.path);
                        }
                    }, 100);
                }
            } else {
                throw new Error(data.error || 'Fehler beim Erstellen');
            }

        } catch (error) {
            console.error('Error creating:', error);
            alert('Fehler beim Erstellen: ' + error.message);
        }
    }

    async copyFile(filePath) {
        console.log('Copying file:', filePath);
        
        const fileName = filePath.split('/').pop();
        const newName = prompt(`Neuen Namen eingeben (oder leer lassen für automatischen Namen):\n\nOriginal: ${fileName}`, '');
        
        // null = Abbruch, '' = automatischer Name
        if (newName === null) {
            return;
        }

        const trimmedName = newName.trim();

        // Prüfe auf ungültige Zeichen (falls Name angegeben wurde)
        if (trimmedName && /[\/\\:\*\?"<>\|]/.test(trimmedName)) {
            alert('Der Name enthält ungültige Zeichen. Bitte vermeiden Sie: / \\ : * ? " < > |');
            return;
        }

        try {
            const cacheBuster = Date.now();
            const formData = new FormData();
            formData.append('file', filePath);
            if (trimmedName) {
                formData.append('newName', trimmedName);
            }

            const response = await fetch(`index.php?page=code/main&code_api=1&action=copy&_cb=${cacheBuster}`, {
                method: 'POST',
                body: formData,
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Copy response:', data);

            if (data.success) {
                alert(data.message || `Datei erfolgreich kopiert als: ${data.name}`);
                
                // Dateiliste aktualisieren
                this.loadFileList(this.currentPath);
            } else {
                throw new Error(data.error || 'Fehler beim Kopieren');
            }

        } catch (error) {
            console.error('Error copying file:', error);
            alert('Fehler beim Kopieren der Datei: ' + error.message);
        }
    }

    async fixPermissions() {
        const currentPathLabel = this.currentPath || '/';
        const mode = prompt(
            `Dateirechte im Ordner "${currentPathLabel}" korrigieren?\n\n` +
            'Eingabe "r" = rekursiv (inkl. Unterordner)\n' +
            'Eingabe "n" = nur aktueller Ordner (eine Ebene)',
            'r'
        );

        if (mode === null) {
            return;
        }

        const normalizedMode = mode.trim().toLowerCase();
        const recursive = normalizedMode !== 'n';

        if (this.currentPath === '' && recursive) {
            if (!confirm('Achtung: Rekursiv im ROOT kann sehr viele Dateien betreffen. Wirklich fortfahren?')) {
                return;
            }
        }

        try {
            const cacheBuster = Date.now();
            const formData = new FormData();
            formData.append('path', this.currentPath);
            formData.append('recursive', recursive ? '1' : '0');

            const response = await fetch(`index.php?page=code/main&code_api=1&action=fix-permissions&_cb=${cacheBuster}`, {
                method: 'POST',
                body: formData,
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Fehler beim Fixen der Rechte');
            }

            const stats = data.stats || {};
            alert(
                `Rechte korrigiert (${recursive ? 'rekursiv' : 'eine Ebene'}):\n` +
                `Verarbeitet: ${stats.processed ?? 0}\n` +
                `Geändert: ${stats.changed ?? 0}\n` +
                `Fehler: ${stats.failed ?? 0}`
            );

            this.loadFileList(this.currentPath);
        } catch (error) {
            console.error('Error fixing permissions:', error);
            alert('Fehler beim Rechte-Fix: ' + error.message);
        }
    }

    // Favorites Management
    loadFavorites() {
        const favorites = this.getFavorites();
        this.renderFavorites(favorites);
    }

    getFavorites() {
        const stored = localStorage.getItem('rex_code_favorites');
        return stored ? JSON.parse(stored) : [];
    }

    saveFavorites(favorites) {
        localStorage.setItem('rex_code_favorites', JSON.stringify(favorites));
    }

    addFavorite(path) {
        const favorites = this.getFavorites();
        
        // Check if already exists
        if (favorites.some(f => f.path === path)) {
            alert('Dieser Ordner ist bereits in den Favoriten!');
            return;
        }
        
        // Prompt for custom name
        const displayName = path === '' ? 'Root' : path.split('/').pop() || path;
        const customName = prompt('Name für diesen Favoriten:', displayName);
        
        if (customName === null) return; // User cancelled
        
        favorites.push({
            path: path,
            name: customName.trim() || displayName
        });
        
        this.saveFavorites(favorites);
        this.renderFavorites(favorites);
    }

    removeFavorite(path) {
        let favorites = this.getFavorites();
        favorites = favorites.filter(f => f.path !== path);
        this.saveFavorites(favorites);
        this.renderFavorites(favorites);
    }

    renderFavorites(favorites) {
        const list = $('#favorites-list');
        
        if (!favorites || favorites.length === 0) {
            list.html('<span style="color: #999; font-size: 11px;">Keine Favoriten gespeichert</span>');
            return;
        }
        
        list.empty();
        
        favorites.forEach(fav => {
            const item = $('<span class="favorite-item"></span>');
            item.html(`
                <i class="rex-icon fa-folder"></i>
                <span class="fav-name">${this.escapeHtml(fav.name)}</span>
                <i class="rex-icon fa-times remove-favorite" title="Favorit entfernen"></i>
            `);
            
            // Click to navigate
            item.find('.fav-name').on('click', () => {
                this.loadFileList(fav.path);
            });
            
            // Click to remove
            item.find('.remove-favorite').on('click', (e) => {
                e.stopPropagation();
                if (confirm(`Favorit "${fav.name}" entfernen?`)) {
                    this.removeFavorite(fav.path);
                }
            });
            
            list.append(item);
        });
    }
}

/**
 * Code File Search Class
 * Für die Search-Seite
 */
class CodeFileSearch {
    constructor() {
        this.searchResults = [];
    }

    init() {
        console.log('CodeFileSearch initializing...');
        this.bindEvents();
    }

    bindEvents() {
        $('#search-form').on('submit', (e) => {
            e.preventDefault();
            this.performSearch();
        });

        // Enter-Taste im Suchfeld
        $('#search-term').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                this.performSearch();
            }
        });

        // Live-Suche bei längeren Begriffen
        $('#search-term').on('input', (e) => {
            const term = e.target.value.trim();
            if (term.length >= 4) {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.performSearch();
                }, 500);
            }
        });
    }

    async performSearch() {
        const term = $('#search-term').val().trim();
        
        if (term.length < 2) {
            alert('Suchbegriff muss mindestens 2 Zeichen lang sein.');
            return;
        }

        console.log('Performing search for:', term);
        this.showLoading();

        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/search&code_api=1&action=search&term=${encodeURIComponent(term)}&_cb=${cacheBuster}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Search results:', data);

            if (data.success) {
                this.searchResults = data.data;
                this.displayResults(data.data, term);
            } else {
                throw new Error(data.error || 'Suchanfrage fehlgeschlagen');
            }

        } catch (error) {
            console.error('Search error:', error);
            this.showError('Fehler bei der Suche: ' + error.message);
        }
    }

    showLoading() {
        const resultsPanel = $('#search-results');
        const content = $('#search-results-content');
        
        content.html(`
            <div class="search-loading">
                <i class="rex-icon fa-spinner fa-spin"></i> Durchsuche Dateien...
            </div>
        `);
        
        resultsPanel.show();
    }

    showError(message) {
        const content = $('#search-results-content');
        content.html(`
            <div class="alert alert-danger">
                <i class="rex-icon fa-exclamation-triangle"></i> ${message}
            </div>
        `);
    }

    displayResults(results, searchTerm) {
        const resultsPanel = $('#search-results');
        const resultsTitle = $('#results-title');
        const content = $('#search-results-content');

        if (!results || results.length === 0) {
            resultsTitle.text('Keine Ergebnisse gefunden');
            content.html(`
                <div class="no-results">
                    <i class="rex-icon fa-search" style="font-size: 48px; color: #ccc;"></i>
                    <h3>Keine Treffer</h3>
                    <p>Für "${this.escapeHtml(searchTerm)}" wurden keine Ergebnisse gefunden.</p>
                </div>
            `);
            resultsPanel.show();
            return;
        }

        // Statistiken
        const totalMatches = results.reduce((sum, file) => sum + file.matches.length, 0);
        resultsTitle.text(`${totalMatches} Treffer in ${results.length} Dateien`);

        // Ergebnisse rendern
        let html = `
            <div class="search-stats">
                <i class="rex-icon fa-info-circle"></i>
                Gefunden: <strong>${totalMatches}</strong> Treffer in <strong>${results.length}</strong> Dateien
                für den Begriff "<strong>${this.escapeHtml(searchTerm)}</strong>"
            </div>
        `;

        results.forEach(file => {
            html += this.renderFileResult(file, searchTerm);
        });

        content.html(html);
        resultsPanel.show();

        // Event listeners für Dateien öffnen
        this.bindResultEvents();
    }

    renderFileResult(file, searchTerm) {
        // 'path' ist das korrekte Field, 'file' ist für Kompatibilität
        const filePath = file.path || file.file;
        
        let html = `
            <div class="search-result-item">
                <div class="search-result-file-header">
                    <div class="search-result-file" data-file="${filePath}">
                        <i class="rex-icon fa-file-code-o"></i> 
                        <strong>${this.escapeHtml(filePath)}</strong>
                        <span class="badge badge-primary">${file.matches.length} Treffer</span>
                        <button class="btn btn-xs btn-success pull-right" data-file="${filePath}" data-action="open-file">
                            <i class="rex-icon fa-external-link"></i> Im Editor öffnen
                        </button>
                    </div>
                </div>
        `;

        // Alle Matches anzeigen mit Zeilennummer-Links
        file.matches.forEach((match, index) => {
            const highlightedContent = this.highlightSearchTerm(match.content, searchTerm);
            html += `
                <div class="search-result-match" data-file="${filePath}" data-line="${match.line}">
                    <div class="search-result-line-info">
                        <button class="btn btn-xs btn-primary search-line-btn" 
                                data-file="${filePath}" 
                                data-line="${match.line}"
                                title="Zu Zeile ${match.line} springen">
                            <i class="rex-icon fa-arrow-right"></i> Zeile ${match.line}
                        </button>
                    </div>
                    <div class="search-result-content" data-file="${filePath}" data-line="${match.line}">
                        ${highlightedContent}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    highlightSearchTerm(text, searchTerm) {
        const escaped = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    }

    bindResultEvents() {
        // Datei öffnen Button
        $('button[data-action="open-file"]').on('click', (e) => {
            e.stopPropagation();
            const filePath = $(e.currentTarget).data('file');
            this.openFileInEditor(filePath);
        });

        // Zeilen-Button - öffnet Datei und springt zur Zeile
        $('.search-line-btn').on('click', (e) => {
            e.stopPropagation();
            const filePath = $(e.currentTarget).data('file');
            const lineNumber = $(e.currentTarget).data('line');
            this.openFileInEditor(filePath, lineNumber);
        });

        // Content-Bereich - auch zu Zeile springen
        $('.search-result-content').on('click', (e) => {
            const filePath = $(e.currentTarget).data('file');
            const lineNumber = $(e.currentTarget).data('line');
            if (filePath && lineNumber) {
                this.openFileInEditor(filePath, lineNumber);
            }
        });

        // File header - öffnet Datei
        $('.search-result-file').on('click', (e) => {
            if (!$(e.target).is('button') && !$(e.target).parent().is('button')) {
                const filePath = $(e.currentTarget).data('file');
                this.openFileInEditor(filePath);
            }
        });
    }

    openFileInEditor(filePath, lineNumber = null) {
        // Zur Hauptseite wechseln und Datei öffnen
        let url = `index.php?page=code/main&open_file=${encodeURIComponent(filePath)}`;
        if (lineNumber) {
            url += `&line=${lineNumber}`;
        }
        window.location.href = url;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

/**
 * Code Backup Manager Class
 * Für die Backup-Seite
 */
class CodeBackupManager {
    constructor() {
        this.backups = [];
    }

    init() {
        console.log('CodeBackupManager initializing...');
        this.bindEvents();
        this.loadBackups();
    }

    bindEvents() {
        // Cleanup Button
        $('#btnCleanupOld').on('click', (e) => {
            e.preventDefault();
            this.cleanupOldBackups();
        });

        // Delete All Button
        $('#btnDeleteAll').on('click', (e) => {
            e.preventDefault();
            this.deleteAllBackups();
        });
    }

    async loadBackups() {
        console.log('Loading backups...');
        
        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/backups&code_api=1&action=backup-list&_cb=${cacheBuster}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Backup list response:', data);

            if (data.success) {
                this.backups = data.data;
                this.renderBackupList(data.data);
            } else {
                throw new Error(data.error || 'Fehler beim Laden der Backups');
            }

        } catch (error) {
            console.error('Error loading backups:', error);
            this.showError('Fehler beim Laden der Backups: ' + error.message);
        }
    }

    renderBackupList(backups) {
        const backupList = $('#backupList');
        
        if (!backups || backups.length === 0) {
            backupList.html(`
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        Keine Backups vorhanden
                    </td>
                </tr>
            `);
            return;
        }

        let html = '';
        backups.forEach(backup => {
            html += `
                <tr>
                    <td>
                        <i class="rex-icon fa-file-archive-o"></i> 
                        ${this.escapeHtml(backup.name)}
                    </td>
                    <td>${backup.size}</td>
                    <td>${backup.created}</td>
                    <td class="backup-actions">
                        <button class="btn btn-xs btn-success restore-backup-btn" 
                                data-backup="${backup.name}" 
                                title="Backup wiederherstellen">
                            <i class="rex-icon fa-undo"></i> Wiederherstellen
                        </button>
                        <button class="btn btn-xs btn-danger delete-backup-btn" 
                                data-backup="${backup.name}" 
                                title="Backup löschen">
                            <i class="rex-icon fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        backupList.html(html);
        
        // Event Listeners für Backup-Aktionen
        this.bindBackupEvents();
    }

    bindBackupEvents() {
        // Restore Button
        $('.restore-backup-btn').off('click').on('click', (e) => {
            e.preventDefault();
            const backupName = $(e.currentTarget).data('backup');
            this.restoreBackup(backupName);
        });
        
        // Delete Button
        $('.delete-backup-btn').off('click').on('click', (e) => {
            e.preventDefault();
            const backupName = $(e.currentTarget).data('backup');
            this.deleteBackup(backupName);
        });
    }

    async restoreBackup(backupName) {
        if (!confirm(`Möchten Sie das Backup "${backupName}" wirklich wiederherstellen?\\n\\nDies überschreibt die aktuelle Datei!`)) {
            return;
        }

        try {
            const formData = new FormData();
            formData.append('backup', backupName);
            
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/backups&code_api=1&action=backup-restore&_cb=${cacheBuster}`, {
                method: 'POST',
                body: formData,
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            const data = await response.json();
            console.log('Restore response:', data);

            if (data.success) {
                alert('Backup erfolgreich wiederhergestellt!');
                this.loadBackups(); // Liste aktualisieren
            } else {
                throw new Error(data.error || 'Fehler beim Wiederherstellen');
            }

        } catch (error) {
            console.error('Error restoring backup:', error);
            alert('Fehler beim Wiederherstellen: ' + error.message);
        }
    }

    async deleteBackup(backupName) {
        if (!confirm(`Möchten Sie das Backup "${backupName}" wirklich löschen?\\n\\nDieser Vorgang kann nicht rückgängig gemacht werden!`)) {
            return;
        }

        try {
            const formData = new FormData();
            formData.append('backup', backupName);
            
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/backups&code_api=1&action=backup-delete&_cb=${cacheBuster}`, {
                method: 'POST',
                body: formData,
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            const data = await response.json();
            console.log('Delete response:', data);

            if (data.success) {
                alert('Backup erfolgreich gelöscht!');
                this.loadBackups(); // Liste aktualisieren
            } else {
                throw new Error(data.error || 'Fehler beim Löschen');
            }

        } catch (error) {
            console.error('Error deleting backup:', error);
            alert('Fehler beim Löschen: ' + error.message);
        }
    }

    async cleanupOldBackups() {
        if (!confirm('Möchten Sie alle Backups älter als 30 Tage löschen?\\n\\nDieser Vorgang kann nicht rückgängig gemacht werden!')) {
            return;
        }

        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/backups&code_api=1&action=backup-cleanup&_cb=${cacheBuster}`, {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Cleanup response:', data);

            if (data.success) {
                alert(data.message || 'Alte Backups erfolgreich gelöscht!');
                this.loadBackups(); // Liste aktualisieren
            } else {
                throw new Error(data.error || 'Fehler beim Bereinigen');
            }

        } catch (error) {
            console.error('Error cleaning up backups:', error);
            alert('Fehler beim Bereinigen: ' + error.message);
        }
    }

    async deleteAllBackups() {
        if (!confirm('Möchten Sie ALLE Backups löschen?\\n\\nDies löscht wirklich alle Backups unwiderruflich!\\n\\nSind Sie sicher?')) {
            return;
        }

        // Doppelte Bestätigung für diese kritische Aktion
        if (!confirm('LETZTE WARNUNG:\\n\\nAlle Backups werden permanent gelöscht!\\n\\nJetzt wirklich alle Backups löschen?')) {
            return;
        }

        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/backups&code_api=1&action=backup-delete-all&_cb=${cacheBuster}`, {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Delete all response:', data);

            if (data.success) {
                alert(data.message || 'Alle Backups erfolgreich gelöscht!');
                this.loadBackups(); // Liste aktualisieren
            } else {
                throw new Error(data.error || 'Fehler beim Löschen aller Backups');
            }

        } catch (error) {
            console.error('Error deleting all backups:', error);
            alert('Fehler beim Löschen aller Backups: ' + error.message);
        }
    }

    showError(message) {
        const backupList = $('#backupList');
        backupList.html(`
            <tr>
                <td colspan="4" class="alert alert-danger">
                    <i class="rex-icon fa-exclamation-triangle"></i> ${message}
                </td>
            </tr>
        `);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Trash Manager Class
 */
class CodeTrashManager {
    constructor() {
        console.log('CodeTrashManager initialized');
    }

    init() {
        this.bindEvents();
        this.loadTrash();
    }

    bindEvents() {
        // Empty Trash Button
        $('#btnEmptyTrash').on('click', () => {
            if (confirm('Möchten Sie den Papierkorb wirklich leeren? Diese Aktion kann nicht rückgängig gemacht werden!')) {
                this.emptyTrash();
            }
        });
    }

    async loadTrash() {
        console.log('Loading trash files...');
        
        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/backups&code_api=1&action=trash-list&_cb=${cacheBuster}`, {
                method: 'GET',
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Trash response:', data);

            if (data.success) {
                this.renderTrashList(data.data);
            } else {
                throw new Error(data.error || 'Fehler beim Laden des Papierkorbs');
            }

        } catch (error) {
            console.error('Error loading trash:', error);
            this.showError('Fehler beim Laden des Papierkorbs: ' + error.message);
        }
    }

    renderTrashList(trashFiles) {
        const trashList = $('#trashList');
        
        if (!trashFiles || trashFiles.length === 0) {
            trashList.html(`
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="rex-icon fa-info-circle"></i> Papierkorb ist leer
                    </td>
                </tr>
            `);
            return;
        }

        let html = '';
        
        trashFiles.forEach(item => {
            html += `
                <tr>
                    <td>
                        <code>${this.escapeHtml(item.originalPath)}</code>
                    </td>
                    <td class="file-size">${item.size}</td>
                    <td>${item.deleted}</td>
                    <td class="trash-actions">
                        <button class="btn btn-success btn-xs restore-trash-btn" data-trash="${item.name}" title="Wiederherstellen">
                            <i class="rex-icon fa-undo"></i> Wiederherstellen
                        </button>
                        <button class="btn btn-danger btn-xs delete-trash-btn" data-trash="${item.name}" title="Endgültig löschen">
                            <i class="rex-icon fa-times"></i> Löschen
                        </button>
                    </td>
                </tr>
            `;
        });
        
        trashList.html(html);
        
        // Event Listeners für Trash-Aktionen
        this.bindTrashEvents();
    }

    bindTrashEvents() {
        // Restore Buttons
        $('.restore-trash-btn').off('click').on('click', (e) => {
            const trashName = $(e.currentTarget).data('trash');
            this.restoreFromTrash(trashName);
        });
        
        // Delete Buttons
        $('.delete-trash-btn').off('click').on('click', (e) => {
            const trashName = $(e.currentTarget).data('trash');
            if (confirm('Datei endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
                this.deleteFromTrash(trashName);
            }
        });
    }

    async restoreFromTrash(trashName) {
        console.log('Restoring from trash:', trashName);
        
        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/backups&code_api=1&action=trash-restore&_cb=${cacheBuster}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: `trash=${encodeURIComponent(trashName)}`,
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Restore response:', data);

            if (data.success) {
                alert(data.message || 'Datei erfolgreich wiederhergestellt!');
                this.loadTrash(); // Liste aktualisieren
            } else {
                throw new Error(data.error || 'Fehler beim Wiederherstellen der Datei');
            }

        } catch (error) {
            console.error('Error restoring from trash:', error);
            alert('Fehler beim Wiederherstellen der Datei: ' + error.message);
        }
    }

    async deleteFromTrash(trashName) {
        console.log('Deleting from trash:', trashName);
        
        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/backups&code_api=1&action=trash-delete&_cb=${cacheBuster}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: `trash=${encodeURIComponent(trashName)}`,
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Delete trash response:', data);

            if (data.success) {
                alert(data.message || 'Datei endgültig gelöscht!');
                this.loadTrash(); // Liste aktualisieren
            } else {
                throw new Error(data.error || 'Fehler beim Löschen der Datei');
            }

        } catch (error) {
            console.error('Error deleting from trash:', error);
            alert('Fehler beim Löschen der Datei: ' + error.message);
        }
    }

    async emptyTrash() {
        console.log('Emptying trash...');
        
        try {
            const cacheBuster = Date.now();
            const response = await fetch(`index.php?page=code/backups&code_api=1&action=trash-empty&_cb=${cacheBuster}`, {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Empty trash response:', data);

            if (data.success) {
                alert(data.message || 'Papierkorb erfolgreich geleert!');
                this.loadTrash(); // Liste aktualisieren
            } else {
                throw new Error(data.error || 'Fehler beim Leeren des Papierkorbs');
            }

        } catch (error) {
            console.error('Error emptying trash:', error);
            alert('Fehler beim Leeren des Papierkorbs: ' + error.message);
        }
    }

    showError(message) {
        const trashList = $('#trashList');
        trashList.html(`
            <tr>
                <td colspan="4" class="alert alert-danger">
                    <i class="rex-icon fa-exclamation-triangle"></i> ${message}
                </td>
            </tr>
        `);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Code Area Replacer
 * Ersetzt Textareas mit der Klasse .rex-code durch Monaco Editor
 */
class CodeAreaReplacer {
    init() {
        // Stop if be_style codemirror is active
        if (rex.code_addon_codemirror_active) {
            console.log('be_style CodeMirror is active, skipping Monaco replacement for .rex-code');
            return;
        }

        // Ausschlussliste: Diese Textareas sollen NICHT ersetzt werden
        // - .code_disable: Explizit deaktiviert
        // - .mblock-item textarea: In MBlock Repeatern
        // - .mform-repeater-item textarea: In MForm Repeatern
        let areas = $('textarea.rex-code');
        
        // Filtere ausgeschlossene Textareas
        areas = areas.not('.code_disable').filter(function() {
            const $this = $(this);
            
            // Prüfe ob in MBlock Container
            if ($this.closest('.mblock-item').length > 0) {
                console.log('Skipping textarea in MBlock:', $this.attr('name'));
                return false;
            }
            
            // Prüfe ob in MForm Repeater Container
            if ($this.closest('.mform-repeater-item').length > 0) {
                console.log('Skipping textarea in MForm Repeater:', $this.attr('name'));
                return false;
            }
            
            return true;
        });
        
        if (areas.length > 0) {
            console.log('Found ' + areas.length + ' .rex-code textareas after filtering, optimizing...');
            this.loadMonaco().then(() => {
                this.replaceAreas(areas);
            });
        }
    }

    async loadMonaco() {
        if (typeof monaco !== 'undefined') return;
        
        if (typeof MonacoLoader !== 'undefined') {
            return await MonacoLoader.load();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/assets/addons/code/monaco-loader.js';
            script.onload = async () => {
                try {
                    await MonacoLoader.load();
                    resolve();
                } catch(e) {
                    console.error('Monaco Load Error', e);
                    reject(e);
                }
            };
            document.head.appendChild(script);
        });
    }

    getSnippets() {
        return {
            'Module': {
                'Value 1': 'REX_VALUE[1]',
                'Value 2': 'REX_VALUE[2]',
                'Value Output (HTML)': 'REX_VALUE[id=1 output=html]',
                'Media 1': 'REX_MEDIA[1]',
                'Link 1': 'REX_LINK[1]',
                'Linklist 1': 'REX_LINKLIST[1]',
                'Is Value Set?': 'if ("REX_VALUE[1]" != "") {\n    \n}'
            },
            'REDAXO Core': {
                'Current Article ID': 'rex_article::getCurrentId()',
                'Current Language ID': 'rex_clang::getCurrentId()',
                'Current User': '$user = rex::getUser();',
                'Is Backend?': 'if (rex::isBackend()) {\n    \n}',
                'Table Prefix': 'rex::getTablePrefix()',
                'Server URL': 'rex::getServer()',
                'Frontend Path': 'rex_path::frontend()',
                'Media Path': 'rex_path::media()',
                'Assets URI': 'rex_url::assets()',
                'Media URI': 'rex_url::media()',
                'DB Query': '$sql = rex_sql::factory();\n$sql->setQuery("SELECT * FROM " . rex::getTable("article") . " WHERE id = :id", ["id" => 1]);',
                'Escape HTML': 'rex_escape($string)'
            },
            'Slice Values (PHP)': {
                'Get Slice by ID': '$slice = rex_article_slice::getArticleSliceById($id);',
                'Value 1': '$slice->getValue(1)',
                'Media 1': '$slice->getMedia(1)',
                'MediaList 1': '$slice->getMediaList(1)',
                'Link 1': '$slice->getLink(1)',
                'LinkList 1': '$slice->getLinkList(1)'
            },
            'Formatting / Intl': {
                'Intl Date (Full)': 'rex_formatter::format(time(), \'intlDate\', [IntlDateFormatter::FULL]);',
                'Intl Date (Short)': 'rex_formatter::format(time(), \'intlDate\', [IntlDateFormatter::SHORT]);',
                'Intl DateTime': 'rex_formatter::format(time(), \'intlDateTime\', [IntlDateFormatter::MEDIUM, IntlDateFormatter::SHORT]);',
                'Custom Strftime': 'rex_formatter::format(time(), \'strftime\', \'%d.%m.%Y\');',
                'Format Number': 'rex_formatter::number(1234.56, [2, \',\', \'.\']);',
                'Format Bytes': 'rex_formatter::bytes($filesize);',
                'Format URL': 'rex_formatter::url($url, [\'target\' => \'_blank\']);',
                'Format Email': 'rex_formatter::email($email);',
                'Truncate Text': 'rex_formatter::truncate($string, [\'length\' => 100, \'etc\' => \'...\']);'
            },
            'Template': {
                'Article Content': 'echo $this->getArticle();',
                'Template Title': 'echo rex_view::title(rex_article::getCurrent()->getName());',
                'Include File': 'include rex_path::assets(\'addons/project/file.php\');'
            },
            'MForm': {
                'Init': 'use FriendsOfRedaxo\\MForm\\MForm;\n\n$mform = MForm::factory();\n// Fields...\necho $mform->show();',
                'Text Input': '$mform->addTextField(1, [\'label\' => \'Label\']);',
                'Textarea': '$mform->addTextAreaField(2, [\'label\' => \'Label\']);',
                'Media Button': '$mform->addMediaField(1, [\'label\' => \'Image\']);',
                'Link Button': '$mform->addLinkField(1, [\'label\' => \'Link\']);',
                'Select': '$mform->addSelectField(1, [\'opt1\' => \'Option 1\'], [\'label\' => \'Select\']);',
                'Checkbox': '$mform->addCheckboxField(1, [1 => \'Active\'], [\'label\' => \'Checkbox\']);',
                'Repeater (New)': '$mform->addRepeaterElement(1, function(MForm $mform) {\n    $mform->addTextField(\'text\', [\'label\' => \'Text\']);\n    $mform->addMediaField(\'media\', [\'label\' => \'Bild\']);\n});'
            },
            'MBlock': {
                'Show': 'echo \FriendsOfRedaxo\MBlock\MBlock::show(1, \'module_key\');',
                'Config Example': 'echo \FriendsOfRedaxo\MBlock\MBlock::show(1, \'module_key\', [\'min\' => 1, \'max\' => 10]);'
            },
            'REX_VALUE': {
                'VALUE Output': 'REX_VALUE[1]',
                'VALUE mit HTML': 'REX_VALUE[id=1 output=html]',
                'VALUE mit PHP': 'REX_VALUE[id=1 output=php]',
                'VALUE isset Check': 'REX_VALUE[id=1 isset=1]',
                'VALUE Input Field': '<input type="text" name="REX_INPUT_VALUE[1]" value="REX_VALUE[1]" />',
                'VALUE Textarea': '<textarea name="REX_INPUT_VALUE[1]">REX_VALUE[1]</textarea>',
                'VALUE Array Input': '<input type="text" name="REX_INPUT_VALUE[1][text1]" />',
                'VALUE via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getValue(1);',
                'VALUE mit prefix/suffix': 'REX_VALUE[id=1 prefix="<p>" suffix="</p>"]',
                'VALUE mit ifempty': 'REX_VALUE[id=1 ifempty="Kein Inhalt"]'
            },
            'REX_MEDIA': {
                'MEDIA Output': 'REX_MEDIA[1]',
                'MEDIA Widget Input': 'REX_MEDIA[id=1 widget=1]',
                'MEDIA mit Preview': 'REX_MEDIA[id=1 widget=1 preview=1]',
                'MEDIA mit Types': 'REX_MEDIA[id=1 widget=1 types=jpg,png,gif]',
                'MEDIA mit Kategorie': 'REX_MEDIA[id=1 widget=1 category=1]',
                'MEDIA field': 'REX_MEDIA[id=1 field=med_description]',
                'MEDIA mimetype': 'REX_MEDIA[id=1 output=mimetype]',
                'MEDIA img Tag': '<img src="/media/REX_MEDIA[1]" alt="Bild" />',
                'MEDIA via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getMedia(1);',
                'MEDIA URL via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getMediaUrl(1);'
            },
            'REX_MEDIALIST': {
                'MEDIALIST Output': 'REX_MEDIALIST[1]',
                'MEDIALIST Widget Input': 'REX_MEDIALIST[id=1 widget=1]',
                'MEDIALIST mit Preview': 'REX_MEDIALIST[id=1 widget=1 preview=1]',
                'MEDIALIST mit Types': 'REX_MEDIALIST[id=1 widget=1 types=jpg,png]',
                'MEDIALIST Loop': '<?php foreach (explode(\',\', \'REX_MEDIALIST[1]\') as $image): ?>\n<img src="/media/<?=$image;?>" alt="Bild" />\n<?php endforeach;?>',
                'MEDIALIST via PHP': '$slice = $this->getCurrentSlice();\n$images = $slice->getMedialist(1);',
                'MEDIALIST Array': '$slice = $this->getCurrentSlice();\n$images = $slice->getMediaListArray(1);'
            },
            'REX_LINK': {
                'LINK Output (ID)': 'REX_LINK[1]',
                'LINK Output (URL)': 'REX_LINK[id=1 output=url]',
                'LINK Widget Input': 'REX_LINK[id=1 widget=1]',
                'LINK mit Kategorie': 'REX_LINK[id=1 widget=1 category=1]',
                'LINK isset Check': 'REX_LINK[id=1 isset=1]',
                'LINK als Anchor': '<a href="REX_LINK[id=1 output=url]">zum Artikel REX_LINK[1]</a>',
                'LINK via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getLink(1);',
                'LINK URL via PHP': '$slice = $this->getCurrentSlice();\necho $slice->getLinkUrl(1);'
            },
            'REX_LINKLIST': {
                'LINKLIST Output': 'REX_LINKLIST[1]',
                'LINKLIST Widget Input': 'REX_LINKLIST[id=1 widget=1]',
                'LINKLIST mit Kategorie': 'REX_LINKLIST[id=1 widget=1 category=1]',
                'LINKLIST isset Check': 'REX_LINKLIST[id=1 isset=1]',
                'LINKLIST Loop': '<?php foreach (explode(\',\', \'REX_LINKLIST[1]\') as $article_id): ?>\n<a href="<?=rex_getUrl($article_id);?>">Artikel <?=$article_id;?></a>\n<?php endforeach;?>',
                'LINKLIST via PHP': '$slice = $this->getCurrentSlice();\n$links = $slice->getLinklist(1);',
                'LINKLIST Array': '$slice = $this->getCurrentSlice();\n$links = $slice->getLinkListArray(1);'
            },
            'REX_ARTICLE': {
                'ARTICLE aktuell': 'REX_ARTICLE[]',
                'ARTICLE per ID': 'REX_ARTICLE[5]',
                'ARTICLE mit ctype': 'REX_ARTICLE[id=5 ctype=1]',
                'ARTICLE mit clang': 'REX_ARTICLE[id=5 clang=2]',
                'ARTICLE field': 'REX_ARTICLE[id=5 field=name]',
                'ARTICLE_ID': 'REX_ARTICLE_ID',
                'ARTICLE via PHP': 'echo rex_article::getCurrent()->getValue(\'name\');',
                'ARTICLE Content': 'echo rex_article::get(5)->getArticle();'
            },
            'REX_CATEGORY': {
                'CATEGORY field': 'REX_CATEGORY[field=name]',
                'CATEGORY per ID': 'REX_CATEGORY[id=5 field=title]',
                'CATEGORY mit clang': 'REX_CATEGORY[id=5 field=name clang=2]',
                'CATEGORY_ID': 'REX_CATEGORY_ID',
                'CATEGORY via PHP': 'echo rex_category::getCurrent()->getName();',
                'CATEGORY Parent': 'echo rex_category::getCurrent()->getParent()->getName();'
            },
            'REX_TEMPLATE': {
                'TEMPLATE per ID': 'REX_TEMPLATE[1]',
                'TEMPLATE per Key': 'REX_TEMPLATE[key=default]',
                'TEMPLATE_ID': 'REX_TEMPLATE_ID',
                'TEMPLATE_KEY': 'REX_TEMPLATE_KEY',
                'TEMPLATE via PHP': '$template = new rex_template(1);\necho $template->getTemplate();',
                'TEMPLATE in Template': 'echo $this->getArticle();'
            },
            'REX_CONFIG': {
                'CONFIG get': 'REX_CONFIG[namespace=core key=server]',
                'CONFIG addon': 'REX_CONFIG[namespace=myAddon key=setting]',
                'CONFIG via PHP': 'echo rex_config::get(\'core\', \'server\');'
            },
            'REX_CLANG': {
                'CLANG_ID': 'REX_CLANG_ID',
                'CLANG field': 'REX_CLANG[id=1 field=name]',
                'CLANG via PHP': 'echo rex_clang::getCurrent()->getName();',
                'CLANG Code': 'echo rex_clang::getCurrent()->getCode();'
            },
            'REX_MODULE/SLICE/CTYPE': {
                'MODULE_ID': 'REX_MODULE_ID',
                'MODULE_KEY': 'REX_MODULE_KEY',
                'SLICE_ID': 'REX_SLICE_ID',
                'CTYPE_ID': 'REX_CTYPE_ID'
            },
            'REX_USER': {
                'USER_ID': 'REX_USER_ID',
                'USER_LOGIN': 'REX_USER_LOGIN',
                'USER via PHP': 'if (rex::getUser()) {\n    echo rex::getUser()->getLogin();\n}'
            },
            'REX_PROPERTY': {
                'PROPERTY core': 'REX_PROPERTY[key=version]',
                'PROPERTY addon': 'REX_PROPERTY[namespace=myAddon key=author]',
                'PROPERTY via PHP': 'echo rex::getProperty(\'version\');'
            },
            'Parameter': {
                'callback': 'REX_VALUE[id=1 callback="myFunction"]',
                'prefix/suffix': 'REX_VALUE[id=1 prefix="<p>" suffix="</p>"]',
                'instead': 'REX_VALUE[id=1 instead="Anderer Text"]',
                'ifempty': 'REX_VALUE[id=1 ifempty="Kein Inhalt"]',
                'Verschachtelt': 'REX_VALUE[prefix=<REX_VALUE[2]> id=1 suffix=</REX_VALUE[2]>]'
            },
        };
    }

    replaceAreas(areas) {
        areas.each((index, el) => {
            const textarea = $(el);
            if (textarea.data('monaco-initialized') || textarea.closest('.monaco-wrapper').length > 0) return;
            
            // Abmessungen und Attribute
            const height = Math.max(textarea.height(), 400);
            const content = textarea.val();
            
            // Wrapper erstellen
            // Check for Dark Mode (various REDAXO themes)
            const isDark = $('body').hasClass('rex-theme-dark') || $('body').hasClass('rex-is-dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            const toolbarBg = isDark ? '#323e4e' : '#f0f4f9'; // REDAXO Dark colors or light variant
            const toolbarBorder = isDark ? '#3b4351' : '#c1c9d4';
            const selectBg = isDark ? '#20262e' : '#ffffff';
            const selectColor = isDark ? '#dfe3e9' : '#333333';

            const wrapper = $('<div class="monaco-wrapper" style="position:relative; z-index: 10; border: 1px solid ' + toolbarBorder + ';"></div>');
            
            const snippetsHtml = `
                <div style="flex: 1; display: flex; align-items: center; gap: 5px;">
                    <input type="text" class="form-control input-sm snippet-search" placeholder="Suche..." style="height: 24px; padding: 0 5px; font-size: 11px; width: 100px; background-color: ${selectBg}; color: ${selectColor}; border-color: ${toolbarBorder};">
                    <select class="form-control input-sm snippet-selector" style="height: 24px; padding: 0 5px; font-size: 11px; width: auto; max-width: 200px; background-color: ${selectBg}; color: ${selectColor}; border-color: ${toolbarBorder};">
                        <option value="">Snippets...</option>
                    </select>
                </div>
            `;
            
            const toolbar = $(`
                <div class="monaco-toolbar" style="background: ${toolbarBg}; padding: 5px 10px; border-bottom: 1px solid ${toolbarBorder}; display: flex; justify-content: space-between; align-items: center;">
                    ${snippetsHtml}

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="border-left: 1px solid ${toolbarBorder}; height: 16px; margin: 0 5px; opacity: 0.5;"></div>

                        <span style="font-size: 11px; margin-right: 5px; color: ${selectColor}; opacity: 0.7;">Größe:</span>
                        <select class="form-control input-sm fontsize-switcher" style="height: 24px; padding: 0 5px; font-size: 12px; width: auto; background-color: ${selectBg}; color: ${selectColor}; border-color: ${toolbarBorder};">
                            <option value="10">10px</option>
                            <option value="11">11px</option>
                            <option value="12">12px</option>
                            <option value="13">13px</option>
                            <option value="14" selected>14px</option>
                            <option value="15">15px</option>
                            <option value="16">16px</option>
                            <option value="18">18px</option>
                            <option value="20">20px</option>
                            <option value="22">22px</option>
                        </select>

                        <span style="font-size: 11px; margin: 0 5px; color: ${selectColor}; opacity: 0.7;">Theme:</span>
                        <select class="form-control input-sm theme-switcher" style="height: 24px; padding: 0 5px; font-size: 12px; width: auto; background-color: ${selectBg}; color: ${selectColor}; border-color: ${toolbarBorder};">
                            <option value="redaxo-dark">REDAXO Dark</option>
                            <option value="redaxo-light">REDAXO Light</option>
                            <option value="bernstein-8bit">Bernstein 8-bit</option>
                            <option value="agk">AGK</option>
                            <option value="st">ST</option>
                            <option value="vs-dark">Dark</option>
                            <option value="vs">Light</option>
                            <option value="hc-black">High Contrast</option>
                        </select>

                        <div style="border-left: 1px solid ${toolbarBorder}; height: 16px; margin: 0 5px; opacity: 0.5;"></div>

                        <button type="button" class="btn btn-xs toggle-line-numbers" title="Zeilennummern ein/aus" style="height: 24px; padding: 2px 8px; background-color: ${selectBg}; color: ${selectColor}; border-color: ${toolbarBorder};">
                            <i class="fa fa-list-ol"></i>
                        </button>
                        <button type="button" class="btn btn-xs toggle-word-wrap" title="Zeilenumbruch ein/aus" style="height: 24px; padding: 2px 8px; background-color: ${selectBg}; color: ${selectColor}; border-color: ${toolbarBorder};">
                            <i class="fa fa-align-left"></i>
                        </button>
                        <button type="button" class="btn btn-xs toggle-minimap" title="Minimap ein/aus" style="height: 24px; padding: 2px 8px; background-color: ${selectBg}; color: ${selectColor}; border-color: ${toolbarBorder};">
                            <i class="fa fa-map"></i>
                        </button>
                        <button type="button" class="btn btn-xs toggle-whitespace" title="Whitespace anzeigen" style="height: 24px; padding: 2px 8px; background-color: ${selectBg}; color: ${selectColor}; border-color: ${toolbarBorder};">
                            <i class="fa fa-space-shuttle"></i>
                        </button>
                    </div>
                </div>
            `);
            const editorContainer = $(`<div class="monaco-editor-container" style="height: ${height}px; width: 100%;"></div>`);
            
            console.log('Inserting Monaco Toolbar and Editor for', textarea);

            textarea.hide().after(wrapper);
            wrapper.append(toolbar);
            wrapper.append(editorContainer);
            
            // Populate Snippets
            const snippets = this.getSnippets();
                const snippetSelect = toolbar.find('.snippet-selector');
                
                const renderSnippets = (filter = '') => {
                    snippetSelect.empty();
                    snippetSelect.append('<option value="">Snippets...</option>');
                    const term = filter.toLowerCase();

                    Object.keys(snippets).forEach(category => {
                        const group = $('<optgroup label="' + category + '"></optgroup>');
                        let hasOptions = false;

                        Object.keys(snippets[category]).forEach(name => {
                            if (name.toLowerCase().includes(term) || category.toLowerCase().includes(term)) {
                                group.append($('<option>', {
                                    value: snippets[category][name],
                                    text: name
                                }));
                                hasOptions = true;
                            }
                        });
                        
                        if (hasOptions) {
                            snippetSelect.append(group);
                        }
                    });
                };

                renderSnippets();

                toolbar.find('.snippet-search').on('input', function() {
                    renderSnippets($(this).val());
                });
            
            // Theme und Fontsize aus localStorage oder Defaults
            const currentTheme = localStorage.getItem('rex_code_theme') || 'redaxo-dark';
            toolbar.find('.theme-switcher').val(currentTheme);

            const currentFontSize = localStorage.getItem('rex_code_fontsize') || '14';
            toolbar.find('.fontsize-switcher').val(currentFontSize);

            // Editor-Optionen aus localStorage
            const showLineNumbers = localStorage.getItem('rex_code_line_numbers') !== 'off';
            const enableWordWrap = localStorage.getItem('rex_code_word_wrap') !== 'off';
            const showMinimap = localStorage.getItem('rex_code_minimap') === 'on';
            const showWhitespace = localStorage.getItem('rex_code_whitespace') === 'on';

            // Button-States initial setzen
            if (showLineNumbers) toolbar.find('.toggle-line-numbers').addClass('active').css('opacity', '1');
            else toolbar.find('.toggle-line-numbers').css('opacity', '0.5');
            
            if (enableWordWrap) toolbar.find('.toggle-word-wrap').addClass('active').css('opacity', '1');
            else toolbar.find('.toggle-word-wrap').css('opacity', '0.5');
            
            if (showMinimap) toolbar.find('.toggle-minimap').addClass('active').css('opacity', '1');
            else toolbar.find('.toggle-minimap').css('opacity', '0.5');
            
            if (showWhitespace) toolbar.find('.toggle-whitespace').addClass('active').css('opacity', '1');
            else toolbar.find('.toggle-whitespace').css('opacity', '0.5');

            // REDAXO Custom Theme definieren
            monaco.editor.defineTheme('redaxo-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: '', foreground: 'dfe3e9', background: '20262e' },
                    { token: 'comment', foreground: '6c7a89', fontStyle: 'italic' },
                    { token: 'keyword', foreground: '5bc0de', fontStyle: 'bold' },
                    { token: 'string', foreground: 'a8d08d' },
                    { token: 'number', foreground: 'f5ab35' },
                    { token: 'variable', foreground: '9b59b6' },
                    { token: 'function', foreground: '52c6db' },
                    { token: 'type', foreground: '3498db' },
                    { token: 'class', foreground: 'e67e22' },
                    { token: 'operator', foreground: 'e74c3c' },
                    { token: 'delimiter', foreground: 'bdc3c7' },
                ],
                colors: {
                    'editor.background': '#20262e',
                    'editor.foreground': '#dfe3e9',
                    'editorLineNumber.foreground': '#6c7a89',
                    'editorLineNumber.activeForeground': '#dfe3e9',
                    'editor.selectionBackground': '#3b4351',
                    'editor.lineHighlightBackground': '#2a313a',
                    'editorCursor.foreground': '#5bc0de',
                    'editorWhitespace.foreground': '#3b4351',
                    'editorIndentGuide.background': '#3b4351',
                    'editorIndentGuide.activeBackground': '#6c7a89',
                    'editor.selectionHighlightBackground': '#3b435155',
                    'editorBracketMatch.background': '#3b435199',
                    'editorBracketMatch.border': '#5bc0de',
                    'scrollbarSlider.background': '#3b435188',
                    'scrollbarSlider.hoverBackground': '#3b4351bb',
                    'scrollbarSlider.activeBackground': '#3b4351dd'
                }
            });

            // REDAXO Light Theme definieren
            monaco.editor.defineTheme('redaxo-light', {
                base: 'vs',
                inherit: true,
                rules: [
                    { token: '', foreground: '333333', background: 'f9fcfb' },
                    { token: 'comment', foreground: '95a5a6', fontStyle: 'italic' },
                    { token: 'keyword', foreground: '2980b9', fontStyle: 'bold' },
                    { token: 'string', foreground: '229954' },
                    { token: 'number', foreground: 'e67e22' },
                    { token: 'variable', foreground: '8e44ad' },
                    { token: 'function', foreground: '138d75' },
                    { token: 'type', foreground: '3498db' },
                    { token: 'class', foreground: 'd35400' },
                    { token: 'operator', foreground: 'c0392b' },
                    { token: 'delimiter', foreground: '7f8c8d' },
                ],
                colors: {
                    'editor.background': '#f9fcfb',
                    'editor.foreground': '#333333',
                    'editorLineNumber.foreground': '#95a5a6',
                    'editorLineNumber.activeForeground': '#333333',
                    'editor.selectionBackground': '#d6eaf8',
                    'editor.lineHighlightBackground': '#ecf5f2',
                    'editorCursor.foreground': '#2980b9',
                    'editorWhitespace.foreground': '#ecf5f2',
                    'editorIndentGuide.background': '#ecf5f2',
                    'editorIndentGuide.activeBackground': '#bdc3c7',
                    'editor.selectionHighlightBackground': '#d6eaf855',
                    'editorBracketMatch.background': '#d6eaf899',
                    'editorBracketMatch.border': '#2980b9',
                    'scrollbarSlider.background': '#bdc3c788',
                    'scrollbarSlider.hoverBackground': '#bdc3c7bb',
                    'scrollbarSlider.activeBackground': '#bdc3c7dd'
                }
            });

            // Bernstein 8-bit Theme – klassischer Phosphor-Bildschirm (Amber CRT)
            monaco.editor.defineTheme('bernstein-8bit', {
                base: 'vs-dark',
                inherit: false,
                rules: [
                    { token: '',           foreground: 'ffb000', background: '1a0f00' },
                    { token: 'comment',    foreground: '7a4f00', fontStyle: 'italic' },
                    { token: 'keyword',    foreground: 'ffd700', fontStyle: 'bold' },
                    { token: 'string',     foreground: 'ff8c00' },
                    { token: 'number',     foreground: 'ffcc44' },
                    { token: 'variable',   foreground: 'ffa500' },
                    { token: 'function',   foreground: 'ffd700' },
                    { token: 'type',       foreground: 'ffb000' },
                    { token: 'class',      foreground: 'ffc200', fontStyle: 'bold' },
                    { token: 'operator',   foreground: 'ff6600' },
                    { token: 'delimiter',  foreground: 'cc8800' },
                    { token: 'tag',        foreground: 'ffd700', fontStyle: 'bold' },
                    { token: 'attribute',  foreground: 'ffaa00' },
                ],
                colors: {
                    'editor.background':                    '#1a0f00',
                    'editor.foreground':                    '#ffb000',
                    'editorLineNumber.foreground':          '#7a4f00',
                    'editorLineNumber.activeForeground':    '#ffb000',
                    'editor.selectionBackground':           '#4d2e00',
                    'editor.lineHighlightBackground':       '#261500',
                    'editorCursor.foreground':              '#ffb000',
                    'editorCursor.background':              '#1a0f00',
                    'editorWhitespace.foreground':          '#3d2200',
                    'editorIndentGuide.background1':        '#3d2200',
                    'editorIndentGuide.activeBackground1':  '#7a4f00',
                    'editor.selectionHighlightBackground':  '#4d2e0055',
                    'editorBracketMatch.background':        '#4d2e0099',
                    'editorBracketMatch.border':            '#ffb000',
                    'editorWidget.background':              '#261500',
                    'editorWidget.foreground':              '#ffb000',
                    'editorWidget.border':                  '#7a4f00',
                    'input.background':                     '#261500',
                    'input.foreground':                     '#ffb000',
                    'input.border':                         '#7a4f00',
                    'scrollbarSlider.background':           '#4d2e0088',
                    'scrollbarSlider.hoverBackground':      '#7a4f00bb',
                    'scrollbarSlider.activeBackground':     '#7a4f00dd'
                }
            });

            // AGK – Grüner Phosphor-Monitor (Green CRT)
            monaco.editor.defineTheme('agk', {
                base: 'vs-dark',
                inherit: false,
                rules: [
                    { token: '',           foreground: '33ff33', background: '001a00' },
                    { token: 'comment',    foreground: '1a6e1a', fontStyle: 'italic' },
                    { token: 'keyword',    foreground: '66ff66', fontStyle: 'bold' },
                    { token: 'string',     foreground: '00cc44' },
                    { token: 'number',     foreground: '99ff99' },
                    { token: 'variable',   foreground: '44dd44' },
                    { token: 'function',   foreground: '66ff66' },
                    { token: 'type',       foreground: '33ff33' },
                    { token: 'class',      foreground: '88ff88', fontStyle: 'bold' },
                    { token: 'operator',   foreground: '00aa22' },
                    { token: 'delimiter',  foreground: '228822' },
                    { token: 'tag',        foreground: '66ff66', fontStyle: 'bold' },
                    { token: 'attribute',  foreground: '44cc44' },
                ],
                colors: {
                    'editor.background':                    '#001a00',
                    'editor.foreground':                    '#33ff33',
                    'editorLineNumber.foreground':          '#1a6e1a',
                    'editorLineNumber.activeForeground':    '#33ff33',
                    'editor.selectionBackground':           '#004400',
                    'editor.lineHighlightBackground':       '#002200',
                    'editorCursor.foreground':              '#33ff33',
                    'editorCursor.background':              '#001a00',
                    'editorWhitespace.foreground':          '#003300',
                    'editorIndentGuide.background1':        '#003300',
                    'editorIndentGuide.activeBackground1':  '#1a6e1a',
                    'editor.selectionHighlightBackground':  '#00440055',
                    'editorBracketMatch.background':        '#00440099',
                    'editorBracketMatch.border':            '#33ff33',
                    'editorWidget.background':              '#002200',
                    'editorWidget.foreground':              '#33ff33',
                    'editorWidget.border':                  '#1a6e1a',
                    'input.background':                     '#002200',
                    'input.foreground':                     '#33ff33',
                    'input.border':                         '#1a6e1a',
                    'scrollbarSlider.background':           '#00440088',
                    'scrollbarSlider.hoverBackground':      '#1a6e1abb',
                    'scrollbarSlider.activeBackground':     '#1a6e1add'
                }
            });

            // ST – Raumschiff-Terminal (LCARS-inspiriert: Orange/Lila/Blau auf Schwarz)
            monaco.editor.defineTheme('st', {
                base: 'vs-dark',
                inherit: false,
                rules: [
                    { token: '',           foreground: 'ff9900', background: '000000' },
                    { token: 'comment',    foreground: '664400', fontStyle: 'italic' },
                    { token: 'keyword',    foreground: 'cc88ff', fontStyle: 'bold' },
                    { token: 'string',     foreground: '66ccff' },
                    { token: 'number',     foreground: 'ffcc00' },
                    { token: 'variable',   foreground: 'ff6600' },
                    { token: 'function',   foreground: '99ccff' },
                    { token: 'type',       foreground: 'cc88ff' },
                    { token: 'class',      foreground: 'ffaa33', fontStyle: 'bold' },
                    { token: 'operator',   foreground: 'ff6600' },
                    { token: 'delimiter',  foreground: '996633' },
                    { token: 'tag',        foreground: 'cc88ff', fontStyle: 'bold' },
                    { token: 'attribute',  foreground: '66ccff' },
                ],
                colors: {
                    'editor.background':                    '#000000',
                    'editor.foreground':                    '#ff9900',
                    'editorLineNumber.foreground':          '#664400',
                    'editorLineNumber.activeForeground':    '#ffcc00',
                    'editor.selectionBackground':           '#331a00',
                    'editor.lineHighlightBackground':       '#190d00',
                    'editorCursor.foreground':              '#ffcc00',
                    'editorCursor.background':              '#000000',
                    'editorWhitespace.foreground':          '#331a00',
                    'editorIndentGuide.background1':        '#331a00',
                    'editorIndentGuide.activeBackground1':  '#664400',
                    'editor.selectionHighlightBackground':  '#331a0055',
                    'editorBracketMatch.background':        '#331a0099',
                    'editorBracketMatch.border':            '#cc88ff',
                    'editorWidget.background':              '#190d00',
                    'editorWidget.foreground':              '#ff9900',
                    'editorWidget.border':                  '#664400',
                    'input.background':                     '#190d00',
                    'input.foreground':                     '#ff9900',
                    'input.border':                         '#664400',
                    'scrollbarSlider.background':           '#33190088',
                    'scrollbarSlider.hoverBackground':      '#664400bb',
                    'scrollbarSlider.activeBackground':     '#664400dd'
                }
            });

            // Sprache ermitteln (Default: PHP/HTML Mix)
            let language = 'php';
            if (textarea.hasClass('rex-code-css')) language = 'css';
            if (textarea.hasClass('rex-code-js')) language = 'javascript';
            if (textarea.hasClass('rex-code-html')) language = 'html';
            if (textarea.hasClass('rex-code-sql')) language = 'sql';
            if (textarea.hasClass('rex-code-json')) language = 'json';
            
            // Editor erstellen
            const editor = monaco.editor.create(editorContainer[0], {
                value: content,
                language: language,
                theme: currentTheme,
                fontSize: parseInt(currentFontSize),
                automaticLayout: true,
                minimap: { enabled: showMinimap },
                scrollBeyondLastLine: false,
                lineNumbers: showLineNumbers ? 'on' : 'off',
                wordWrap: enableWordWrap ? 'on' : 'off',
                renderWhitespace: showWhitespace ? 'all' : 'none',
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true, indentation: true },
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                inlayHints: { enabled: 'on' }
            });

            // Theme Switcher Event
            toolbar.find('.theme-switcher').on('change', (e) => {
                const newTheme = e.target.value;
                localStorage.setItem('rex_code_theme', newTheme);
                monaco.editor.setTheme(newTheme);
                // Update all other switchers
                $('.monaco-toolbar .theme-switcher').val(newTheme);
            });

            // Font Size Switcher Event
            toolbar.find('.fontsize-switcher').on('change', (e) => {
                const newFontSize = parseInt(e.target.value);
                localStorage.setItem('rex_code_fontsize', newFontSize.toString());
                
                // Update aktuellen Editor
                editor.updateOptions({ fontSize: newFontSize });
                
                // Update alle anderen rex-code Editoren
                $('textarea.rex-code').each(function() {
                    const editorInstance = $(this).data('monaco-instance');
                    if (editorInstance && editorInstance !== editor) {
                        editorInstance.updateOptions({ fontSize: newFontSize });
                    }
                });
                
                // Update File-Browser-Editor falls vorhanden
                if (window.codeFileBrowser && window.codeFileBrowser.monacoEditor) {
                    window.codeFileBrowser.monacoEditor.updateOptions({ fontSize: newFontSize });
                }
                
                // Update alle Font-Size-Switcher
                $('.fontsize-switcher').val(newFontSize);
            });

            // Snippet Insert Event
            toolbar.find('.snippet-selector').on('change', (e) => {
                    const text = e.target.value;
                    if (!text) return;

                    const position = editor.getPosition();
                    editor.executeEdits('snippet', [{
                        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                        text: text,
                        forceMoveMarkers: true
                    }]);
                    
                    editor.focus();
                    // Reset select
                    $(e.target).val('');
                });

            // Toggle Line Numbers
            toolbar.find('.toggle-line-numbers').on('click', function() {
                const $btn = $(this);
                const isActive = $btn.hasClass('active');
                const newValue = !isActive;
                
                localStorage.setItem('rex_code_line_numbers', newValue ? 'on' : 'off');
                editor.updateOptions({ lineNumbers: newValue ? 'on' : 'off' });
                
                if (newValue) {
                    $btn.addClass('active').css('opacity', '1');
                } else {
                    $btn.removeClass('active').css('opacity', '0.5');
                }
            });

            // Toggle Word Wrap
            toolbar.find('.toggle-word-wrap').on('click', function() {
                const $btn = $(this);
                const isActive = $btn.hasClass('active');
                const newValue = !isActive;
                
                localStorage.setItem('rex_code_word_wrap', newValue ? 'on' : 'off');
                editor.updateOptions({ wordWrap: newValue ? 'on' : 'off' });
                
                if (newValue) {
                    $btn.addClass('active').css('opacity', '1');
                } else {
                    $btn.removeClass('active').css('opacity', '0.5');
                }
            });

            // Toggle Minimap
            toolbar.find('.toggle-minimap').on('click', function() {
                const $btn = $(this);
                const isActive = $btn.hasClass('active');
                const newValue = !isActive;
                
                localStorage.setItem('rex_code_minimap', newValue ? 'on' : 'off');
                editor.updateOptions({ minimap: { enabled: newValue } });
                
                if (newValue) {
                    $btn.addClass('active').css('opacity', '1');
                } else {
                    $btn.removeClass('active').css('opacity', '0.5');
                }
            });

            // Toggle Whitespace
            toolbar.find('.toggle-whitespace').on('click', function() {
                const $btn = $(this);
                const isActive = $btn.hasClass('active');
                const newValue = !isActive;
                
                localStorage.setItem('rex_code_whitespace', newValue ? 'on' : 'off');
                editor.updateOptions({ renderWhitespace: newValue ? 'all' : 'none' });
                
                if (newValue) {
                    $btn.addClass('active').css('opacity', '1');
                } else {
                    $btn.removeClass('active').css('opacity', '0.5');
                }
            });

            // Sync on Change
            editor.onDidChangeModelContent(() => {
                textarea.val(editor.getValue());
                // Trigger change event on textarea for other listeners
                textarea.trigger('change');
            });

            textarea.data('monaco-initialized', true);
            textarea.data('monaco-instance', editor);
            
            // Resize Observer für responsive Anpassung
            if (window.ResizeObserver) {
                const resizeObserver = new ResizeObserver(() => {
                    editor.layout();
                });
                resizeObserver.observe(editorContainer[0]);
            }
        });
    }
}

// Global verfügbar machen
window.CodeFileBrowser = CodeFileBrowser;
window.CodeFileSearch = CodeFileSearch;
window.CodeBackupManager = CodeBackupManager;
window.CodeTrashManager = CodeTrashManager;
window.CodeAreaReplacer = CodeAreaReplacer;

// Globale Instanz für File Browser
window.codeFileBrowser = null;

// Config-Helper: Liest rex.jsProperties (aus PHP gesetzt)
function getCodeConfig(key, defaultValue) {
    if (typeof rex !== 'undefined' && rex.jsProperties && typeof rex.jsProperties['code_' + key] !== 'undefined') {
        return rex.jsProperties['code_' + key];
    }
    return defaultValue;
}

// Auto-Init für Replacer (nur wenn aktiviert)
$(document).on("rex:ready", function() {
    const replaceRexCode = getCodeConfig('replace_rex_code', '1') === '1';
    
    if (replaceRexCode && typeof CodeAreaReplacer !== "undefined") {
        new CodeAreaReplacer().init();
    }
});
