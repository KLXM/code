const fs = require('fs-extra');
const path = require('path');
const esbuild = require('esbuild');

async function buildMonacoEditor() {
    console.log('🚀 Building Monaco Editor für REDAXO Code Editor AddOn (ESM)...');

    const destDir = path.join(__dirname, 'assets', 'monaco-editor');
    const workersDir = path.join(destDir, 'workers');

    await fs.ensureDir(destDir);
    await fs.ensureDir(workersDir);

    const version = getMonacoVersion();

    // --- Haupt-Bundle (IIFE, enthält vollständige Monaco-API) ---
    console.log('📦 Baue monaco.bundle.js ...');
    await esbuild.build({
        entryPoints: [path.join(__dirname, 'src/monaco-entry.js')],
        bundle: true,
        outfile: path.join(destDir, 'monaco.bundle.js'),
        format: 'iife',
        minify: true,
        sourcemap: false,
        loader: {
            '.ttf': 'file',
            '.svg': 'file',
            '.png': 'file',
        },
        // Schriftarten neben der JS-Datei ablegen
        assetNames: 'fonts/[name]-[hash]',
    });

    // --- Web Workers ---
    console.log('⚙️  Baue Web Worker Bundles ...');
    await esbuild.build({
        entryPoints: {
            'editor.worker': path.join(__dirname, 'src/workers/editor.worker.js'),
            'json.worker':   path.join(__dirname, 'src/workers/json.worker.js'),
            'css.worker':    path.join(__dirname, 'src/workers/css.worker.js'),
            'html.worker':   path.join(__dirname, 'src/workers/html.worker.js'),
            'ts.worker':     path.join(__dirname, 'src/workers/ts.worker.js'),
        },
        bundle: true,
        outdir: workersDir,
        format: 'iife',
        minify: true,
        sourcemap: false,
    });

    // --- Monaco Loader generieren ---
    console.log('⚙️  Erstelle monaco-loader.js ...');
    const loaderContent = `/**
 * Monaco Editor Loader für REDAXO Code Editor
 * Version: ${version}
 * Build: ESM (esbuild)
 */
class MonacoLoader {
    static async load() {
        if (typeof window.monaco !== 'undefined') {
            return Promise.resolve();
        }
        const basePath = (rex && rex.code_monaco_assets_url) ? rex.code_monaco_assets_url : '';
        window.__monacoWorkersPath = basePath + '/workers';
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = basePath + '/monaco.bundle.js';
            script.onload = () => {
                if (typeof window.monaco !== 'undefined') {
                    resolve();
                } else {
                    reject(new Error('monaco not defined after bundle load'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load Monaco Editor bundle'));
            document.head.appendChild(script);
        });
    }
    static getVersion() { return '${version}'; }
}
window.MonacoLoader = MonacoLoader;
`;
    await fs.writeFile(path.join(__dirname, 'assets', 'monaco-loader.js'), loaderContent);

    // --- Version JSON ---
    await fs.writeJson(path.join(destDir, 'monaco-version.json'), {
        version,
        buildDate: new Date().toISOString(),
        buildTool: 'esbuild',
    }, { spaces: 2 });

    console.log('✅ Monaco Editor Build erfolgreich!');
    console.log(`📦 Version: ${version}`);
    console.log(`📁 Ziel: ${destDir}`);
    console.log('\n📋 USAGE:');
    console.log('1. npm run update-monaco  - Monaco Editor aktualisieren');
    console.log('2. npm run build         - Nur Build ohne Update');
    console.log('3. Loader: await MonacoLoader.load()');
}

function getMonacoVersion() {
    try {
        return require('./node_modules/monaco-editor/package.json').version;
    } catch {
        return 'unknown';
    }
}

if (require.main === module) {
    buildMonacoEditor().catch((err) => {
        console.error('❌ Build Fehler:', err);
        process.exit(1);
    });
}

module.exports = { buildMonacoEditor };

