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

    async init() {
        console.log('CodeFileBrowser initializing...');
        
        // Event Listeners binden
        this.bindEvents();
        
        // Monaco Editor laden
        await this.loadMonacoEditor();
        
        // Erste Dateiliste laden
        this.loadFileList('');
    }

    bindEvents() {
        // Toolbar Buttons
        $('#btn-refresh').on('click', () => {
            this.loadFileList(this.currentPath);
        });
        
        $('#btn-hard-refresh').on('click', () => {
            this.clearBrowserCache();
            location.reload(true); // Hard reload
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
        
        // Editor Buttons
        $('#btn-save').on('click', () => {
            this.saveCurrentFile();
        });
        
        $('#btn-fullscreen').on('click', () => {
            this.toggleFullscreen();
        });
        
        $('#btn-close-editor').on('click', () => {
            this.closeEditor();
        });
        
        // Fullscreen Keyboard Shortcut (F11)
        $(document).on('keydown', (e) => {
            if (e.key === 'F11' && this.monacoEditor) {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            // Escape to exit fullscreen
            if (e.key === 'Escape' && this.isFullscreen) {
                this.toggleFullscreen();
            }
        });
        
        // File Filter
        $('#file-filter').on('input', (e) => {
            this.filterFiles(e.target.value);
        });
    }

    async loadMonacoEditor() {
        if (typeof monaco !== 'undefined') {
            console.log('Monaco already loaded');
            return;
        }

        console.log('Loading Monaco Editor (local version)...');
        
        // Prüfe ob Monaco Loader verfügbar ist
        if (typeof MonacoLoader !== 'undefined') {
            return await MonacoLoader.load();
        }
        
        // Fallback: Lade Monaco Loader erst
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/assets/addons/code/monaco-loader.js';
            
            script.onload = async () => {
                try {
                    await MonacoLoader.load();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            script.onerror = () => {
                console.error('Failed to load Monaco Loader - falling back to CDN');
                this.loadMonacoEditorCDN().then(resolve).catch(reject);
            };
            
            document.head.appendChild(script);
        });
    }
    
    // CDN Fallback für Notfälle - Vereinfacht ohne require.js
    async loadMonacoEditorCDN() {
        console.log('Loading Monaco Editor from CDN (fallback)...');
        
        // CSS laden
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/editor/editor.main.css';
        document.head.appendChild(cssLink);
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
            
            script.onload = () => {
                if (typeof require !== 'undefined') {
                    require.config({ 
                        paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } 
                    });
                    
                    require(['vs/editor/editor.main'], () => {
                        console.log('Monaco Editor loaded from CDN');
                        resolve();
                    }, (error) => {
                        console.error('Monaco Editor CDN load failed:', error);
                        reject(new Error('Failed to load Monaco Editor from CDN'));
                    });
                } else {
                    console.error('require.js not available from CDN loader');
                    reject(new Error('require.js not available'));
                }
            };
            
            script.onerror = () => {
                console.error('Failed to load Monaco Editor from CDN');
                reject(new Error('Failed to load Monaco Editor'));
            };
            
            document.head.appendChild(script);
        });
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
                    <td colspan="5" class="text-center text-muted">
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
                    <td>
                        ${item.type === 'file' && this.isEditableFile(item.extension) ? 
                            `<div class="btn-group" role="group">
                                <button class="btn btn-xs btn-primary edit-file-btn" data-path="${item.path}" title="Bearbeiten">
                                    <i class="rex-icon fa-edit"></i>
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
        
        // File Edit Buttons
        $('.edit-file-btn').off('click').on('click', (e) => {
            e.stopPropagation();
            const filePath = $(e.currentTarget).data('path');
            this.openFile(filePath);
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
        
        // Monaco Editor erstellen falls nicht vorhanden
        if (!this.monacoEditor) {
            this.createMonacoEditor();
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

    createMonacoEditor() {
        const container = document.getElementById('monaco-editor');
        if (!container) {
            console.error('Monaco editor container not found');
            return;
        }

        this.monacoEditor = monaco.editor.create(container, {
            theme: 'vs-dark',
            fontSize: 14,
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            lineNumbers: 'on'
        });

        // Change Detection
        this.monacoEditor.onDidChangeModelContent(() => {
            this.setFileModified(true);
        });

        // Keyboard Shortcuts
        this.monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            this.saveCurrentFile();
        });
        
        // F11 für Fullscreen (zusätzlich zu globalem Event Handler)
        this.monacoEditor.addCommand(monaco.KeyCode.F11, () => {
            this.toggleFullscreen();
        });

        console.log('Monaco Editor created');
    }

    showEditor() {
        $('#editor-panel').show();
        
        // Scroll to editor
        $('html, body').animate({
            scrollTop: $('#editor-panel').offset().top - 100
        }, 500);
        
        // Layout update
        setTimeout(() => {
            if (this.monacoEditor) {
                this.monacoEditor.layout();
                this.monacoEditor.focus();
            }
        }, 100);
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
        if (this.isFileModified) {
            if (!confirm('Es gibt ungespeicherte Änderungen. Trotzdem schließen?')) {
                return;
            }
        }
        
        // Fullscreen beenden falls aktiv
        if (this.isFullscreen) {
            this.toggleFullscreen();
        }
        
        $('#editor-panel').hide();
        this.currentFile = null;
        this.setFileModified(false);
        
        if (this.monacoEditor) {
            const model = this.monacoEditor.getModel();
            if (model) {
                model.dispose();
            }
        }
    }
    
    toggleFullscreen() {
        const editorPanel = $('#editor-panel');
        const fullscreenBtn = $('#btn-fullscreen');
        const fullscreenIcon = fullscreenBtn.find('.rex-icon');
        
        if (!this.isFullscreen) {
            // Fullscreen aktivieren
            editorPanel.addClass('editor-fullscreen');
            $('body').addClass('editor-fullscreen-active');
            fullscreenIcon.removeClass('fa-expand').addClass('fa-compress');
            fullscreenBtn.attr('title', 'Vollbild verlassen (ESC)');
            this.isFullscreen = true;
            
            console.log('Fullscreen activated');
        } else {
            // Fullscreen deaktivieren
            editorPanel.removeClass('editor-fullscreen');
            $('body').removeClass('editor-fullscreen-active');
            fullscreenIcon.removeClass('fa-compress').addClass('fa-expand');
            fullscreenBtn.attr('title', 'Vollbild umschalten (F11)');
            this.isFullscreen = false;
            
            console.log('Fullscreen deactivated');
        }
        
        // Monaco Editor Layout neu berechnen nach Fullscreen-Wechsel
        setTimeout(() => {
            if (this.monacoEditor) {
                this.monacoEditor.layout();
                this.monacoEditor.focus();
            }
        }, 100);
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
            'yml': 'fa-file-code-o',
            'yaml': 'fa-file-code-o'
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
            'yml': 'yaml',
            'yaml': 'yaml'
        };
        
        return languageMap[extension] || 'plaintext';
    }

    isEditableFile(extension) {
        const editableExtensions = [
            'php', 'html', 'htm', 'css', 'scss', 'less', 'js', 'json', 'xml', 'sql',
            'md', 'txt', 'yml', 'yaml', 'ini', 'conf', 'htaccess', 'gitignore', 'env'
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

// Global verfügbar machen
window.CodeFileBrowser = CodeFileBrowser;
window.CodeFileSearch = CodeFileSearch;
window.CodeBackupManager = CodeBackupManager;
window.CodeTrashManager = CodeTrashManager;
