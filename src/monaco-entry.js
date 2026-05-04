/**
 * Monaco Editor ESM Entry Point
 * Wird von esbuild zu einem IIFE-Bundle kompiliert.
 *
 * MonacoEnvironment muss VOR der ersten Editor-Instanz gesetzt sein.
 * Da Worker nur lazy (beim ersten monaco.editor.create mit Sprachunterstützung)
 * erstellt werden, ist die Zuweisung nach dem Import korrekt.
 */
import * as monaco from 'monaco-editor';

window.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        const base = window.__monacoWorkersPath || '';
        if (label === 'json') return base + '/json.worker.js';
        if (label === 'css' || label === 'scss' || label === 'less') return base + '/css.worker.js';
        if (label === 'html' || label === 'handlebars' || label === 'razor') return base + '/html.worker.js';
        if (label === 'typescript' || label === 'javascript') return base + '/ts.worker.js';
        return base + '/editor.worker.js';
    }
};

window.monaco = monaco;
