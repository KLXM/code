<?php

namespace FriendsOfRedaxo\Code;

use Exception;
use rex_addon;
use rex_dir;
use rex_file;
use rex_path;
use rex_get;
use rex_post;
use rex_config;

/**
 * Code Editor API Handler
 * Basierend auf NextCloud AddOn Struktur
 */
class CodeApi
{
    private string $dataDir;
    private string $trashDir;
    private array $allowedExtensions = [];

    private array $excludedDirs = [];

    public function __construct()
    {
        // STRICT SECURITY CHECK
        // Nur eingeloggte Backend-User mit Admin-Rechten dürfen die API nutzen
        $user = \rex::getUser();
        if (!$user || !$user->isAdmin()) {
            // Wir werfen hier keine Exception mit Details, sondern beenden hart für maximale Sicherheit
            header('HTTP/1.1 403 Forbidden');
            echo json_encode(['success' => false, 'error' => 'Access denied. Administrator privileges required.']);
            exit;
        }

        $this->allowedExtensions = EditorConfig::getAllowedExtensions();
        $this->excludedDirs = EditorConfig::getExcludedDirectories();

        $this->dataDir = rex_path::addonData('code', 'backups');
        $this->trashDir = rex_path::addonData('code', 'trash');
        
        // Verzeichnisse erstellen falls nicht vorhanden
        if (!is_dir($this->dataDir)) {
            rex_dir::create($this->dataDir);
        }
        if (!is_dir($this->trashDir)) {
            rex_dir::create($this->trashDir);
        }
    }

    /**
     * Kritische Dateien, die nicht gelöscht werden dürfen
     */
    private array $protectedFiles = [
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
        'console.php',
        'console',
        'AppPathProvider.php',
        'LICENSE',
        'robots.txt',
        'sitemap.xml',
        'web.config'
    ];

    public function handleRequest(string $action): array
    {
        // Debug-Ausgabe
        error_log("Code Editor API - Action: " . $action);
        error_log("Code Editor API - GET params: " . print_r($_GET, true));
        error_log("Code Editor API - POST params: " . print_r($_POST, true));
        
        // Cache-Busting ignorieren (Parameter wird nur für Browser-Cache verwendet)
        if (isset($_GET['_cb'])) {
            error_log("Code Editor API - Cache-busting parameter: " . $_GET['_cb']);
        }
        
        // No-Cache Header setzen
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        // Bei jeder API-Nutzung den "last_used" Timestamp aktualisieren
        rex_config::set('code', 'last_used_time', time());
        
        try {
            switch ($action) {
                case 'list':
                    return $this->listFiles(rex_get('path', 'string', ''));
                case 'read':
                    return $this->readFile(rex_get('file', 'string'));
                case 'save':
                    $filePath = rex_post('file', 'string');
                    $content = rex_post('content', 'string');
                    error_log("Code Editor API - Save parameters: file='" . $filePath . "', content_length=" . strlen($content));
                    return $this->saveFile($filePath, $content);
                case 'delete':
                    return $this->deleteFile(rex_post('file', 'string'));
                case 'search':
                    return $this->searchFiles(rex_get('term', 'string'));
                case 'backup-list':
                    return $this->listBackups();
                case 'backup-read':
                    return $this->readBackup(rex_get('backup', 'string'));
                case 'backup-restore':
                    return $this->restoreBackup(rex_post('backup', 'string'));
                case 'backup-delete':
                    return $this->deleteBackup(rex_post('backup', 'string'));
                case 'backup-cleanup':
                    return $this->cleanupBackups();
                case 'backup-delete-all':
                    return $this->deleteAllBackups();
                case 'backup-test':
                    return $this->createTestBackups();
                case 'trash-list':
                    return $this->listTrash();
                case 'trash-read':
                    return $this->readTrash(rex_get('trash', 'string'));
                case 'trash-restore':
                    return $this->restoreFromTrash(rex_post('trash', 'string'));
                case 'trash-delete':
                    return $this->deleteFromTrash(rex_post('trash', 'string'));
                case 'trash-empty':
                    return $this->emptyTrash();
                case 'create':
                    return $this->createFile(rex_post('path', 'string'), rex_post('name', 'string'), rex_post('type', 'string', 'file'));
                case 'copy':
                    return $this->copyFile(rex_post('file', 'string'), rex_post('newName', 'string', ''));
                case 'fix-permissions':
                    return $this->fixPermissions(rex_post('path', 'string', ''), rex_post('recursive', 'bool', false));
                default:
                    throw new Exception('Unknown action: ' . $action);
            }
        } catch (\Throwable $e) {
            error_log("Code Editor API Error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    private function listFiles(string $path): array
    {
        $basePath = rex_path::base();
        $fullPath = $basePath . ltrim($path, '/');
        
        if (!is_dir($fullPath) || !$this->isAllowedPath($fullPath)) {
            return ['success' => false, 'error' => 'Directory not found or not allowed'];
        }

        $items = [];
        $files = scandir($fullPath);
        
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            
            $filePath = $fullPath . '/' . $file;
            $relativePath = trim($path . '/' . $file, '/');
            
            if (is_dir($filePath)) {
                if (!$this->isExcludedDir($file)) {
                    $items[] = [
                        'name' => $file,
                        'path' => $relativePath,
                        'type' => 'folder',
                        'modified' => date('d.m.Y H:i', filemtime($filePath)),
                        'owner_group' => $this->getOwnerGroup($filePath),
                        'permissions_octal' => $this->getPermissionsOctal($filePath),
                        'permissions_symbolic' => $this->getPermissionsSymbolic($filePath),
                    ];
                }
            } else {
                $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if ($this->isAllowedExtension($extension)) {
                    $items[] = [
                        'name' => $file,
                        'path' => $relativePath,
                        'type' => 'file',
                        'extension' => $extension,
                        'size' => $this->formatBytes(filesize($filePath)),
                        'modified' => date('d.m.Y H:i', filemtime($filePath)),
                        'writable' => is_writable($filePath),
                        'owner_group' => $this->getOwnerGroup($filePath),
                        'permissions_octal' => $this->getPermissionsOctal($filePath),
                        'permissions_symbolic' => $this->getPermissionsSymbolic($filePath),
                    ];
                }
            }
        }

        // Sortierung: Ordner zuerst, dann alphabetisch
        usort($items, function($a, $b) {
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'folder' ? -1 : 1;
            }
            return strcasecmp($a['name'], $b['name']);
        });

        return ['success' => true, 'data' => $items];
    }

    private function readFile(string $filePath): array
    {
        $basePath = rex_path::base();
        $fullPath = $basePath . ltrim($filePath, '/');
        
        if (!file_exists($fullPath) || !$this->isAllowedPath($fullPath)) {
            return ['success' => false, 'error' => 'File not found or not allowed'];
        }

        $extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
        if (!$this->isAllowedExtension($extension)) {
            return ['success' => false, 'error' => 'File type not allowed'];
        }

        $content = file_get_contents($fullPath);
        
        return [
            'success' => true,
            'data' => [
                'path' => $filePath,
                'name' => basename($fullPath),
                'content' => $content,
                'size' => filesize($fullPath),
                'extension' => $extension,
                'writable' => is_writable($fullPath)
            ]
        ];
    }

    private function fixPermissions(string $path, bool $recursive): array
    {
        $basePath = rex_path::base();
        $fullPath = $basePath . ltrim($path, '/');

        if (!file_exists($fullPath) || !$this->isAllowedPath($fullPath)) {
            return ['success' => false, 'error' => 'Path not found or not allowed'];
        }

        $stats = [
            'processed' => 0,
            'changed' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        if ($recursive) {
            $this->applyPermissionsRecursive($fullPath, $stats);
        } else {
            $this->applyPermissionsSingleLevel($fullPath, $stats);
        }

        return [
            'success' => true,
            'message' => 'Permissions fixed',
            'stats' => [
                'processed' => $stats['processed'],
                'changed' => $stats['changed'],
                'failed' => $stats['failed'],
            ],
            'errors' => $stats['errors'],
        ];
    }

    private function applyPermissionsSingleLevel(string $path, array &$stats): void
    {
        $this->applyPermissionsToPath($path, $stats);

        if (!is_dir($path)) {
            return;
        }

        $entries = scandir($path);
        if ($entries === false) {
            return;
        }

        foreach ($entries as $entry) {
            if ('.' === $entry || '..' === $entry) {
                continue;
            }

            if ($this->isExcludedDir($entry)) {
                continue;
            }

            $entryPath = $path . '/' . $entry;
            $this->applyPermissionsToPath($entryPath, $stats);
        }
    }

    private function applyPermissionsRecursive(string $path, array &$stats): void
    {
        if (is_dir($path) && $this->isExcludedDir(basename($path))) {
            return;
        }

        $this->applyPermissionsToPath($path, $stats);

        if (!is_dir($path)) {
            return;
        }

        $entries = scandir($path);
        if ($entries === false) {
            return;
        }

        foreach ($entries as $entry) {
            if ('.' === $entry || '..' === $entry) {
                continue;
            }

            $entryPath = $path . '/' . $entry;

            if (is_dir($entryPath)) {
                $this->applyPermissionsRecursive($entryPath, $stats);
            } else {
                $this->applyPermissionsToPath($entryPath, $stats);
            }
        }
    }

    private function applyPermissionsToPath(string $path, array &$stats): void
    {
        if (is_link($path) || !$this->isAllowedPath($path)) {
            return;
        }

        $stats['processed']++;
        $targetPerm = is_dir($path) ? 0755 : 0644;
        $currentPerm = fileperms($path);

        if (false === $currentPerm) {
            $stats['failed']++;
            if (count($stats['errors']) < 10) {
                $stats['errors'][] = 'Cannot read permissions: ' . $path;
            }
            return;
        }

        if (($currentPerm & 0777) === $targetPerm) {
            return;
        }

        if (@chmod($path, $targetPerm)) {
            $stats['changed']++;
            return;
        }

        $stats['failed']++;
        if (count($stats['errors']) < 10) {
            $stats['errors'][] = 'chmod failed: ' . $path;
        }
    }

    private function saveFile(string $filePath, string $content): array
    {
        $basePath = rex_path::base();
        $fullPath = $basePath . ltrim($filePath, '/');
        
        // Debug-Ausgabe
        error_log("Code Editor - Save attempt:");
        error_log("- File path: " . $filePath);
        error_log("- Full path: " . $fullPath);
        error_log("- Content length: " . strlen($content));
        error_log("- File exists: " . (file_exists($fullPath) ? 'yes' : 'no'));
        error_log("- Is writable: " . (is_writable($fullPath) ? 'yes' : 'no'));
        
        if (!file_exists($fullPath) || !$this->isAllowedPath($fullPath)) {
            error_log("Code Editor - Error: File not found or not allowed");
            return ['success' => false, 'error' => 'File not found or not allowed'];
        }

        if (!is_writable($fullPath)) {
            error_log("Code Editor - Error: File not writable");
            return ['success' => false, 'error' => 'File not writable'];
        }

        // Backup erstellen
        try {
            $this->createBackup($fullPath);
            error_log("Code Editor - Backup created successfully");
        } catch (Exception $e) {
            error_log("Code Editor - Backup failed: " . $e->getMessage());
        }
        
        // Datei speichern
        $result = file_put_contents($fullPath, $content);
        error_log("Code Editor - file_put_contents result: " . ($result !== false ? $result . ' bytes written' : 'failed'));
        
        if ($result !== false) {
            error_log("Code Editor - Save successful");
            return ['success' => true, 'message' => 'File saved successfully'];
        } else {
            error_log("Code Editor - Save failed");
            return ['success' => false, 'error' => 'Failed to save file'];
        }
    }

    private function searchFiles(string $searchTerm): array
    {
        if (strlen($searchTerm) < 2) {
            return ['success' => false, 'error' => 'Search term too short'];
        }

        $results = [];
        $basePath = rex_path::base();

        // Absolut-Pfade, die grundsätzlich von der Suche ausgeschlossen sind
        $excludedPaths = [
            rtrim(rex_path::cache(), '/'),
        ];

        $this->searchInDirectory($basePath, $searchTerm, $results, $excludedPaths);

        return ['success' => true, 'data' => $results];
    }

    /**
     * Kürzt einen langen Zeilen-Inhalt auf max. $maxLength Zeichen,
     * zentriert um die Fundstelle des Suchbegriffs.
     */
    private function truncateMatchContent(string $line, string $searchTerm, int $maxLength = 120): string
    {
        $line = trim($line);
        if (mb_strlen($line) <= $maxLength) {
            return $line;
        }

        $matchPos = mb_stripos($line, $searchTerm);
        if ($matchPos === false) {
            return mb_substr($line, 0, $maxLength) . '…';
        }

        $halfWindow = (int) (($maxLength - mb_strlen($searchTerm)) / 2);
        $start = max(0, $matchPos - $halfWindow);
        $end   = min(mb_strlen($line), $matchPos + mb_strlen($searchTerm) + $halfWindow);

        $excerpt = mb_substr($line, $start, $end - $start);
        return ($start > 0 ? '…' : '') . $excerpt . ($end < mb_strlen($line) ? '…' : '');
    }

    /**
     * @param list<string> $excludedPaths Absolute Pfade, die übersprungen werden
     */
    private function searchInDirectory(string $dir, string $searchTerm, array &$results, array $excludedPaths = []): void
    {
        if (!is_dir($dir) || !$this->isAllowedPath($dir)) {
            return;
        }

        // Absolut-Pfad-basierte Ausschlüsse (z. B. redaxo/cache/)
        $normalizedDir = rtrim($dir, '/');
        foreach ($excludedPaths as $excludedPath) {
            if ($normalizedDir === $excludedPath || str_starts_with($normalizedDir . '/', $excludedPath . '/')) {
                return;
            }
        }

        $files = scandir($dir);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }

            $filePath = $dir . '/' . $file;

            if (is_dir($filePath)) {
                $dirName = basename($filePath);
                if (!$this->isExcludedDir($dirName)) {
                    $this->searchInDirectory($filePath, $searchTerm, $results, $excludedPaths);
                }
            } else {
                $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if ($this->isAllowedExtension($extension)) {
                    $content = file_get_contents($filePath);
                    if ($content !== false && stripos($content, $searchTerm) !== false) {
                        $relativePath = str_replace(rex_path::base(), '', $filePath);
                        $lines = explode("\n", $content);
                        $matches = [];
                        foreach ($lines as $lineNum => $line) {
                            if (stripos($line, $searchTerm) !== false) {
                                $matches[] = [
                                    'line'    => $lineNum + 1,
                                    'content' => $this->truncateMatchContent($line, $searchTerm),
                                ];
                                if (count($matches) >= 5) {
                                    break; // Max 5 Matches pro Datei
                                }
                            }
                        }

                        $results[] = [
                            'path' => $relativePath,
                            'file' => $relativePath, // Für Kompatibilität
                            'matches' => $matches,
                        ];
                    }
                }
            }
        }
    }

    private function createBackup(string $filePath): void
    {
        $relativePath = str_replace(rex_path::base(), '', $filePath);
        $backupName = date('Y-m-d_H-i-s') . '_' . str_replace('/', '_', $relativePath);
        $backupPath = $this->dataDir . '/' . $backupName;
        
        copy($filePath, $backupPath);
        
        // Alte Backups bereinigen (älter als 30 Tage)
        $this->cleanupOldBackups();
    }

    private function listBackups(): array
    {
        $backups = [];
        $files = glob($this->dataDir . '/*');
        
        foreach ($files as $file) {
            if (is_file($file)) {
                $backups[] = [
                    'name' => basename($file),
                    'size' => $this->formatBytes(filesize($file)),
                    'created' => date('d.m.Y H:i:s', filemtime($file))
                ];
            }
        }
        
        // Sortieren nach Datum (neueste zuerst)
        usort($backups, function($a, $b) {
            return strcmp($b['created'], $a['created']);
        });
        
        return ['success' => true, 'data' => $backups];
    }

    private function restoreBackup(string $backupName): array
    {
        $backupPath = $this->dataDir . '/' . $backupName;
        
        if (!file_exists($backupPath)) {
            return ['success' => false, 'error' => 'Backup file not found'];
        }
        
        // Original-Pfad aus Backup-Namen rekonstruieren
        $parts = explode('_', $backupName, 4);
        if (count($parts) < 4) {
            return ['success' => false, 'error' => 'Invalid backup filename'];
        }
        
        $originalPath = str_replace('_', '/', $parts[3]);
        $fullPath = rex_path::base() . $originalPath;
        
        if (copy($backupPath, $fullPath)) {
            return ['success' => true, 'message' => 'Backup restored successfully'];
        } else {
            return ['success' => false, 'error' => 'Failed to restore backup'];
        }
    }

    private function deleteBackup(string $backupName): array
    {
        $backupPath = $this->dataDir . '/' . $backupName;
        
        if (!file_exists($backupPath)) {
            return ['success' => false, 'error' => 'Backup file not found'];
        }
        
        if (unlink($backupPath)) {
            return ['success' => true, 'message' => 'Backup deleted successfully'];
        } else {
            return ['success' => false, 'error' => 'Failed to delete backup'];
        }
    }

    private function cleanupOldBackups(): void
    {
        $cutoffTime = time() - (30 * 24 * 60 * 60); // 30 Tage
        $files = glob($this->dataDir . '/*');
        
        foreach ($files as $file) {
            if (is_file($file) && filemtime($file) < $cutoffTime) {
                unlink($file);
            }
        }
    }

    private function cleanupBackups(): array
    {
        // Debug-Ausgabe
        error_log("Code Editor - Cleanup backups started");
        error_log("- Backup directory: " . $this->dataDir);
        error_log("- Directory exists: " . (is_dir($this->dataDir) ? 'yes' : 'no'));
        
        if (!is_dir($this->dataDir)) {
            error_log("Code Editor - Backup directory does not exist");
            return ['success' => false, 'error' => 'Backup directory does not exist'];
        }
        
        $cutoffTime = time() - (30 * 24 * 60 * 60); // 30 Tage
        $files = glob($this->dataDir . '/*');
        $deletedCount = 0;
        $totalFiles = 0;
        
        error_log("Code Editor - Found " . count($files) . " files in backup directory");
        error_log("Code Editor - Cutoff time: " . date('Y-m-d H:i:s', $cutoffTime));
        
        foreach ($files as $file) {
            if (is_file($file)) {
                $totalFiles++;
                $fileTime = filemtime($file);
                $fileName = basename($file);
                
                error_log("Code Editor - Checking file: " . $fileName . " (created: " . date('Y-m-d H:i:s', $fileTime) . ")");
                
                if ($fileTime < $cutoffTime) {
                    error_log("Code Editor - File is older than 30 days, deleting: " . $fileName);
                    if (unlink($file)) {
                        $deletedCount++;
                        error_log("Code Editor - Successfully deleted: " . $fileName);
                    } else {
                        error_log("Code Editor - Failed to delete: " . $fileName);
                    }
                } else {
                    error_log("Code Editor - File is newer than 30 days, keeping: " . $fileName);
                }
            }
        }
        
        error_log("Code Editor - Cleanup completed: " . $deletedCount . " of " . $totalFiles . " files deleted");
        
        return [
            'success' => true, 
            'message' => $deletedCount . ' von ' . $totalFiles . ' Backups wurden gelöscht (älter als 30 Tage)'
        ];
    }

    private function createTestBackups(): array
    {
        // Test-Backups erstellen für Debugging
        $testContent = "<?php\n// Test backup file\necho 'Hello World';\n";
        
        // Ein aktuelles Backup
        $currentBackup = $this->dataDir . '/' . date('Y-m-d_H-i-s') . '_test_current.php';
        file_put_contents($currentBackup, $testContent);
        
        // Ein altes Backup (35 Tage alt)
        $oldBackup = $this->dataDir . '/' . date('Y-m-d_H-i-s', time() - (35 * 24 * 60 * 60)) . '_test_old.php';
        file_put_contents($oldBackup, $testContent);
        
        // Datum des alten Backups setzen
        touch($oldBackup, time() - (35 * 24 * 60 * 60));
        
        return [
            'success' => true,
            'message' => 'Test-Backups erstellt (1 aktuell, 1 alt)'
        ];
    }

    private function deleteAllBackups(): array
    {
        // Debug-Ausgabe
        error_log("Code Editor - Delete all backups started");
        error_log("- Backup directory: " . $this->dataDir);
        error_log("- Directory exists: " . (is_dir($this->dataDir) ? 'yes' : 'no'));
        
        if (!is_dir($this->dataDir)) {
            error_log("Code Editor - Backup directory does not exist");
            return ['success' => false, 'error' => 'Backup directory does not exist'];
        }
        
        $files = glob($this->dataDir . '/*');
        $deletedCount = 0;
        $totalFiles = 0;
        
        error_log("Code Editor - Found " . count($files) . " files in backup directory");
        
        foreach ($files as $file) {
            if (is_file($file)) {
                $totalFiles++;
                $fileName = basename($file);
                
                error_log("Code Editor - Deleting file: " . $fileName);
                
                if (unlink($file)) {
                    $deletedCount++;
                    error_log("Code Editor - Successfully deleted: " . $fileName);
                } else {
                    error_log("Code Editor - Failed to delete: " . $fileName);
                }
            }
        }
        
        error_log("Code Editor - Delete all completed: " . $deletedCount . " of " . $totalFiles . " files deleted");
        
        return [
            'success' => true, 
            'message' => $deletedCount . ' von ' . $totalFiles . ' Backups wurden gelöscht'
        ];
    }

    private function isAllowedPath(string $path): bool
    {
        $basePath = rex_path::base();
        $realPath = realpath($path);
        $realBasePath = realpath($basePath);
        
        return $realPath && $realBasePath && strpos($realPath, $realBasePath) === 0;
    }

    private function isAllowedExtension(string $extension): bool
    {
        return in_array($extension, $this->allowedExtensions, true);
    }

    private function isExcludedDir(string $dirname): bool
    {
        return in_array($dirname, $this->excludedDirs, true);
    }

    /**
     * Prüft ob eine Datei geschützt ist und nicht gelöscht werden darf
     */
    private function isProtectedFile(string $filePath): bool
    {
        $fileName = basename($filePath);
        $relativePath = ltrim(str_replace(rex_path::base(), '', $filePath), '/');
        
        // Direkte Dateinamen-Überprüfung
        if (in_array($fileName, $this->protectedFiles, true)) {
            return true;
        }
        
        // Relative Pfad-Überprüfung für Root-Dateien
        if (in_array($relativePath, $this->protectedFiles, true)) {
            return true;
        }
        
        // Zusätzliche Muster-basierte Überprüfung
        $protectedPatterns = [
            '/^\.htaccess$/',           // .htaccess-Dateien
            '/^index\.php$/',           // index.php-Dateien (auch in Unterordnern)
            '/^config\.(yml|yaml)$/',   // config.yml/yaml-Dateien
            '/^\.env/',                 // Alle .env-Dateien
            '/^boot\.php$/',            // boot.php-Dateien
            '/^install\.php$/',         // install.php-Dateien
            '/composer\.(json|lock)$/', // composer-Dateien
            '/package(-lock)?\.json$/', // npm/node-Dateien
            '/yarn\.lock$/',            // yarn-Dateien
        ];
        
        foreach ($protectedPatterns as $pattern) {
            if (preg_match($pattern, $fileName)) {
                return true;
            }
        }
        
        return false;
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $factor = floor((strlen($bytes) - 1) / 3);
        return sprintf("%.1f %s", $bytes / pow(1024, $factor), $units[$factor]);
    }

    private function getOwnerGroup(string $path): string
    {
        $owner = '-';
        $group = '-';

        $ownerId = @fileowner($path);
        $groupId = @filegroup($path);

        if (false !== $ownerId) {
            if (function_exists('posix_getpwuid')) {
                $ownerInfo = @posix_getpwuid($ownerId);
                $owner = is_array($ownerInfo) && isset($ownerInfo['name']) ? (string) $ownerInfo['name'] : (string) $ownerId;
            } else {
                $owner = (string) $ownerId;
            }
        }

        if (false !== $groupId) {
            if (function_exists('posix_getgrgid')) {
                $groupInfo = @posix_getgrgid($groupId);
                $group = is_array($groupInfo) && isset($groupInfo['name']) ? (string) $groupInfo['name'] : (string) $groupId;
            } else {
                $group = (string) $groupId;
            }
        }

        return $owner . ':' . $group;
    }

    private function getPermissionsOctal(string $path): string
    {
        $permissions = @fileperms($path);
        if (false === $permissions) {
            return '-';
        }

        return substr(sprintf('%o', $permissions), -4);
    }

    private function getPermissionsSymbolic(string $path): string
    {
        $permissions = @fileperms($path);
        if (false === $permissions) {
            return '-';
        }

        $symbolic = is_dir($path) ? 'd' : '-';

        $map = [
            0x0100 => 'r', 0x0080 => 'w', 0x0040 => 'x',
            0x0020 => 'r', 0x0010 => 'w', 0x0008 => 'x',
            0x0004 => 'r', 0x0002 => 'w', 0x0001 => 'x',
        ];

        foreach ($map as $mask => $char) {
            $symbolic .= ($permissions & $mask) ? $char : '-';
        }

        return $symbolic;
    }

    /**
     * Löscht eine Datei in den Trash (virtuelle Löschung)
     */
    private function deleteFile(string $filePath): array
    {
        $basePath = rex_path::base();
        $fullPath = $basePath . ltrim($filePath, '/');
        
        error_log("Code Editor - Delete file attempt:");
        error_log("- File path: " . $filePath);
        error_log("- Full path: " . $fullPath);
        error_log("- File exists: " . (file_exists($fullPath) ? 'yes' : 'no'));
        
        if (!file_exists($fullPath) || !$this->isAllowedPath($fullPath)) {
            error_log("Code Editor - Error: File not found or not allowed");
            return ['success' => false, 'error' => 'File not found or not allowed'];
        }

        // Prüfung auf geschützte Dateien
        if ($this->isProtectedFile($fullPath)) {
            error_log("Code Editor - Error: File is protected from deletion: " . $filePath);
            return [
                'success' => false, 
                'error' => 'Diese Datei ist systemkritisch und kann nicht gelöscht werden: ' . basename($filePath)
            ];
        }

        if (!is_writable($fullPath)) {
            error_log("Code Editor - Error: File not writable");
            return ['success' => false, 'error' => 'File not writable'];
        }

        try {
            // Backup erstellen vor der Löschung
            $this->createBackup($fullPath);
            
            // Datei in Trash verschieben - bessere Pfad-Behandlung
            $relativePath = str_replace($basePath, '', $fullPath);
            $relativePath = ltrim($relativePath, '/'); // Führende Slashes entfernen
            
            // Sichere Dateiname-Erstellung für Trash
            $safeFileName = str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], '_', $relativePath);
            $trashName = date('Y-m-d_H-i-s') . '_' . $safeFileName . '.trash';
            $trashPath = $this->trashDir . '/' . $trashName;
            
            // Zusätzliche Metadaten in separater Datei speichern
            $metaData = [
                'originalPath' => $relativePath,
                'originalFullPath' => $fullPath,
                'deletedAt' => date('Y-m-d H:i:s'),
                'size' => filesize($fullPath)
            ];
            
            $metaPath = $this->trashDir . '/' . $trashName . '.meta';
            file_put_contents($metaPath, json_encode($metaData, JSON_PRETTY_PRINT));
            
            error_log("Code Editor - Trash details:");
            error_log("- Original path: " . $relativePath);
            error_log("- Trash name: " . $trashName);
            error_log("- Meta file: " . $metaPath);
            
            // Datei in Trash verschieben
            if (rename($fullPath, $trashPath)) {
                error_log("Code Editor - File moved to trash successfully: " . $trashName);
                return [
                    'success' => true, 
                    'message' => 'File moved to trash successfully',
                    'trashFile' => $trashName
                ];
            } else {
                error_log("Code Editor - Failed to move file to trash");
                return ['success' => false, 'error' => 'Failed to move file to trash'];
            }
        } catch (Exception $e) {
            error_log("Code Editor - Delete failed: " . $e->getMessage());
            return ['success' => false, 'error' => 'Delete failed: ' . $e->getMessage()];
        }
    }

    /**
     * Listet alle Dateien im Trash auf
     */
    private function listTrash(): array
    {
        $trashFiles = [];
        $files = glob($this->trashDir . '/*.trash');
        
        foreach ($files as $file) {
            if (is_file($file)) {
                $fileName = basename($file);
                $metaFile = $file . '.meta';
                
                // Metadaten laden falls vorhanden
                if (file_exists($metaFile)) {
                    $metaData = json_decode(file_get_contents($metaFile), true);
                    $originalPath = $metaData['originalPath'] ?? 'Unknown path';
                    $deletedAt = $metaData['deletedAt'] ?? date('d.m.Y H:i:s', filemtime($file));
                } else {
                    // Fallback: Versuche Pfad aus Dateiname zu rekonstruieren (alte Methode)
                    $parts = explode('_', $fileName, 4);
                    if (count($parts) >= 4) {
                        $originalPath = str_replace('_', '/', $parts[3]);
                        $originalPath = str_replace('.trash', '', $originalPath);
                    } else {
                        $originalPath = 'Unknown path (legacy)';
                    }
                    $deletedAt = date('d.m.Y H:i:s', filemtime($file));
                }
                
                $trashFiles[] = [
                    'name' => $fileName,
                    'originalPath' => $originalPath,
                    'size' => $this->formatBytes(filesize($file)),
                    'deleted' => $deletedAt
                ];
            }
        }
        
        // Sortieren nach Löschdatum (neueste zuerst)
        usort($trashFiles, function($a, $b) {
            return strcmp($b['deleted'], $a['deleted']);
        });
        
        return ['success' => true, 'data' => $trashFiles];
    }

    /**
     * Stellt eine Datei aus dem Trash wieder her
     */
    private function restoreFromTrash(string $trashName): array
    {
        $trashPath = $this->trashDir . '/' . $trashName;
        $metaPath = $trashPath . '.meta';
        
        if (!file_exists($trashPath)) {
            return ['success' => false, 'error' => 'Trash file not found'];
        }
        
        // Originalen Pfad aus Metadaten lesen
        if (file_exists($metaPath)) {
            $metaData = json_decode(file_get_contents($metaPath), true);
            $originalPath = $metaData['originalPath'] ?? null;
            $originalFullPath = $metaData['originalFullPath'] ?? null;
        } else {
            // Fallback: Versuche Pfad aus Dateiname zu rekonstruieren
            $parts = explode('_', $trashName, 4);
            if (count($parts) < 4) {
                return ['success' => false, 'error' => 'Invalid trash filename and no metadata'];
            }
            
            $originalPath = str_replace('_', '/', $parts[3]);
            $originalPath = str_replace('.trash', '', $originalPath);
            $originalFullPath = rex_path::base() . $originalPath;
        }
        
        if (!$originalPath) {
            return ['success' => false, 'error' => 'Could not determine original path'];
        }
        
        $fullPath = $originalFullPath ?: (rex_path::base() . $originalPath);
        
        // Prüfen ob Zieldatei bereits existiert
        if (file_exists($fullPath)) {
            return ['success' => false, 'error' => 'Target file already exists: ' . $originalPath];
        }
        
        // Zielverzeichnis erstellen falls nötig
        $targetDir = dirname($fullPath);
        if (!is_dir($targetDir)) {
            rex_dir::create($targetDir);
        }
        
        if (rename($trashPath, $fullPath)) {
            // Metadaten-Datei auch löschen
            if (file_exists($metaPath)) {
                unlink($metaPath);
            }
            
            return [
                'success' => true, 
                'message' => 'File restored from trash successfully',
                'restoredPath' => $originalPath
            ];
        } else {
            return ['success' => false, 'error' => 'Failed to restore file from trash'];
        }
    }

    /**
     * Löscht eine Datei endgültig aus dem Trash
     */
    private function deleteFromTrash(string $trashName): array
    {
        $trashPath = $this->trashDir . '/' . $trashName;
        $metaPath = $trashPath . '.meta';
        
        if (!file_exists($trashPath)) {
            return ['success' => false, 'error' => 'Trash file not found'];
        }
        
        $success = true;
        
        // Trash-Datei löschen
        if (!unlink($trashPath)) {
            $success = false;
        }
        
        // Metadaten-Datei auch löschen
        if (file_exists($metaPath) && !unlink($metaPath)) {
            $success = false;
        }
        
        if ($success) {
            return ['success' => true, 'message' => 'File permanently deleted from trash'];
        } else {
            return ['success' => false, 'error' => 'Failed to delete file from trash completely'];
        }
    }

    /**
     * Leert den gesamten Trash
     */
    private function emptyTrash(): array
    {
        error_log("Code Editor - Empty trash started");
        error_log("- Trash directory: " . $this->trashDir);
        error_log("- Directory exists: " . (is_dir($this->trashDir) ? 'yes' : 'no'));
        
        if (!is_dir($this->trashDir)) {
            error_log("Code Editor - Trash directory does not exist");
            return ['success' => false, 'error' => 'Trash directory does not exist'];
        }
        
        $files = glob($this->trashDir . '/*.trash');
        $metaFiles = glob($this->trashDir . '/*.meta');
        $deletedCount = 0;
        $totalFiles = count($files);
        
        error_log("Code Editor - Found " . $totalFiles . " trash files and " . count($metaFiles) . " meta files");
        
        // Trash-Dateien löschen
        foreach ($files as $file) {
            if (is_file($file)) {
                $fileName = basename($file);
                
                error_log("Code Editor - Deleting trash file: " . $fileName);
                
                if (unlink($file)) {
                    $deletedCount++;
                    error_log("Code Editor - Successfully deleted: " . $fileName);
                } else {
                    error_log("Code Editor - Failed to delete: " . $fileName);
                }
            }
        }
        
        // Meta-Dateien löschen
        foreach ($metaFiles as $metaFile) {
            if (is_file($metaFile)) {
                $fileName = basename($metaFile);
                error_log("Code Editor - Deleting meta file: " . $fileName);
                
                if (!unlink($metaFile)) {
                    error_log("Code Editor - Failed to delete meta file: " . $fileName);
                }
            }
        }
        
        error_log("Code Editor - Empty trash completed: " . $deletedCount . " of " . $totalFiles . " files deleted");
        
        return [
            'success' => true, 
            'message' => $deletedCount . ' von ' . $totalFiles . ' Dateien wurden endgültig gelöscht'
        ];
    }

    /**
     * Erstellt eine neue Datei oder einen neuen Ordner
     */
    private function createFile(string $path, string $name, string $type = 'file'): array
    {
        if (empty($name)) {
            return ['success' => false, 'error' => 'Name ist erforderlich'];
        }

        // Sicherstellen, dass der Name keine gefährlichen Zeichen enthält
        if (preg_match('/[\/\\\\:\*\?"<>\|]/', $name)) {
            return ['success' => false, 'error' => 'Name enthält ungültige Zeichen'];
        }

        $basePath = rex_path::base();
        $fullPath = $basePath . ltrim($path, '/');
        
        if (!is_dir($fullPath) || !$this->isAllowedPath($fullPath)) {
            return ['success' => false, 'error' => 'Verzeichnis nicht gefunden oder nicht erlaubt'];
        }

        $newItemPath = $fullPath . '/' . $name;

        if (file_exists($newItemPath)) {
            return ['success' => false, 'error' => 'Datei oder Ordner existiert bereits'];
        }

        try {
            if ($type === 'folder') {
                // Ordner erstellen
                if (rex_dir::create($newItemPath)) {
                    return [
                        'success' => true, 
                        'message' => 'Ordner erfolgreich erstellt',
                        'path' => trim($path . '/' . $name, '/')
                    ];
                } else {
                    return ['success' => false, 'error' => 'Fehler beim Erstellen des Ordners'];
                }
            } else {
                // Datei erstellen
                $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                
                if (!$this->isAllowedExtension($extension)) {
                    return ['success' => false, 'error' => 'Dateityp nicht erlaubt'];
                }

                // Leere Datei mit Standard-Inhalt erstellen
                $content = $this->getDefaultFileContent($extension);
                
                if (rex_file::put($newItemPath, $content)) {
                    return [
                        'success' => true, 
                        'message' => 'Datei erfolgreich erstellt',
                        'path' => trim($path . '/' . $name, '/')
                    ];
                } else {
                    return ['success' => false, 'error' => 'Fehler beim Erstellen der Datei'];
                }
            }
        } catch (\Throwable $e) {
            error_log("Code Editor - Create failed: " . $e->getMessage());
            return ['success' => false, 'error' => 'Erstellen fehlgeschlagen: ' . $e->getMessage()];
        }
    }

    /**
     * Kopiert eine Datei
     */
    private function copyFile(string $filePath, string $newName = ''): array
    {
        if (empty($filePath)) {
            return ['success' => false, 'error' => 'Dateipfad ist erforderlich'];
        }

        $basePath = rex_path::base();
        $fullPath = $basePath . ltrim($filePath, '/');
        
        if (!file_exists($fullPath) || !$this->isAllowedPath($fullPath)) {
            return ['success' => false, 'error' => 'Datei nicht gefunden oder nicht erlaubt'];
        }

        if (is_dir($fullPath)) {
            return ['success' => false, 'error' => 'Ordner kopieren wird noch nicht unterstützt'];
        }

        $extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
        if (!$this->isAllowedExtension($extension)) {
            return ['success' => false, 'error' => 'Dateityp nicht erlaubt'];
        }

        // Neuen Dateinamen generieren
        $dir = dirname($fullPath);
        $originalName = pathinfo($fullPath, PATHINFO_FILENAME);
        $ext = pathinfo($fullPath, PATHINFO_EXTENSION);

        if (empty($newName)) {
            // Automatischen Namen mit _copy suffix generieren
            $counter = 1;
            do {
                $newFileName = $originalName . '_copy' . ($counter > 1 ? $counter : '') . '.' . $ext;
                $newFullPath = $dir . '/' . $newFileName;
                $counter++;
            } while (file_exists($newFullPath) && $counter < 100);
            
            if ($counter >= 100) {
                return ['success' => false, 'error' => 'Zu viele Kopien existieren bereits'];
            }
        } else {
            // Benutzerdefinierten Namen verwenden
            if (preg_match('/[\/\\\\:\*\?"<>\|]/', $newName)) {
                return ['success' => false, 'error' => 'Name enthält ungültige Zeichen'];
            }
            
            $newFullPath = $dir . '/' . $newName;
            
            if (file_exists($newFullPath)) {
                return ['success' => false, 'error' => 'Datei existiert bereits'];
            }
        }

        try {
            if (copy($fullPath, $newFullPath)) {
                $relativePath = str_replace($basePath, '', $newFullPath);
                $relativePath = ltrim($relativePath, '/');
                
                return [
                    'success' => true, 
                    'message' => 'Datei erfolgreich kopiert',
                    'path' => $relativePath,
                    'name' => basename($newFullPath)
                ];
            } else {
                return ['success' => false, 'error' => 'Fehler beim Kopieren der Datei'];
            }
        } catch (Exception $e) {
            error_log("Code Editor - Copy failed: " . $e->getMessage());
            return ['success' => false, 'error' => 'Kopieren fehlgeschlagen: ' . $e->getMessage()];
        }
    }

    /**
     * Gibt Standard-Inhalt für neue Dateien zurück
     */
    private function getDefaultFileContent(string $extension): string
    {
        switch ($extension) {
            case 'php':
                return "<?php\n\n// Neue PHP-Datei\n";
            case 'html':
            case 'htm':
                return "<!DOCTYPE html>\n<html lang=\"de\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Neues Dokument</title>\n</head>\n<body>\n    \n</body>\n</html>";
            case 'css':
                return "/* Neues Stylesheet */\n\n";
            case 'scss':
            case 'less':
                return "// Neues Stylesheet\n\n";
            case 'js':
                return "// Neue JavaScript-Datei\n\n";
            case 'json':
                return "{\n    \n}";
            case 'xml':
                return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<root>\n    \n</root>";
            case 'md':
                return "# Neues Dokument\n\n";
            case 'sql':
                return "-- Neue SQL-Datei\n\n";
            case 'yml':
            case 'yaml':
                return "# Neue YAML-Datei\n\n";
            default:
                return '';
        }
    }
}

