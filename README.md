# Code Editor & File Browser AddOn

Ein einfacher File Browser mit integriertem Monaco Code Editor für REDAXO, basierend auf dem Design des NextCloud AddOns.

## Features

- **File Browser** - Durchsuchen aller Projektdateien im NextCloud-Design
- **Code Editor** - Monaco Editor (VS Code) Integration  
- **Live Suche** - Volltext-Suche in allen Code-Dateien
- **Backup System** - Automatische Backups vor Änderungen
- **REDAXO Integration** - Nutzt PJAX und rex:ready Events
- **Admin Only** - Nur für Administratoren verfügbar

## Verwendung

1. **File Browser**: Navigieren Sie durch die Dateien wie im NextCloud AddOn
2. **Datei bearbeiten**: Doppelklick oder Edit-Button öffnet den Monaco Editor
3. **Speichern**: Strg+S oder Save-Button
4. **Suchen**: Code-Suche findet Text in allen unterstützten Dateien
5. **Backups**: Automatische Sicherung, Wiederherstellung möglich

## Unterstützte Dateitypen

PHP, HTML, CSS, JavaScript, JSON, XML, SQL, Markdown, YAML, und viele mehr.

## Monaco Editor

- **Version**: 0.45.0 (CDN)
- **Update**: Einfach Version in `main.php` ändern
- **Features**: Syntax Highlighting, IntelliSense, Fehlermarkierung

## Sicherheit

- Nur Admin-Zugriff
- Pfad-Validierung
- Backup vor jeder Änderung
- Htaccess-Schutz für Backups
