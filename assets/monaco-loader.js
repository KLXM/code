/**
 * Monaco Editor Loader für REDAXO Code Editor
 * Lokale Version: 0.45.0
 * Vereinfachte Version ohne AMD/require
 */

class MonacoLoader {
    static async load() {
        if (typeof monaco !== 'undefined') {
            console.log('Monaco already loaded');
            return Promise.resolve();
        }
        
        console.log('Loading Monaco Editor (local version)...');
        
        return new Promise((resolve, reject) => {
            // Lokalen Pfad zum Monaco Editor
            const basePath = '/assets/addons/code/monaco-editor';
            
            // Zuerst CSS laden
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = basePath + '/vs/editor/editor.main.css';
            document.head.appendChild(cssLink);
            
            // Dann AMD Loader laden
            const loaderScript = document.createElement('script');
            loaderScript.src = basePath + '/vs/loader.js';
            
            loaderScript.onload = () => {
                // AMD Loader konfigurieren
                if (typeof require !== 'undefined') {
                    require.config({ 
                        paths: { vs: basePath + '/vs' },
                        'vs/nls': {
                            availableLanguages: {
                                '*': 'de'
                            }
                        },
                        // Source Maps deaktivieren um 404-Fehler zu vermeiden
                        map: {},
                        bundles: {},
                        config: {
                            'vs/editor/editor.main': {
                                'vs/css': { disabled: true }
                            }
                        }
                    });
                    
                    // Globale require-Konfiguration für Source Maps
                    if (typeof window !== 'undefined') {
                        window.MonacoEnvironment = {
                            getWorkerUrl: function (workerId, label) {
                                return basePath + `/vs/base/worker/workerMain.js`;
                            }
                        };
                    }
                    
                    // Monaco Editor laden
                    require(['vs/editor/editor.main'], () => {
                        console.log('Monaco Editor loaded successfully (local)');
                        resolve();
                    }, (error) => {
                        console.error('Failed to load Monaco Editor modules:', error);
                        reject(error);
                    });
                } else {
                    console.warn('AMD require not available, trying direct load...');
                    // Fallback: Direktes Laden des Monaco Editors
                    const editorScript = document.createElement('script');
                    editorScript.src = basePath + '/vs/editor/editor.main.js';
                    
                    editorScript.onload = () => {
                        console.log('Monaco Editor loaded successfully (direct)');
                        resolve();
                    };
                    
                    editorScript.onerror = () => {
                        console.error('Failed to load Monaco Editor (direct)');
                        reject(new Error('Failed to load Monaco Editor'));
                    };
                    
                    document.head.appendChild(editorScript);
                }
            };
            
            loaderScript.onerror = () => {
                console.error('Failed to load Monaco Editor loader');
                reject(new Error('Failed to load Monaco Editor loader'));
            };
            
            document.head.appendChild(loaderScript);
        });
    }
    
    static getVersion() {
        return '0.45.0';
    }
}

// Global verfügbar machen
window.MonacoLoader = MonacoLoader;
