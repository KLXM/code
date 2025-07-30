<?php

namespace KLXM\Code;

use Exception;
use rex_addon;
use rex_dir;
use rex_path;
use rex_get;
use rex_post;

/**
 * Code Editor API Handler
 * Basierend auf NextCloud AddOn Struktur
 */
class CodeApi
{
    private string $dataDir;
    private array $allowedExtensions = [
        'php', 'html', 'htm', 'css', 'scss', 'less', 'js', 'json', 'xml', 'sql', 
        'md', 'txt', 'yml', 'yaml', 'ini', 'conf', 'htaccess', 'gitignore', 'env',
        'twig', 'vue', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'java', 'c', 'cpp'
    ];
    
    private array $excludedDirs = [
        'node_modules', '.git', '.svn', 'vendor', 'cache', 'log', 'tmp', 'temp'
    ];

    public function __construct()
    {
        $this->dataDir = rex_addon::get('code')->getDataPath('backups');
        if (!is_dir($this->dataDir)) {
            rex_dir::create($this->dataDir);
        }
    }

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
            case 'search':
                return $this->searchFiles(rex_get('term', 'string'));
            case 'backup-list':
                return $this->listBackups();
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
            default:
                throw new Exception('Unknown action: ' . $action);
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
                        'modified' => date('d.m.Y H:i', filemtime($filePath))
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
                        'writable' => is_writable($filePath)
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
        
        $this->searchInDirectory($basePath, $searchTerm, $results);
        
        return ['success' => true, 'data' => $results];
    }

    private function searchInDirectory(string $dir, string $searchTerm, array &$results): void
    {
        if (!is_dir($dir) || !$this->isAllowedPath($dir)) return;
        
        $files = scandir($dir);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            
            $filePath = $dir . '/' . $file;
            
            if (is_dir($filePath)) {
                $dirName = basename($filePath);
                if (!$this->isExcludedDir($dirName)) {
                    $this->searchInDirectory($filePath, $searchTerm, $results);
                }
            } else {
                $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if ($this->isAllowedExtension($extension)) {
                    $content = file_get_contents($filePath);
                        if (stripos($content, $searchTerm) !== false) {
                            $relativePath = str_replace(rex_path::base(), '', $filePath);
                            $lines = explode("\n", $content);
                            $matches = [];                        foreach ($lines as $lineNum => $line) {
                            if (stripos($line, $searchTerm) !== false) {
                                $matches[] = [
                                    'line' => $lineNum + 1,
                                    'content' => trim($line)
                                ];
                                if (count($matches) >= 5) break; // Max 5 Matches pro Datei
                            }
                        }
                        
                        $results[] = [
                            'path' => $relativePath,
                            'file' => $relativePath, // Für Kompatibilität
                            'matches' => $matches
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

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $factor = floor((strlen($bytes) - 1) / 3);
        return sprintf("%.1f %s", $bytes / pow(1024, $factor), $units[$factor]);
    }
}
