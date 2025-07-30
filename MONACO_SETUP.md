# Monaco Editor Setup für Code Editor AddOn

## Überblick

Das Code Editor AddOn verwendet eine **lokale Monaco Editor Installation** statt CDN, um maximale Verfügbarkeit in Notfallsituationen zu gewährleisten.

## Installation & Setup

### 1. Dependencies installieren
```bash
cd src/addons/code
npm install
```

### 2. Monaco Editor lokal bauen
```bash
npm run build
```

### 3. Monaco Editor aktualisieren
```bash
npm run update-monaco
```

## Ordnerstruktur nach Build

```
src/addons/code/
├── assets/
│   ├── monaco-editor/          # Lokale Monaco Editor Dateien
│   │   └── vs/                 # Monaco Core Files
│   ├── monaco-loader.js        # Lokaler Monaco Loader
│   ├── monaco-version.json     # Version Info
│   ├── code-editor.js          # Hauptlogik (mit lokalem Monaco)
│   └── code-editor.css         # Styles
├── package.json                # NPM Dependencies
├── build.js                    # Build Script
└── node_modules/               # NPM Dependencies (nicht im Git)
```

## Funktionsweise

1. **Lokaler Load**: AddOn lädt Monaco Editor aus `assets/monaco-editor/`
2. **CDN Fallback**: Falls lokal nicht verfügbar, automatischer CDN-Fallback
3. **Versionskontrolle**: `monaco-version.json` trackt aktuelle Version
4. **Cache-Busting**: Automatische Cache-Invalidierung bei Updates
5. **Vollbild-Modus**: F11 oder Vollbild-Button für bessere Übersicht

## Updates

### Monaco Editor auf neue Version aktualisieren
```bash
npm run update-monaco
```

### Nur Build ohne Update
```bash
npm run build
```

### Nach Updates
- Dateien nach `public/assets/addons/code/` kopieren
- Browser-Cache leeren
- AddOn neu laden

## Vorteile der lokalen Installation

✅ **Offline-Verfügbarkeit** - Funktioniert ohne Internet  
✅ **Notfall-sicher** - Kein CDN-Ausfall-Risiko  
✅ **Kontrollierte Updates** - Manuelle Version-Upgrades  
✅ **Performance** - Lokale Dateien, kein externes Loading  
✅ **Sicherheit** - Keine externen Dependencies zur Laufzeit  
✅ **Vollbild-Editor** - F11 oder Button für ablenkungsfreies Arbeiten  

## Entwicklung

### Monaco Editor Version prüfen
```bash
cat assets/monaco-version.json
```

### Build-Output prüfen
```bash
ls -la assets/monaco-editor/vs/
```

### Fallback testen
```javascript
// In Browser Console
delete window.monaco;
// Seite neu laden - sollte CDN-Fallback verwenden
```

## Troubleshooting

### Problem: Monaco Editor lädt nicht
1. Build ausführen: `npm run build`
2. Dateien nach public kopieren
3. Browser-Cache leeren

### Problem: Veraltete Version
1. `npm run update-monaco`
2. Dateien synchronisieren
3. AddOn neu starten

### Problem: CDN-Fallback aktiviert
- Prüfe ob lokale Dateien existieren: `assets/monaco-editor/vs/loader.js`
- Build neu ausführen
- Dateiberechtigungen prüfen

## Deployment

Für Produktionsumgebung:
1. `npm install --production`
2. `npm run build` 
3. Nur `assets/` Ordner deployen
4. `node_modules/` **nicht** deployen
