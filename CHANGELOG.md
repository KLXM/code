# Changelog

## [1.6.0] - 2026-05-04
### Changed
- Monaco Editor auf Version 0.55.1 aktualisiert.
- DOMPurify über npm-Override auf 3.4.2 angehoben (Sicherheitsfixes).
- Build-Pipeline auf ESM + esbuild migriert (AMD-Build ist seit Monaco 0.53 deprecated).
  - Neue Einstiegsdatei `src/monaco-entry.js` mit `window.MonacoEnvironment`-Worker-Routing.
  - Separate Worker-Bundles für JSON, CSS, HTML, TypeScript und den Basis-Editor.
  - `build.js` komplett neu auf esbuild umgestellt (kein AMD-Copy mehr).
  - `monaco-loader.js` wird jetzt vom Build generiert und lädt das ESM-Bundle.
- Theme/CSS-Overrides für Dark Mode und Auto Dark Mode auf den AddOn-Seiten verbessert (File Browser, Backup & Trash).
- Suchergebnis-Auszüge in der Code-Suche gekürzt und besser lesbar gemacht.

### Added
- Sticky Scroll: neue Toolbar-Schaltfläche (`#toggle-sticky-scroll`) und localStorage-Einstellung `rex_code_sticky_scroll`.
- Minimap zeigt jetzt Region/Section-Header an (`showRegionSectionHeaders: true`).
- Monaco-CSS (`monaco.bundle.css`) wird in `boot.php` eingebunden (Schriftarten & Styles aus ESM-Bundle).
- Neue Monaco-Editor-Optionen standardmäßig aktiviert:
  - Bracket Pair Colorization
  - Indentation/Bracket Guides
  - Auto-Closing Brackets/Quotes
  - Inlay Hints (wenn von der Sprache unterstützt)
- Dateibrowser zeigt jetzt Dateimetadaten an:
  - Besitzer/Gruppe (`owner:group`)
  - Rechte oktal + symbolisch (z. B. `0755 (drwxr-xr-x)`)
- Neuer Toolbar-Button "Rechte fixen" im File Browser:
  - Setzt Verzeichnisse auf `0755`
  - Setzt Dateien auf `0644`
  - Optional rekursiv inkl. Unterordner
  - Mit Ergebnisstatistik (verarbeitet/geändert/fehlerhaft)

### Fixed
- Code-Suche überspringt jetzt den REDAXO-Cache-Pfad zuverlässig.
- Suche kann Treffer direkt in der passenden Datei/Zeile öffnen.
- Schließen/Modal-Verhalten des Editors nach Änderungen stabilisiert.

## [1.5.0] - 2026-03-03
### Added
- API-Integration für das `api` AddOn über RoutePackages (`code` und `backend/code`).
- Neue Endpunkte für Dateiverwaltung:
  - `GET /api/code/files` (`code/files/list`)
  - `POST /api/code/files` (`code/files/create`)
  - `GET /api/code/file` (`code/file/read`)
  - `PUT/PATCH /api/code/file` (`code/file/update`)
  - `DELETE /api/code/file` (`code/file/delete`)
- Backend-Mirror-Routen für Session-Auth über `/api/backend/code/*`.
- Neuer `CodeFileService` mit zentraler Logik für Browse/Create/Read/Update/Delete.
- Erweiterte erlaubte Textformate (u.a. `csv`, `tsv`, `log`, `rst`, `toml`, `cfg`, `properties`).

### Changed
- API-Routen werden nur registriert, wenn das `api` AddOn verfügbar ist.
- API-Dateioperationen respektieren den Schalter `enable_file_browser` und liefern bei Deaktivierung `403`.
- README erweitert um Scope-Liste, Curl-Beispiele und Copilot-Instructions-Beispiel.

### Security
- Pfadzugriffe bleiben auf den REDAXO-Basispfad beschränkt (Traversal-Schutz via `realpath`).
- Löschen geschützter Dateien bleibt blockiert (z.B. `.htaccess`, `index.php`, `composer.json`, `boot.php`, `install.php`).

## [1.2.1] - 2026-01-28
### Fixed
- Fatal Error: `CodeApi::__construct()` neu deklariert (doppelter Konstruktor entfernt).
- Fatal Error: `CodeSelfDestruct` Klasse doppelt vorhanden (Case-Sensitivity Bereinigung).
- Cleanup: Ungenutzte Datei `monaco-loader-simple.js` entfernt.
- Security: API-Zugriff weiter gehärtet.

### Added
- **Global Editor**: Monaco Editor ersetzt nun automatisch Textareas mit der Klasse `.rex-code` im gesamten Backend (wenn `be_style/codemirror` nicht aktiv ist).
- **Editor Toolbar**: Neue Toolbar über den Textareas mit nützlichen Tools.
  - **Snippets**: Umfangreiche Bibliothek für REDAXO-Module (`REX_VALUE`...), MForm (v8+), MBlock, Templates und Core-Funktionen.
  - **Fullscreen**: Echter Vollbildmodus für entspanntes Coden in engen Modul-Eingaben.
  - **Formatierung**: Code-Beautifier auf Knopfdruck.
  - **Theme Switcher**: Schneller Wechsel zwischen Dark, Light und High Contrast Mode.
- **Theme Sync**: Das gewählte Theme wird global gespeichert und synchronisiert.
- **Monaco Update**: Version auf 0.52.0 angehoben.
- **Slice Values (PHP)**: Neue Snippet-Kategorie für objektorientierten Zugriff auf Slice-Daten.

## [1.1.0] - 2026-01-28
### Added
- Code Editor im Backend integriert.
- Dateibrowser mit Dateimanagement.
- Backup & Trash System.
- Suchfunktion.
