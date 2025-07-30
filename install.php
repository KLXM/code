<?php

/**
 * Code Editor AddOn Installation
 */

// Backup-Verzeichnis erstellen
$backupDir = rex_addon::get('code')->getDataPath('backups');
if (!is_dir($backupDir)) {
    rex_dir::create($backupDir);
}

// Htaccess für Backup-Schutz
$htaccessContent = "Order Deny,Allow\nDeny from all";
rex_file::put($backupDir . '/.htaccess', $htaccessContent);

#$this->setProperty('installmsg', 'Code Editor wurde erfolgreich installiert!');
