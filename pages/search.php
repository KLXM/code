<?php

// Nur für Admins verfügbar
if (!rex::getUser()->isAdmin()) {
    echo rex_view::error('Nur für Administratoren verfügbar');
    return;
}

$content = '
<div class="code-search-container">
    <div class="panel panel-default">
        <header class="panel-heading">
            <div class="panel-title">
                <i class="rex-icon fa-search"></i> Code-Suche
            </div>
        </header>
        <div class="panel-body">
            <form id="search-form" class="form-horizontal">
                <div class="form-group">
                    <label for="search-term" class="col-sm-2 control-label">Suchbegriff</label>
                    <div class="col-sm-8">
                        <input type="text" class="form-control" id="search-term" name="term" 
                               placeholder="Funktion, Klasse, Variable oder Text suchen..." 
                               required minlength="2">
                    </div>
                    <div class="col-sm-2">
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fa fa-search"></i> Suchen
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Search Results -->
    <div class="panel panel-default" id="search-results" style="display: none;">
        <header class="panel-heading">
            <div class="panel-title">
                <i class="rex-icon fa-list"></i> 
                <span id="results-title">Suchergebnisse</span>
            </div>
        </header>
        <div class="panel-body">
            <div id="search-results-content"></div>
        </div>
    </div>
</div>

<style>
.search-result-item {
    border-left: 3px solid #337ab7;
    padding: 0;
    margin-bottom: 15px;
    background-color: #f9f9f9;
    border-radius: 0 4px 4px 0;
    border: 1px solid #e5e5e5;
}

.search-result-file-header {
    background-color: #f5f5f5;
    padding: 10px 15px;
    border-bottom: 1px solid #e5e5e5;
}

.search-result-file {
    font-weight: bold;
    color: #337ab7;
    cursor: pointer;
    margin: 0;
}

.search-result-file:hover {
    color: #23527c;
}

.search-result-file strong {
    font-size: 14px;
}

.search-result-match {
    padding: 8px 15px;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.2s;
}

.search-result-match:hover {
    background-color: #f0f8ff;
}

.search-result-match:last-child {
    border-bottom: none;
}

.search-result-line-info {
    margin-bottom: 5px;
}

.search-line-btn {
    font-size: 11px;
    padding: 2px 6px;
}

.search-result-content {
    font-family: Monaco, Consolas, "Courier New", monospace;
    background-color: #fff;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 3px;
    margin-top: 5px;
    overflow-x: auto;
    cursor: pointer;
    font-size: 12px;
    line-height: 1.4;
}

.search-result-content:hover {
    border-color: #337ab7;
    box-shadow: 0 0 3px rgba(51, 122, 183, 0.3);
}

.search-result-content mark {
    background-color: #ffeb3b;
    padding: 1px 2px;
    border-radius: 2px;
    font-weight: bold;
}

.search-loading {
    text-align: center;
    padding: 20px;
}

.search-stats {
    padding: 10px 15px;
    background-color: #d9edf7;
    border: 1px solid #bce8f1;
    border-radius: 4px;
    margin-bottom: 15px;
}

.no-results {
    text-align: center;
    padding: 40px;
    color: #999;
}

.badge-primary {
    background-color: #337ab7;
}

/* Zeilen-Highlighting im Editor */
.highlight-line {
    background-color: rgba(255, 235, 59, 0.3) !important;
    animation: fadeOut 3s ease-out;
}

@keyframes fadeOut {
    0% { background-color: rgba(255, 235, 59, 0.8) !important; }
    100% { background-color: rgba(255, 235, 59, 0.1) !important; }
}
</style>';

// Fragment erstellen und ausgeben
$fragment = new rex_fragment();
$fragment->setVar('body', $content, false);
echo $fragment->parse('core/page/section.php');

// JavaScript für Suche
echo '<script>
$(document).on("rex:ready", function() {
    if (typeof CodeFileSearch !== "undefined") {
        window.codeSearch = new CodeFileSearch();
        window.codeSearch.init();
    }
});
</script>';
