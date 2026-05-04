/**
 * Monaco Editor Loader für REDAXO Code Editor
 * Version: 0.55.1
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
    static getVersion() { return '0.55.1'; }
}
window.MonacoLoader = MonacoLoader;
