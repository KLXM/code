const fs = require('fs-extra');
const path = require('path');

async function buildMonacoEditor() {
    console.log('🚀 Building Monaco Editor für REDAXO Code Editor AddOn...');
    
    const monacoSrcPath = path.join(__dirname, 'node_modules', 'monaco-editor', 'min');
    const monacoDestPath = path.join(__dirname, 'assets', 'monaco-editor');
    
    try {
        // Monaco Editor Verzeichnis erstellen
        await fs.ensureDir(monacoDestPath);
        
        // Monaco Editor Dateien kopieren
        console.log('📁 Kopiere Monaco Editor Dateien...');
        await fs.copy(monacoSrcPath, monacoDestPath, {
            overwrite: true,
            filter: (src, dest) => {
                // Nur notwendige Dateien kopieren
                const fileName = path.basename(src);
                const isDirectory = fs.statSync(src).isDirectory();
                
                // Verzeichnisse durchlassen
                if (isDirectory) return true;
                
                // Wichtige Dateien
                if (fileName.includes('loader') || 
                    fileName.includes('editor.main') ||
                    src.includes('/vs/')) {
                    return true;
                }
                return false;
            }
        });
        
        // Monaco Editor Wrapper erstellen
        console.log('⚙️ Erstelle Monaco Editor Wrapper...');
        const wrapperContent = `
/**
 * Monaco Editor Loader für REDAXO Code Editor
 * Lokale Version: ${getMonacoVersion()}
 */

class MonacoLoader {
    static async load() {
        if (typeof monaco !== 'undefined') {
            return Promise.resolve();
        }
        
        console.log('Loading Monaco Editor (local version)...');
        
        return new Promise((resolve, reject) => {
            // Lokalen Pfad zum Monaco Editor
            const basePath = rex.backend_url + 'assets/addons/code/monaco-editor';
            
            const script = document.createElement('script');
            script.src = basePath + '/vs/loader.js';
            
            script.onload = () => {
                require.config({ 
                    paths: { vs: basePath + '/vs' },
                    'vs/nls': {
                        availableLanguages: {
                            '*': 'de'
                        }
                    }
                });
                
                require(['vs/editor/editor.main'], () => {
                    console.log('Monaco Editor loaded successfully (local)');
                    resolve();
                });
            };
            
            script.onerror = () => {
                console.error('Failed to load Monaco Editor (local)');
                reject(new Error('Failed to load Monaco Editor'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    static getVersion() {
        return '${getMonacoVersion()}';
    }
}

// Global verfügbar machen
window.MonacoLoader = MonacoLoader;
`;
        
        await fs.writeFile(path.join(__dirname, 'assets', 'monaco-loader.js'), wrapperContent);
        
        // Version Info erstellen
        const versionInfo = {
            version: getMonacoVersion(),
            buildDate: new Date().toISOString(),
            files: await getFileList(monacoDestPath)
        };
        
        await fs.writeFile(
            path.join(__dirname, 'assets', 'monaco-version.json'), 
            JSON.stringify(versionInfo, null, 2)
        );
        
        console.log('✅ Monaco Editor Build erfolgreich!');
        console.log(`📦 Version: ${getMonacoVersion()}`);
        console.log(`📁 Ziel: ${monacoDestPath}`);
        
        // Usage Instructions
        console.log('\n📋 USAGE:');
        console.log('1. npm run update-monaco  - Monaco Editor aktualisieren');
        console.log('2. npm run build         - Nur Build ohne Update');
        console.log('3. Ersetze CDN-Load mit: await MonacoLoader.load()');
        
    } catch (error) {
        console.error('❌ Build Fehler:', error);
        process.exit(1);
    }
}

function getMonacoVersion() {
    try {
        const packageJson = require('./node_modules/monaco-editor/package.json');
        return packageJson.version;
    } catch (error) {
        return 'unknown';
    }
}

async function getFileList(dir) {
    const files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
        if (item.isDirectory()) {
            const subFiles = await getFileList(path.join(dir, item.name));
            files.push(...subFiles.map(f => path.join(item.name, f)));
        } else {
            files.push(item.name);
        }
    }
    
    return files;
}

// Build ausführen
if (require.main === module) {
    buildMonacoEditor().catch(console.error);
}

module.exports = { buildMonacoEditor };
