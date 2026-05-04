<?php

use FriendsOfRedaxo\Code\CodeSelfDestruct;

/**
 * Backup & Trash Management
 */

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
    $activationPanel = '
    <div class="panel panel-warning">
        <header class="panel-heading">
            <div class="panel-title">
                <i class="rex-icon fa-exclamation-triangle"></i> ' . $addon->i18n('file_browser_deactivated_title') . '
            </div>
        </header>
        <div class="panel-body">
            <p>' . $addon->i18n('file_browser_deactivated_notice') . '</p>
            
            <div class="alert alert-danger" style="margin-top: 15px;">
                <h4><i class="fa fa-exclamation-triangle"></i> ' . $addon->i18n('file_browser_security_warning') . '</h4>
                <p>' . $addon->i18n('file_browser_security_info') . '</p>
                <ul>
                    <li>' . $addon->i18n('file_browser_security_point_1') . '</li>
                    <li>' . $addon->i18n('file_browser_security_point_2') . '</li>
                    <li>' . $addon->i18n('file_browser_security_point_3') . '</li>
                    <li>' . $addon->i18n('file_browser_security_point_4') . '</li>
                    <li>' . $addon->i18n('file_browser_security_point_5') . '</li>
                </ul>
            </div>
            
            <form method="post" style="margin-top: 15px;">
                <input type="hidden" name="enable_file_browser" value="1">
                <button type="submit" class="btn btn-warning">
                    <i class="fa fa-unlock"></i> ' . $addon->i18n('file_browser_activate_button') . '
                </button>
                <p class="help-block" style="margin-top: 10px;">
                    ' . $addon->i18n('file_browser_activate_help') . '
                </p>
            </form>
        </div>
    </div>
    ';
    
    echo $activationPanel;
    return;
}

$content = '
<div class="code-container">
    <!-- Tab Navigation -->
    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active">
            <a href="#backups-tab" aria-controls="backups-tab" role="tab" data-toggle="tab">
                <i class="rex-icon fa-history"></i> ' . rex_i18n::msg('code_backups') . '
            </a>
        </li>
        <li role="presentation">
            <a href="#trash-tab" aria-controls="trash-tab" role="tab" data-toggle="tab">
                <i class="rex-icon fa-trash"></i> Papierkorb
            </a>
        </li>
    </ul>

    <!-- Tab Content -->
    <div class="tab-content">
        <!-- Backups Tab -->
        <div role="tabpanel" class="tab-pane active" id="backups-tab">
            <div class="panel panel-default" style="border-top: none; border-top-left-radius: 0;">
                <header class="panel-heading">
                    <div class="panel-title">
                        <i class="rex-icon fa-history"></i> ' . rex_i18n::msg('code_backups') . '
                        <div class="pull-right">
                            <button class="btn btn-warning btn-xs" id="btnDeleteAll">
                                <i class="rex-icon fa-trash-o"></i> Alle Backups löschen
                            </button>
                            <button class="btn btn-danger btn-xs" id="btnCleanupOld">
                                <i class="rex-icon fa-clock-o"></i> Alte Backups löschen (>30 Tage)
                            </button>
                        </div>
                    </div>
                </header>
                <div class="panel-body">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>' . rex_i18n::msg('code_filename') . '</th>
                                <th style="width: 100px">' . rex_i18n::msg('code_filesize') . '</th>
                                <th style="width: 150px">Erstellt</th>
                                <th style="width: 150px">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody id="backupList">
                            <tr>
                                <td colspan="4" class="text-center">
                                    <i class="rex-icon fa-spinner fa-spin"></i> Lade Backups...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Trash Tab -->
        <div role="tabpanel" class="tab-pane" id="trash-tab">
            <div class="panel panel-default" style="border-top: none; border-top-left-radius: 0;">
                <header class="panel-heading">
                    <div class="panel-title">
                        <i class="rex-icon fa-trash"></i> Papierkorb
                        <div class="pull-right">
                            <button class="btn btn-danger btn-xs" id="btnEmptyTrash">
                                <i class="rex-icon fa-trash"></i> Papierkorb leeren
                            </button>
                        </div>
                    </div>
                </header>
                <div class="panel-body">
                    <div class="alert alert-info">
                        <i class="rex-icon fa-info-circle"></i> 
                        Gelöschte Dateien werden hier gesammelt und können wiederhergestellt werden. 
                        Die Dateien sind mit der Endung <code>.trash</code> versehen und daher nicht mehr ausführbar.
                    </div>
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Originaler Pfad</th>
                                <th style="width: 100px">Größe</th>
                                <th style="width: 150px">Gelöscht am</th>
                                <th style="width: 200px">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody id="trashList">
                            <tr>
                                <td colspan="4" class="text-center">
                                    <i class="rex-icon fa-spinner fa-spin"></i> Lade Papierkorb...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
:root {
    --code-tabs-active-border: #fff;
    --code-surface: #fff;
    --code-surface-2: #f7f9fc;
    --code-surface-3: #eef2f7;
    --code-border: #ddd;
    --code-table-stripe: #f9f9f9;
    --code-text-muted: #666;
}

.backup-actions .btn,
.trash-actions .btn {
    margin-right: 5px;
}

.nav-tabs {
    margin-bottom: 0;
}

.tab-content > .tab-pane {
    padding-top: 0;
}

.panel-default {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
}

.code-container .panel,
.code-container .panel-body,
.code-container .panel-heading,
.code-container .tab-content,
.code-container .tab-pane {
    background-color: var(--code-surface) !important;
}

.code-container .panel-heading {
    background-color: var(--code-surface-2) !important;
}

.code-container .nav-tabs > li > a {
    background-color: var(--code-surface-2) !important;
    border-color: var(--code-border) !important;
    color: var(--code-text-muted) !important;
}

.code-container .nav-tabs > li > a:hover,
.code-container .nav-tabs > li > a:focus {
    background-color: var(--code-surface-3) !important;
    border-color: var(--code-border) !important;
    color: var(--code-text-muted) !important;
}

.code-container .nav-tabs > li.active > a,
.code-container .nav-tabs > li.active > a:hover,
.code-container .nav-tabs > li.active > a:focus {
    background-color: var(--code-surface-3) !important;
    border-color: var(--code-border) !important;
    border-bottom-color: var(--code-tabs-active-border) !important;
    color: var(--code-text-muted) !important;
}

.nav-tabs > li.active > a {
    border-bottom-color: var(--code-tabs-active-border);
}

.code-container .panel,
.code-container .panel-body,
.code-container .panel-heading,
.code-container .table,
.code-container .table > thead > tr > th,
.code-container .table > tbody > tr > td {
    border-color: var(--code-border) !important;
}

.code-container .table-striped > tbody > tr:nth-of-type(odd) {
    background-color: var(--code-table-stripe);
}

.code-container .table > thead > tr > th {
    background-color: var(--code-surface-3) !important;
    color: var(--code-text-muted) !important;
}

body.rex-theme-dark {
    --code-tabs-active-border: #263545;
    --code-surface: #1f2c39;
    --code-surface-2: #233241;
    --code-surface-3: #304152;
    --code-border: #3a4b5d;
    --code-table-stripe: #233241;
    --code-text-muted: #b6c4d3;
}

@media (prefers-color-scheme: dark) {
    body.rex-has-theme:not(.rex-theme-light) {
        --code-tabs-active-border: #263545;
        --code-surface: #1f2c39;
        --code-surface-2: #233241;
        --code-surface-3: #304152;
        --code-border: #3a4b5d;
        --code-table-stripe: #233241;
        --code-text-muted: #b6c4d3;
    }
}

body.rex-theme-dark .code-container .nav-tabs > li > a,
body.rex-theme-dark .code-container .panel-title,
body.rex-theme-dark .code-container .table > thead > tr > th,
body.rex-theme-dark .code-container .table > tbody > tr > td {
    color: var(--code-text-muted) !important;
}

@media (prefers-color-scheme: dark) {
    body.rex-has-theme:not(.rex-theme-light) .code-container .nav-tabs > li > a,
    body.rex-has-theme:not(.rex-theme-light) .code-container .panel-title,
    body.rex-has-theme:not(.rex-theme-light) .code-container .table > thead > tr > th,
    body.rex-has-theme:not(.rex-theme-light) .code-container .table > tbody > tr > td {
        color: var(--code-text-muted) !important;
    }
}
</style>';

// Fragment erstellen und ausgeben
$fragment = new rex_fragment();
$fragment->setVar('body', $content, false);
echo $fragment->parse('core/page/section.php');

// JavaScript für Backup & Trash Management
echo '<script>
$(document).on("rex:ready", function() {
    if (typeof CodeBackupManager !== "undefined") {
        window.backupManager = new CodeBackupManager();
        window.backupManager.init();
    }
    
    if (typeof CodeTrashManager !== "undefined") {
        window.trashManager = new CodeTrashManager();
        window.trashManager.init();
    }
    
    // Tab-Wechsel Events
    $(\'a[data-toggle="tab"]\').on(\'shown.bs.tab\', function (e) {
        const target = $(e.target).attr("href");
        if (target === "#trash-tab" && window.trashManager) {
            window.trashManager.loadTrash();
        } else if (target === "#backups-tab" && window.backupManager) {
            window.backupManager.loadBackups();
        }
    });
});
</script>';
