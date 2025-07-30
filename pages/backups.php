<?php

/**
 * Backup Management
 */

$content = '
<div class="code-container">
    <div class="panel panel-default">
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

<style>
.backup-actions .btn {
    margin-right: 5px;
}
</style>';

$fragment = new rex_fragment();
$fragment->setVar('body', $content, false);
echo $fragment->parse('core/page/section.php');

// JavaScript für Backup-Management
echo '<script>
$(document).on("rex:ready", function() {
    if (typeof CodeBackupManager !== "undefined") {
        window.backupManager = new CodeBackupManager();
        window.backupManager.init();
    }
});
</script>';
