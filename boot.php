<?php

/**
 * Code Editor & File Browser
 * Bootstrap und Assets laden
 */

// API-Klasse laden
require_once __DIR__ . '/lib/code_api.php';

use FriendsOfRedaxo\Code\CodeApi;
use FriendsOfRedaxo\Code\Api\RoutePackage\Backend\Code as ApiBackendCodeRoutePackage;
use FriendsOfRedaxo\Code\Api\RoutePackage\Code as ApiCodeRoutePackage;
use FriendsOfRedaxo\Api\RouteCollection;

if (rex::isBackend()) {
    $addon = rex_addon::get('code');
    
    // Check if be_style codemirror is active
    if (rex_plugin::get('be_style', 'codemirror')->isAvailable()) {
        rex_view::setJsProperty('code_addon_codemirror_active', true);
    }

    // Config-Werte als JavaScript Properties bereitstellen
    rex_view::setJsProperty('code_replace_rex_code', $addon->getConfig('replace_rex_code', '1'));
    rex_view::setJsProperty('code_monaco_assets_url', $this->getAssetsUrl('monaco-editor'));

    rex_view::addCssFile($this->getAssetsUrl('code-editor.css'));

    // Monaco Editor CSS (ESM-Build, generiert von esbuild)
    if (file_exists($this->getPath('assets/monaco-editor/monaco.bundle.css'))) {
        rex_view::addCssFile($this->getAssetsUrl('monaco-editor/monaco.bundle.css'));
    }

    // Monaco Loader vorab registrieren (generiert von build.js, enthält MonacoLoader-Klasse)
    if (file_exists($this->getPath('assets/monaco-loader.js'))) {
        rex_view::addJsFile($this->getAssetsUrl('monaco-loader.js'));
    }

    rex_view::addJsFile($this->getAssetsUrl('code-editor.js'));
}

if (rex_addon::get('api')->isAvailable() && class_exists(RouteCollection::class)) {
    RouteCollection::registerRoutePackage(new ApiCodeRoutePackage());
    RouteCollection::registerRoutePackage(new ApiBackendCodeRoutePackage());
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
