# REDAXO Code Editor AddOn

Modern code editing experience for REDAXO CMS with Monaco Editor (VS Code) integration.

## Features

### 🎨 **Monaco Editor Integration**
- **Monaco Editor** (VS Code editor) for `.rex-code` textareas
- **Local installation** - no CDN dependencies, works offline
- **REDAXO Custom Themes** - Dark & Light themes matching REDAXO design
- **Syntax highlighting** for PHP, JavaScript, CSS, HTML, SQL, JSON
- **Code snippets** with 15+ REDAXO variable categories
- **Intelligent autocomplete** with context-aware suggestions
- **Multiple cursors** and advanced editing features

### 🛠️ **File Browser**
- **NextCloud-style interface** for file management
- **Live full-text search** across all project files
- **Line navigation** - jump directly to search results
- **Search excludes cache paths** (e.g. REDAXO cache)
- **Compact search excerpts** - shorter and easier to scan
- **Permission metadata** in file table:
    - Owner/Group (`owner:group`)
    - Permissions octal + symbolic (`0755 (drwxr-xr-x)`)
- **Permission fixer** button (`Rechte fixen`):
    - Sets folders to `0755`
    - Sets files to `0644`
    - Optional recursive mode
- **Admin access only** - restricted to administrators
- **Auto-deactivation** - deactivates after 2 days of inactivity

### 🔐 **Safety Features**
- **Automatic backups** before every file modification
- **Virtual trash system** - restore deleted files
- **Protected system files** - prevents critical file deletion
- **Backup management** with restore functionality
- **Data cleanup** on deactivation

### 📝 **Editor Toolbar Controls**
- **Theme Switcher** - REDAXO Dark/Light, VS Dark/Light, High Contrast
- **Font Size** - adjustable from 10px to 22px
- **Line Numbers** - toggle on/off
- **Word Wrap** - toggle line wrapping
- **Minimap** - code overview panel
- **Whitespace** - show/hide spaces and tabs
- **Bracket Pair Colorization** - matching bracket pairs are colorized
- **Indentation Guides** - vertical indent + bracket guides
- **Auto-Closing Brackets/Quotes** - enabled by default
- **Inlay Hints** - enabled when language support is available
- All settings saved per user via localStorage

### 🌗 **Theme Behavior (Light/Dark/Auto)**
- Theme handling was improved for File Browser and Backup & Trash views.
- Dedicated dark-mode and auto-dark-mode overrides prevent bright table/tab surfaces in dark contexts.

## Auto-Deactivation System

The File Browser deactivates automatically after 2 days of inactivity for security:

- ✅ **AddOn stays active** - only File Browser/Search/Backups require reactivation
- ✅ **Monaco Editor keeps working** - `.rex-code` enhancement remains active
- ✅ **Code Snippets remain** - all editing features stay available
- ⏱️ **2-day timer** - resets on every File Browser access
- 🔓 **Easy reactivation** - click button with security warning
- 🗑️ **No data loss** - backups and trash are preserved

### Reactivation Workflow

When File Browser is deactivated:
1. Navigate to **Code → File Browser**
2. See security warning with 5 important points
3. Click **"File-Browser aktivieren (2 Tage)"**
4. Timer resets for 2 more days
5. Alternative: Enable in **Settings** page

## Configuration

Configure via **Code → Settings**:

### Editor Settings
- **Monaco Editor aktivieren** - Replace `.rex-code` textareas with Monaco Editor
- **File-Browser aktivieren** - Enable/disable File Browser (also Search & Backup)

### Backup Settings
- **Auto-Backup** - Create backup before every save
- **Backup-Limit** - Max backups per file (5-100)
- **Papierkorb-Limit** - Max files in trash (10-100)

## `.rex-code` Exclusion List

Some textareas are automatically excluded from Monaco Editor replacement:

### Manual Exclusion
Add class `code_disable` to any textarea:
```html
<textarea class="rex-code code_disable">
    This will NOT be replaced by Monaco Editor
</textarea>
```

### Automatic Exclusions
- **MBlock elements** - `.mblock-item textarea.rex-code`
- **MForm Repeater** - `.mform-repeater-item textarea.rex-code`

This prevents DOM conflicts with dynamic form builders.

## Code Snippets

15+ categories with 200+ snippets for REDAXO development:

- **REX_VALUE** - Module values with all parameters
- **REX_MEDIA** - Media handling and widgets
- **REX_MEDIALIST** - Media lists and loops
- **REX_LINK** - Article links and URLs
- **REX_LINKLIST** - Link lists and navigation
- **REX_ARTICLE** - Article content and fields
- **REX_CATEGORY** - Category data and navigation
- **REX_TEMPLATE** - Template handling
- **REX_CONFIG** - Configuration access
- **REX_CLANG** - Multi-language support
- **REX_USER** - User information
- **REDAXO Core** - Common API calls
- **MForm** - Form builder elements
- **MBlock** - Repeatable content blocks
- **Parameter** - Variable parameters

All snippets include PHP and placeholder variants.

## Installation

1. **Upload AddOn** to REDAXO
2. **Monaco Editor Setup**: 
   ```bash
   cd redaxo/src/addons/code
   npm install
   npm run build
   ```
3. **Install and activate** the AddOn
4. **Configure** in Code → Settings

## System Requirements

- **REDAXO 5.18+**
- **PHP 8.1+**
- **Node.js & NPM** (for Monaco Editor setup)
- **Administrator permissions**

## Security Considerations

### ⚠️ File Browser Access
- **Admin-only** - restricted to administrator accounts
- **Auto-deactivation** - File Browser deactivates after 2 days
- **Security warning** - shown before reactivation
- **Audit trail** - all actions logged

### 🔒 Protected Files
System-critical files cannot be deleted:
- `index.php`, `.htaccess`
- `config.yml`, `package.yml`
- Core system files

### 💾 Backup System
- **Automatic backups** before file modifications
- **Configurable retention** (5-100 backups per file)
- **Restore functionality** via Backup & Trash page
- **Manual cleanup** or automatic on deactivation

## Usage

### Monaco Editor for Modules
The Monaco Editor automatically replaces `.rex-code` textareas in:
- Module Input/Output
- Template editor
- YForm action fields
- Any custom `.rex-code` textarea

**Exclude specific textareas:**
```html
<textarea class="rex-code code_disable">
    <!-- This textarea keeps default editor -->
</textarea>
```

### File Browser
1. Navigate to **Code → File Browser**
2. Browse project files (if enabled)
3. Click file to open in editor
4. Edit and save (automatic backup created)
5. Use search for quick file finding

### Permissions & Ownership
In **Code → File Browser** you can inspect and fix file permissions:

1. Check columns **Besitzer** and **Rechte** in the table.
2. Click **Rechte fixen** in the toolbar.
3. Choose mode:
    - `r` = recursive (includes subfolders)
    - `n` = current folder only
4. Review the resulting stats (processed/changed/failed).

### Search
1. Go to **Code → Code Search**
2. Enter search term (minimum 2 characters)
3. Results show filename, line number, and compact context excerpt
4. Click result to open file at specific line

### API (api AddOn)
When the **api** addon is installed and active, the code addon registers these endpoints automatically:

**Important prerequisite:** File operations (`/api/code/files` and `/api/code/file`) only work when **Code → Settings → File-Browser aktivieren** is enabled. If disabled, the API returns `403`.

- `GET /api/code/capabilities` (Bearer token scope: `code/capabilities`)
- `GET /api/code/files` (Bearer token scope: `code/files/list`, query: `path`)
- `POST /api/code/files` (Bearer token scope: `code/files/create`, JSON body: `path`, `name`, `type=file|folder`)
- `GET /api/code/file` (Bearer token scope: `code/file/read`, query: `path`)
- `PUT/PATCH /api/code/file` (Bearer token scope: `code/file/update`, JSON body: `path`, `content`)
- `DELETE /api/code/file` (Bearer token scope: `code/file/delete`, query: `path`)
- `GET /api/backend/code/capabilities` (Backend session/cookie auth)
- `GET /api/backend/code/files` (Backend session/cookie auth)
- `POST /api/backend/code/files` (Backend session/cookie auth)
- `GET/PUT/PATCH/DELETE /api/backend/code/file` (Backend session/cookie auth)

Response includes:
- addon metadata (`addon`, `version`)
- file browser status (`file_browser_enabled`)
- editable file formats (`allowed_extensions`)
- excluded directories (`excluded_directories`)

`GET /api/code/files` returns the current directory entries (folders + allowed file types).

`POST /api/code/files` creates a new file or folder. Example body:

```json
{
    "path": "redaxo/src/addons/code",
    "name": "example.csv",
    "type": "file"
}
```

`GET /api/code/file` returns file metadata and `content` for an allowed file.

`PUT /api/code/file` updates file content. Example body:

```json
{
    "path": "redaxo/src/addons/code/example.csv",
    "content": "id;name\n1;Demo\n"
}
```

`DELETE /api/code/file` deletes an allowed non-protected file.

#### Curl examples (copy & paste)

Note: These examples require that the file browser is enabled in the code addon settings.

```bash
BASE='https://localhost:8443'
TOKEN='YOUR_TOKEN'
```

List directory entries:

```bash
curl -k -sS -G \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "path=redaxo/src/addons/code" \
    "$BASE/api/code/files"
```

Create a new CSV file:

```bash
curl -k -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"path":"redaxo/src/addons/code","name":"api_demo.csv","type":"file"}' \
    "$BASE/api/code/files"
```

Read file content:

```bash
curl -k -sS -G \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "path=redaxo/src/addons/code/api_demo.csv" \
    "$BASE/api/code/file"
```

Update file content:

```bash
curl -k -sS -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"path":"redaxo/src/addons/code/api_demo.csv","content":"id;name\n1;Demo\n"}' \
    "$BASE/api/code/file"
```

Delete file:

```bash
curl -k -sS -X DELETE -G \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "path=redaxo/src/addons/code/api_demo.csv" \
    "$BASE/api/code/file"
```

Required token scopes:

- `code/capabilities`
- `code/files/list`
- `code/files/create`
- `code/file/read`
- `code/file/update`
- `code/file/delete`

#### Copilot instructions example

Copy this block into your project-level `.github/copilot-instructions.md` if you want consistent implementation rules for this addon API:

```md
## Code AddOn API Conventions

For `redaxo/src/addons/code` API routes registered into the `api` addon:

- Register route packages only when the `api` addon is available:
    - `rex_addon::get('api')->isAvailable()`
    - `class_exists(\FriendsOfRedaxo\Api\RouteCollection::class)`
- Keep implementation in `lib/Api/RoutePackage/Code.php` and `lib/Api/CodeFileService.php`.
- Use `FriendsOfRedaxo\Api\RouteCollection::registerRoute(...)` with `BearerAuth` and tag `code`.
- Provide backend mirror routes via `lib/Api/RoutePackage/Backend/Code.php`.
- Respect code addon config flag `enable_file_browser` and return `403` if disabled.
- Accept only file types from `FriendsOfRedaxo\Code\EditorConfig::getAllowedExtensions()`.
- Keep directory/path restrictions inside REDAXO base path and block traversal via realpath checks.
- Do not allow deletion of protected files (e.g. `.htaccess`, `index.php`, `composer.json`, `boot.php`, `install.php`).
- Keep route scopes stable for token management:
    - `code/capabilities`
    - `code/files/list`
    - `code/files/create`
    - `code/file/read`
    - `code/file/update`
    - `code/file/delete`
```

### Backup & Trash
1. Navigate to **Code → Backup & Trash**
2. **Backups tab** - restore previous file versions
3. **Trash tab** - restore or permanently delete files

## Keyboard Shortcuts

In Monaco Editor:
- `Ctrl/Cmd + S` - Save file
- `Ctrl/Cmd + F` - Find in file
- `Ctrl/Cmd + H` - Replace in file
- `Ctrl/Cmd + /` - Toggle line comment
- `Alt + Click` - Multiple cursors
- `Ctrl/Cmd + D` - Select next occurrence
- `F11` - Fullscreen mode (File Browser only)

## Troubleshooting

### Monaco Editor not loading
1. Check browser console for errors
2. Verify Monaco is built: `npm run build`
3. Clear browser cache
4. Check file permissions on `assets/` folder

### `.rex-code` replacement not working
1. Check Settings: "Monaco Editor aktivieren" must be "Aktiviert"
2. Verify textarea has class `rex-code`
3. Check if textarea is inside `.mblock-item` or `.mform-repeater-item`
4. Check for `code_disable` class

### File Browser deactivated
This is normal after 2 days of inactivity:
1. Go to Code → File Browser
2. Read security warning carefully
3. Click "File-Browser aktivieren (2 Tage)"
4. Or enable in Settings page

## Configuration via package.yml

```yaml
config:
    # Auto-deactivation after X days (0 = disabled)
    auto_deactivate_after_days: 2
    # Clean data when File Browser deactivates
    cleanup_data_on_deactivate: true
```

## Development

### Building Monaco Editor
```bash
npm install
npm run build
```

This creates optimized Monaco Editor bundle in `assets/monaco-editor/`.

### Adding Snippets
Edit `assets/code-editor.js` → `getSnippets()` method.

### Custom Themes
Monaco themes are defined in `assets/code-editor.js`:
- `redaxo-dark` (default)
- `redaxo-light`

## License

MIT License - see [LICENSE](LICENSE) file.

## Author

**Friends Of REDAXO**
Developed for REDAXO CMS

## Support

- **GitHub Issues**: Report bugs and feature requests
- **REDAXO Slack**: Community support in #addons channel
- **Documentation**: See MONACO_SETUP.md for editor details

---

**Remember:** This AddOn provides powerful file editing capabilities. Use responsibly, especially on production servers. The auto-deactivation system helps prevent long-term security risks.
