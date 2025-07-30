<?php

// Nur für Admins verfügbar
if (!rex::getUser()->isAdmin()) {
    echo rex_view::error('Nur für Administratoren verfügbar');
    return;
}

// Hauptcontainer im NextCloud-Stil
$content = '
<div class="code-editor-container">
    <div class="panel panel-default">
        <header class="panel-heading">
            <div class="panel-title">
                <i class="rex-icon fa-code"></i> Code Editor
                <div class="pull-right btn-group">
                    <button class="btn btn-default btn-xs" id="btn-refresh" title="Aktualisieren">
                        <i class="rex-icon fa-refresh"></i>
                    </button>
                    <button class="btn btn-default btn-xs" id="btn-hard-refresh" title="Cache leeren & Aktualisieren">
                        <i class="rex-icon fa-refresh"></i><i class="rex-icon fa-exclamation-triangle" style="font-size: 8px; margin-left: -3px;"></i>
                    </button>
                    <button class="btn btn-default btn-xs" id="btn-home" title="Zum Hauptverzeichnis">
                        <i class="rex-icon fa-home"></i>
                    </button>
                    <button class="btn btn-default btn-xs" id="btn-back" title="Zurück" disabled>
                        <i class="rex-icon fa-arrow-left"></i>
                    </button>
                </div>
            </div>
        </header>
        <div class="panel-body">
            <div id="current-path-breadcrumb" class="code-breadcrumb"></div>
            
            <!-- File Filter -->
            <div class="form-group">
                <input type="text" id="file-filter" class="form-control" placeholder="Dateien filtern...">
            </div>
            
            <!-- File Table -->
            <table class="table table-hover" id="file-table">
                <thead>
                    <tr>
                        <th style="width: 40px">
                            <i class="fa fa-file"></i>
                        </th>
                        <th>Name</th>
                        <th style="width: 100px">Größe</th>
                        <th style="width: 150px">Geändert</th>
                        <th style="width: 80px">Aktionen</th>
                    </tr>
                </thead>
                <tbody id="file-list">
                    <tr>
                        <td colspan="5" class="text-center">
                            <i class="rex-icon fa-spinner fa-spin"></i> Lade...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Editor Panel (initially hidden) -->
    <div class="panel panel-default" id="editor-panel" style="display: none;">
        <header class="panel-heading">
            <div class="panel-title">
                <i class="rex-icon fa-edit"></i> 
                <span id="current-file-name">Editor</span>
                <span id="file-status" class="badge pull-right">Gespeichert</span>
                <div class="pull-right btn-group" style="margin-right: 10px;">
                    <button class="btn btn-primary btn-xs" id="btn-save" title="Speichern (Ctrl+S)">
                        <i class="rex-icon fa-save"></i> Speichern
                    </button>
                    <button class="btn btn-info btn-xs" id="btn-fullscreen" title="Vollbild umschalten (F11)">
                        <i class="rex-icon fa-expand"></i>
                    </button>
                    <button class="btn btn-default btn-xs" id="btn-close-editor" title="Editor schließen">
                        <i class="rex-icon fa-times"></i>
                    </button>
                </div>
            </div>
        </header>
        <div class="panel-body" style="padding: 0;">
            <div id="monaco-editor" style="height: 600px;"></div>
        </div>
    </div>
</div>

<style>
.code-editor-container .table > tbody > tr:hover {
    background-color: #f5f5f5;
}

.code-file-icon {
    width: 20px;
    text-align: center;
}

.code-file-editable {
    cursor: pointer;
}

.code-file-readonly {
    color: #999;
}

.code-breadcrumb {
    margin-bottom: 15px;
    padding: 8px 12px;
    background-color: #f8f8f8;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    font-family: monospace;
}

#file-status.modified {
    background-color: #d9534f;
}

#file-status.saved {
    background-color: #5cb85c;
}

.code-loading {
    text-align: center;
    padding: 20px;
    color: #999;
}

/* Monaco Editor Styling */
#monaco-editor {
    border: 1px solid #e5e5e5;
}

.panel-body.editor-body {
    padding: 0 !important;
}

/* File size formatting */
.file-size {
    font-family: monospace;
    font-size: 0.9em;
    color: #666;
}

/* Animation for editor panel */
#editor-panel {
    animation: slideIn 0.3s ease-in-out;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>';

// Fragment erstellen und ausgeben
$fragment = new rex_fragment();
$fragment->setVar('body', $content, false);
echo $fragment->parse('core/page/section.php');

// JavaScript für diese Seite initialisieren
echo '<script>
$(document).on("rex:ready", function() {
    if (typeof CodeFileBrowser !== "undefined") {
        window.codeEditor = new CodeFileBrowser();
        window.codeEditor.init();
        
        // Datei direkt öffnen wenn über URL-Parameter übergeben
        const urlParams = new URLSearchParams(window.location.search);
        const openFile = urlParams.get("open_file");
        const gotoLine = urlParams.get("line");
        
        if (openFile) {
            setTimeout(() => {
                window.codeEditor.openFile(openFile).then(() => {
                    // Nach dem Öffnen zur Zeile springen
                    if (gotoLine && window.codeEditor.monacoEditor) {
                        const lineNum = parseInt(gotoLine);
                        if (lineNum > 0) {
                            setTimeout(() => {
                                window.codeEditor.goToLine(lineNum);
                            }, 500);
                        }
                    }
                });
                // URL-Parameter entfernen
                window.history.replaceState({}, document.title, window.location.pathname + "?page=code/main");
            }, 1000);
        }
    }
});
</script>';
