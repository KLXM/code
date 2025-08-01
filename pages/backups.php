<?php

/**
 * Backup & Trash Management
 */

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

.nav-tabs > li.active > a {
    border-bottom-color: #fff;
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
