<?php

use FriendsOfRedaxo\Code\CodeSelfDestruct;

$addon = rex_addon::get('code');

// Nur für Admins verfügbar
if (!rex::getUser()->isAdmin()) {
    echo rex_view::error('Nur für Administratoren verfügbar');
    return;
}

// Aktivierung über POST-Request
if (rex_post('enable_file_browser', 'string') === '1') {
    rex_config::set('code', 'enable_file_browser', true);
    // Timer zurücksetzen
    $selfDestruct = new CodeSelfDestruct();
    $selfDestruct->resetTimer();
    echo rex_view::success('File-Browser wurde aktiviert. Auto-Deaktivierung in 2 Tagen.');
}

// Prüfe ob File-Browser aktiviert ist
$fileBrowserEnabled = rex_config::get('code', 'enable_file_browser', true);

if (!$fileBrowserEnabled) {
    // Aktivierungs-Formular mit Warnung anzeigen
    $content = '
    <div class="panel panel-warning">
        <header class="panel-heading">
            <div class="panel-title">
                <i class="rex-icon fa-exclamation-triangle"></i> File-Browser deaktiviert
            </div>
        </header>
        <div class="panel-body">
            <h3>⚠️ Sicherheitswarnung</h3>
            <p>Der File-Browser wurde automatisch deaktiviert, da er länger als 2 Tage nicht genutzt wurde.</p>
            
            <div class="alert alert-danger">
                <h4>Wichtige Hinweise zur Sicherheit:</h4>
                <ul>
                    <li><strong>Zugriff auf alle Dateien:</strong> Der File-Browser ermöglicht direkten Zugriff auf alle PHP-Dateien des REDAXO-Systems</li>
                    <li><strong>Code-Ausführung:</strong> Änderungen werden sofort ausgeführt und können das System beeinträchtigen</li>
                    <li><strong>Keine Versionskontrolle:</strong> Backups werden erstellt, aber Git-Integration ist empfohlen</li>
                    <li><strong>Nur für Entwicklung:</strong> Nicht für Produktivsysteme empfohlen</li>
                    <li><strong>Auto-Deaktivierung:</strong> Der File-Browser deaktiviert sich nach 2 Tagen Inaktivität automatisch</li>
                </ul>
            </div>
            
            <form method="post" action="">
                <input type="hidden" name="enable_file_browser" value="1">
                <button type="submit" class="btn btn-warning">
                    <i class="rex-icon fa-unlock"></i> File-Browser aktivieren (2 Tage)
                </button>
                <a href="' . rex_url::backendPage('code/settings') . '" class="btn btn-default">
                    <i class="rex-icon fa-cog"></i> Einstellungen
                </a>
            </form>
        </div>
    </div>
    ';
    
    echo $content;
    return;
}

// Selbstdeaktivierungs-System prüfen (still/silent)
$selfDestruct = new CodeSelfDestruct();
$selfDestruct->initialize();
$destructStatus = $selfDestruct->checkAndExecute();

// Bei Deaktivierung Seite neu laden
if ($destructStatus['status'] === 'deactivated') {
    header('Location: ' . rex_url::backendPage('code/main'));
    exit;
}

// Hauptcontainer im NextCloud-Stil
$content = '
<div class="code-editor-container">
    <div class="panel panel-default">
        <header class="panel-heading">
            <div class="panel-title">
                <i class="rex-icon fa-code"></i> Code Editor
                <div class="pull-right btn-group">
                    <button class="btn btn-default btn-xs" id="btn-back" title="Zurück" disabled>
                        <i class="rex-icon fa-arrow-left"></i>
                    </button>
                    <button class="btn btn-default btn-xs" id="btn-home" title="Zum Hauptverzeichnis">
                        <i class="rex-icon fa-home"></i>
                    </button>
                    <button class="btn btn-default btn-xs" id="btn-refresh" title="Dateiliste aktualisieren">
                        <i class="rex-icon fa-refresh"></i>
                    </button>
                    <button class="btn btn-default btn-xs" id="btn-hard-refresh" title="App-Cache leeren & Seite neu laden">
                        <i class="rex-icon fa-eraser"></i>
                    </button>
                    <button class="btn btn-warning btn-xs" id="btn-fix-permissions" title="Dateirechte im aktuellen Ordner korrigieren (644/755)">
                        <i class="rex-icon fa-wrench"></i> Rechte fixen
                    </button>
                    <button class="btn btn-success btn-xs" id="btn-new-file" title="Neue Datei erstellen">
                        <i class="rex-icon fa-file-o"></i> Neue Datei
                    </button>
                    <button class="btn btn-success btn-xs" id="btn-new-folder" title="Neuen Ordner erstellen">
                        <i class="rex-icon fa-folder-o"></i> Neuer Ordner
                    </button>
                </div>
            </div>
        </header>
        <div class="panel-body">
            <div id="current-path-breadcrumb" class="code-breadcrumb"></div>
            
            <!-- Favorites Bar -->
            <div id="favorites-bar" style="margin-bottom: 15px; padding: 8px; background: #f0f4f9; border-radius: 4px; border: 1px solid #c1c9d4;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="flex: 1;">
                        <strong style="font-size: 11px; color: #666; margin-right: 10px;">
                            <i class="rex-icon fa-star"></i> Favoriten:
                        </strong>
                        <span id="favorites-list" style="display: inline-block;"></span>
                    </div>
                    <button class="btn btn-xs btn-default" id="btn-add-favorite" title="Aktuellen Ordner zu Favoriten hinzufügen">
                        <i class="rex-icon fa-star-o"></i> Hinzufügen
                    </button>
                </div>
            </div>
            
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
                        <th style="width: 170px">Besitzer</th>
                        <th style="width: 130px">Rechte</th>
                        <th style="width: 130px">Aktionen</th>
                    </tr>
                </thead>
                <tbody id="file-list">
                    <tr>
                        <td colspan="7" class="text-center">
                            <i class="rex-icon fa-spinner fa-spin"></i> Lade...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Editor Modal -->
    <div class="modal fade" id="code-editor-modal" tabindex="-1" role="dialog" aria-labelledby="codeEditorLabel" aria-hidden="true" data-backdrop="static" data-keyboard="false">
        <div class="modal-dialog" style="width: 90%; height: 90vh; margin: 2% auto;">
            <div class="modal-content" style="height: 100%; display: flex; flex-direction: column;">
                <div class="modal-header">
                    <button type="button" class="close" id="btn-modal-close" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <button type="button" class="close" id="btn-modal-fullscreen" style="margin-right: 10px; font-size: 18px;" title="Vollbild umschalten"><i class="rex-icon fa-expand"></i></button>
                    <button type="button" class="close" id="btn-toggle-snippets" style="margin-right: 10px; font-size: 18px;" title="Snippets ein/ausblenden"><i class="rex-icon fa-code"></i></button>
                   
                    <div style="float: right; margin-right: 15px; margin-top: 1px;">
                        <label style="display: inline-block; margin-right: 5px; font-size: 11px; font-weight: normal;">Größe:</label>
                        <select id="fontsize-switcher" class="form-control input-sm" style="height: 22px; padding: 0 5px; font-size: 12px; width: auto; display: inline-block; margin-right: 10px;">
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
                        <label style="display: inline-block; margin-right: 5px; font-size: 11px; font-weight: normal;">Theme:</label>
                        <select id="theme-switcher" class="form-control input-sm" style="height: 22px; padding: 0 5px; font-size: 12px; width: auto; display: inline-block;">
                            <option value="redaxo-dark">REDAXO Dark</option>
                            <option value="redaxo-light">REDAXO Light</option>
                            <option value="bernstein-8bit">Bernstein 8-bit</option>
                            <option value="agk">AGK</option>
                            <option value="st">ST</option>
                            <option value="vs-dark">VS Dark</option>
                            <option value="vs">VS Light</option>
                            <option value="hc-black">High Contrast</option>
                        </select>
                        
                        <span style="display: inline-block; width: 1px; height: 16px; background: rgba(255,255,255,0.3); margin: 0 10px;"></span>
                        
                        <button type="button" id="toggle-line-numbers" class="btn btn-xs btn-default" title="Zeilennummern ein/aus" style="height: 22px; padding: 2px 8px;">
                            <i class="rex-icon fa-list-ol"></i>
                        </button>
                        <button type="button" id="toggle-word-wrap" class="btn btn-xs btn-default" title="Zeilenumbruch ein/aus" style="height: 22px; padding: 2px 8px;">
                            <i class="rex-icon fa-align-left"></i>
                        </button>
                        <button type="button" id="toggle-minimap" class="btn btn-xs btn-default" title="Minimap ein/aus" style="height: 22px; padding: 2px 8px;">
                            <i class="rex-icon fa-map"></i>
                        </button>
                        <button type="button" id="toggle-whitespace" class="btn btn-xs btn-default" title="Whitespace anzeigen" style="height: 22px; padding: 2px 8px;">
                            <i class="rex-icon fa-paragraph"></i>
                        </button>
                        <button type="button" id="toggle-sticky-scroll" class="btn btn-xs btn-default" title="Sticky Scroll ein/aus" style="height: 22px; padding: 2px 8px;">
                            <i class="rex-icon fa-thumb-tack"></i>
                        </button>
                    </div>

                    <h4 class="modal-title" id="codeEditorLabel">
                        <i class="rex-icon fa-edit"></i> 
                        <span id="current-file-name">Editor</span>
                        <span id="file-status" class="badge" style="margin-left: 10px;">Gespeichert</span>
                    </h4>
                </div>
                <div class="modal-body" style="flex: 1; padding: 0; overflow: hidden; position: relative; display: flex;">
                    <div id="snippets-sidebar" style="width: 300px; border-right: 1px solid #ddd; background: #f8f9fa; overflow-y: auto; display: none; flex-shrink: 0;">
                        <div style="padding: 10px; border-bottom: 1px solid #ddd; position: sticky; top: 0; background: #f8f9fa; z-index: 10;">
                            <input type="text" id="snippet-search" class="form-control input-sm" placeholder="Snippets durchsuchen..." style="margin-bottom: 5px;">
                        </div>
                        <div id="snippets-list" style="padding: 10px;"></div>
                    </div>
                    <div id="monaco-editor" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; transition: left 0.3s, width 0.3s;"></div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="text-muted small">
                        <span id="cursor-position">Ln 1, Col 1</span>
                    </div>
                    <div>
                        <button type="button" class="btn btn-default" id="btn-close-editor">Schließen</button>
                        <button type="button" class="btn btn-primary" id="btn-save" title="Speichern (Ctrl+S)">
                            <i class="rex-icon fa-save"></i> Speichern
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
:root {
    --code-surface-muted: #f8f9fa;
    --code-surface-card: #ffffff;
    --code-surface-hover: #e3f2fd;
    --code-border: #ddd;
    --code-border-soft: #e0e0e0;
    --code-text-muted: #666;
    --code-text-soft: #999;
    --code-danger: #d32f2f;
}

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
    color: var(--code-text-soft);
}

.code-breadcrumb {
    margin-bottom: 15px;
    padding: 8px 12px;
    background-color: transparent;
    border: 1px solid rgba(0, 0, 0, 0.2);
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

/* Fullscreen Modal */
.modal-fullscreen .modal-dialog {
    width: 100% !important;
    height: 100vh !important;
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
}

.modal-fullscreen .modal-content {
    height: 100% !important;
    border: 0 !important;
    border-radius: 0 !important;
}

/* Dark Mode Table Overrides */
.code-editor-container .table > thead > tr > th {
    background-color: transparent !important;
    border-bottom: 1px solid rgba(0,0,0,0.1) !important;
    color: #888;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
}

.code-editor-container .table > tbody > tr > td {
    border-top: 1px solid rgba(0,0,0,0.05) !important;
    vertical-align: middle;
}

/* Monaco Editor Styling */
#monaco-editor {
    border: 0;
}

/* File size formatting */
.file-size {
    font-family: monospace;
    font-size: 0.9em;
    color: var(--code-text-muted);
}

/* Snippets Sidebar */
#snippets-sidebar.visible {
    display: block !important;
}

#monaco-editor.with-sidebar {
    left: 300px !important;
    width: calc(100% - 300px) !important;
}

.snippet-category {
    margin-bottom: 15px;
}

.snippet-category-title {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--code-text-muted);
    margin-bottom: 8px;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--code-border);
}

.snippet-item {
    padding: 6px 10px;
    margin-bottom: 3px;
    background: var(--code-surface-card);
    border: 1px solid var(--code-border-soft);
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
}

.snippet-item:hover {
    background: var(--code-surface-hover);
    border-color: #2196f3;
    transform: translateX(2px);
}

.snippet-item-name {
    font-weight: 500;
    color: #333;
}

.snippet-item-preview {
    font-size: 10px;
    color: var(--code-text-soft);
    font-family: monospace;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Favorites */
.favorite-item {
    display: inline-block;
    padding: 3px 8px;
    margin-right: 5px;
    margin-bottom: 5px;
    background: var(--code-surface-card);
    border: 1px solid var(--code-border);
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
}

.favorite-item:hover {
    background: var(--code-surface-hover);
    border-color: #2196f3;
}

.favorite-item .rex-icon {
    margin-right: 3px;
}

.favorite-item .remove-favorite {
    margin-left: 5px;
    color: var(--code-text-soft);
    cursor: pointer;
}

.favorite-item .remove-favorite:hover {
    color: var(--code-danger);
}

body.rex-theme-dark {
    --code-surface-muted: #1e2935;
    --code-surface-card: #243241;
    --code-surface-hover: #2c3d4f;
    --code-border: #3a4b5d;
    --code-border-soft: #3a4b5d;
    --code-text-muted: #b6c4d3;
    --code-text-soft: #91a2b4;
    --code-danger: #ff8a80;
}

@media (prefers-color-scheme: dark) {
    body.rex-has-theme:not(.rex-theme-light) {
        --code-surface-muted: #1e2935;
        --code-surface-card: #243241;
        --code-surface-hover: #2c3d4f;
        --code-border: #3a4b5d;
        --code-border-soft: #3a4b5d;
        --code-text-muted: #b6c4d3;
        --code-text-soft: #91a2b4;
        --code-danger: #ff8a80;
    }
}

/* Inline-Styles der Seite für Dark/Auto überschreiben */
#favorites-bar {
    background: var(--code-surface-muted) !important;
    border-color: var(--code-border) !important;
}

#favorites-bar strong {
    color: var(--code-text-muted) !important;
}

#snippets-sidebar,
#snippets-sidebar > div {
    background: var(--code-surface-muted) !important;
    border-color: var(--code-border) !important;
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
        window.codeFileBrowser = new CodeFileBrowser();
        
        // Datei direkt öffnen wenn über URL-Parameter übergeben
        const urlParams = new URLSearchParams(window.location.search);
        const openFile = urlParams.get("open_file");
        const gotoLine = urlParams.get("line");
        
        // Startverzeichnis bestimmen
        let startPath = "";
        if (openFile) {
            const lastSlash = openFile.lastIndexOf("/");
            if (lastSlash !== -1) {
                startPath = openFile.substring(0, lastSlash);
            }
        }
        
        // Editor und Browser mit korrektem Pfad initialisieren
        window.codeFileBrowser.init(startPath);
        
        if (openFile) {
            setTimeout(() => {
                window.codeFileBrowser.openFile(openFile).then(() => {
                    // Nach dem Öffnen zur Zeile springen
                    if (gotoLine && window.codeFileBrowser.monacoEditor) {
                        const lineNum = parseInt(gotoLine);
                        if (lineNum > 0) {
                            setTimeout(() => {
                                window.codeFileBrowser.goToLine(lineNum);
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
