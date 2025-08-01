<?php

namespace KLXM\Code;

use rex_addon;
use rex_config;
use rex_dir;
use rex_package;

/**
 * Selbstdeaktivierungs-System für das Code Addon
 * Deaktiviert das Addon automatisch nach einer konfigurierten Zeit
 */
class CodeSelfDestruct
{
    private rex_addon $addon;
    private string $configKey = 'last_used_time';
    
    public function __construct()
    {
        $this->addon = rex_addon::get('code');
    }

    /**
     * Initialisiert das Selbstdeaktivierungs-System
     * Setzt den "last_used" Timestamp bei jeder Nutzung
     */
    public function initialize(): void
    {
        // Letzte Nutzungszeit auf jetzt setzen (bei jeder Nutzung aktualisieren)
        rex_config::set('code', $this->configKey, time());
    }

    /**
     * Prüft und führt die Selbstdeaktivierung aus
     * Gibt Status zurück ohne UI-Ausgaben
     */
    public function checkAndExecute(): array
    {
        $lastUsedTime = (int) rex_config::get('code', $this->configKey, 0);
        $currentTime = time();
        
        // Wenn noch nie benutzt, dann jetzt als erste Nutzung markieren
        if ($lastUsedTime === 0) {
            rex_config::set('code', $this->configKey, $currentTime);
            $lastUsedTime = $currentTime;
        }
        
        // Konfiguration aus package.yml lesen
        $config = $this->addon->getProperty('config', []);
        $deactivateAfterDays = (int) ($config['auto_deactivate_after_days'] ?? 2);
        $cleanupData = (bool) ($config['cleanup_data_on_deactivate'] ?? true);
        
        // Wenn Deaktivierung deaktiviert ist (0 Tage)
        if ($deactivateAfterDays <= 0) {
            return [
                'status' => 'disabled',
                'message' => 'Auto-deactivation is disabled'
            ];
        }
        
        // Prüfen ob Zeit seit letzter Nutzung abgelaufen ist
        $maxInactivityTime = $deactivateAfterDays * 24 * 60 * 60; // Tage in Sekunden
        $timeSinceLastUse = $currentTime - $lastUsedTime;
        
        if ($timeSinceLastUse >= $maxInactivityTime) {
            // Zeit seit letzter Nutzung abgelaufen - Deaktivierung durchführen
            return $this->executeDeactivation($cleanupData);
        }
        
        return [
            'status' => 'active',
            'time_since_last_use' => $timeSinceLastUse,
            'time_remaining' => $maxInactivityTime - $timeSinceLastUse,
            'hours_remaining' => round(($maxInactivityTime - $timeSinceLastUse) / 3600, 1)
        ];
    }

    /**
     * Führt die Deaktivierung durch
     */
    private function executeDeactivation(bool $cleanupData): array
    {
        try {
            // Daten bereinigen falls aktiviert
            if ($cleanupData) {
                $this->cleanupAddonData();
            }
            
            // Addon deaktivieren über REDAXO Package System
            $package = rex_package::get('code');
            if ($package && $package->isAvailable()) {
                $package->setProperty('status', false);
            }
            
            // Alternative: Addon als "inaktiv" markieren über Config
            rex_config::set('code', 'force_inactive', true);
            
            // Konfiguration bereinigen
            rex_config::removeNamespace('code');
            
            return [
                'status' => 'deactivated',
                'message' => 'Addon has been automatically deactivated and data cleaned up'
            ];
            
        } catch (\Exception $e) {
            // Fehler beim Deaktivieren - trotzdem als deaktiviert markieren
            return [
                'status' => 'deactivated',
                'message' => 'Deactivation attempted with errors: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Bereinigt alle Addon-Daten vor der Deaktivierung
     */
    private function cleanupAddonData(): void
    {
        try {
            // Backup-Verzeichnis löschen
            $backupDir = $this->addon->getDataPath('backups');
            if (is_dir($backupDir)) {
                rex_dir::delete($backupDir);
            }
            
            // Trash-Verzeichnis löschen
            $trashDir = $this->addon->getDataPath('trash');
            if (is_dir($trashDir)) {
                rex_dir::delete($trashDir);
            }
            
            // Komplettes Data-Verzeichnis löschen falls leer
            $dataDir = $this->addon->getDataPath();
            if (is_dir($dataDir) && $this->isDirEmpty($dataDir)) {
                rex_dir::delete($dataDir);
            }
            
        } catch (\Exception $e) {
            // Fehler beim Bereinigen ignorieren - Deaktivierung soll trotzdem erfolgen
            error_log("Code Addon - Cleanup error: " . $e->getMessage());
        }
    }

    /**
     * Prüft ob ein Verzeichnis leer ist
     */
    private function isDirEmpty(string $dir): bool
    {
        if (!is_dir($dir)) {
            return true;
        }
        
        $files = array_diff(scandir($dir), ['.', '..']);
        return empty($files);
    }

    /**
     * Gibt verbleibende Zeit in lesbarem Format zurück
     */
    public function getTimeRemainingFormatted(): string
    {
        $status = $this->checkAndExecute();
        
        if ($status['status'] === 'disabled') {
            return 'Deaktiviert';
        }
        
        if ($status['status'] === 'deactivated') {
            return 'Deaktiviert';
        }
        
        if (!isset($status['time_remaining'])) {
            return 'Unbekannt';
        }
        
        $hours = $status['hours_remaining'];
        
        if ($hours >= 24) {
            $days = round($hours / 24, 1);
            return $days . ' Tag' . ($days !== 1.0 ? 'e' : '');
        } else {
            return round($hours, 1) . ' Stunde' . ($hours !== 1.0 ? 'n' : '');
        }
    }
}
