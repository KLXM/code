<?php

/**
 * Code Editor & File Browser
 * Bootstrap und Assets laden
 */

// API-Klasse laden
require_once __DIR__ . '/lib/code_api.php';

use KLXM\Code\CodeApi;

if (rex::isBackend()) {
    // CSS einbinden
    rex_view::addCssFile($this->getAssetsUrl('code-editor.css'));
    
    // JavaScript einbinden  
    rex_view::addJsFile($this->getAssetsUrl('code-editor.js'));
}

// API Endpoints registrieren
if (rex_get('code_api', 'bool')) {
    $action = rex_get('action', 'string');
    $page = rex_get('page', 'string');
    
    // Debug-Ausgabe
    error_log("Code API called from page: " . $page . " with action: " . $action);
    
    try {
        $api = new CodeApi();
        $response = $api->handleRequest($action);
        
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } catch (Exception $e) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
        exit;
    }
}
