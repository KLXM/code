# REDAXO Code Editor AddOn

⚠️ **EMERGENCY USE ONLY - NOT FOR DEVELOPMENT** ⚠️

## 🚨 Important Notice

**This AddOn is NOT intended for regular development work!**

### ✅ **What this is for:**
- **Emergency bug fixes** on live servers
- **Quick hotfixes** when other tools are unavailable
- **Temporary file edits** in critical situations

### ❌ **What this is NOT for:**
- **Regular development work**
- **Project development**
- **Long-term code editing**
- **Team collaboration**

### 🏠 **For Real Development Use:**
- **Local development environments** (XAMPP, Docker, etc.)
- **Professional IDEs** (VS Code, PhpStorm, Sublime Text)
- **Version control systems** (Git, SVN)
- **Deployment tools** (deployer, rsync, CI/CD pipelines)

---

## Description

This AddOn provides an integrated file browser with code editor for REDAXO CMS. It enables direct file editing through the backend interface for **emergency situations only**.

**FUNCTIONALITY SCOPE:**
- ✅ **Edit existing** files for quick fixes
- ✅ **Virtual trash system** with restore functionality  
- ✅ **Protected system files** (automatic prevention)
- ✅ **Automatic self-deactivation** after 2 days of inactivity
- 🛠️ **Exclusively** for emergency repairs

## ⚠️ Security & Usage Warnings

**CRITICAL:** This AddOn should **ONLY be used in emergencies**!

### 🔒 **Security Features:**
- ✅ **Admin access only** - restricted to administrators
- ✅ **Protected system files** - prevents deletion of critical files
- ✅ **Auto-deactivation** - deactivates after 2 days of inactivity
- ✅ **Data cleanup** - removes backups and trash on deactivation
- ✅ **Virtual trash system** - deleted files can be restored

### ⚠️ **Usage Guidelines:**
- 🚫 **Production environment:** Never leave activated on live servers
- � **Emergency only:** Use only for critical bug fixes
- 💾 **Backup first:** Always backup your site before using
- ⏱️ **Time limit:** Addon automatically deactivates after 2 days inactivity
- �️ **Clean exit:** All data is automatically cleaned up on deactivation

### 🏆 **Best Practices:**
1. **Use proper development setup locally**
2. **Deploy changes through established workflows**  
3. **Keep this addon for true emergencies only**
4. **Test changes in staging environment first**
5. **Document any emergency changes made**

## Features

### 🛠️ **Emergency Tools:**
- **File Browser** with NextCloud-style interface
- **Monaco Editor** (VS Code) - **local installation** (no CDN!)
- **Fullscreen mode** for focused editing (F11 or button)
- **Live full-text search** in project files
- **Line navigation** from search results
- **Offline capable** - works without internet connection

### 🔐 **Safety Features:**
- **Automatic backups** on every file modification
- **Virtual trash system** - restore accidentally deleted files
- **Protected system files** - prevents deletion of critical files
- **Backup management** with restore and cleanup functions
- **Auto-deactivation** after 2 days of inactivity
- **Data cleanup** on deactivation

### 📝 **File Operations:**
- ✅ **Edit existing files** (with syntax highlighting)
- ✅ **Delete files** (to virtual trash - can be restored)
- ✅ **Restore files** from trash
- ❌ **No file creation** - use proper IDE for development
- 🔒 **System file protection** (index.php, .htaccess, config files, etc.)

## Installation

⚠️ **Before Installation:** Ensure you have a proper local development setup for regular work!

1. **Upload AddOn** to REDAXO
2. **Monaco Editor Setup**: 
   ```bash
   cd src/addons/code/assets
   npm install
   npm run build
   ```
3. **Install and activate** the AddOn
4. **Use ONLY for emergency repairs**
5. **Addon will auto-deactivate** after 2 days of inactivity

## Usage Workflow

### 🚨 **Emergency Situation:**
1. **Backup your site first** (always!)
2. **Activate the AddOn** (if not already active)
3. **Make minimal necessary changes** only
4. **Test the fix immediately**
5. **Document what you changed**
6. **Let the AddOn auto-deactivate** (or deactivate manually)
7. **Implement proper fix in your development environment**
8. **Deploy through your normal workflow**

### 🏠 **For Regular Development:**
- **Use local development environment** (Docker, XAMPP, etc.)
- **Use professional IDE** (VS Code, PhpStorm, etc.)
- **Use version control** (Git with proper branching)
- **Use deployment tools** (rsync, CI/CD, etc.)
- **Test in staging environment**

## System Requirements

- **REDAXO 5.18+**
- **PHP 8.1+**
- **Node.js & NPM** (for Monaco Editor setup)
- **Administrator permissions**
- **Local development environment** (for regular work)

## Configuration

The AddOn can be configured via `package.yml`:

```yaml
config:
    auto_deactivate_after_days: 2    # Auto-deactivation after inactivity
    cleanup_data_on_deactivate: true # Clean backups/trash on deactivation
```

## Auto-Deactivation System

- **Automatic deactivation** after 2 days of inactivity (configurable)
- **Silent operation** - no warnings or notifications
- **Data cleanup** - backups and trash are automatically removed
- **Secure cleanup** - all addon data is removed on deactivation

## Why This Approach?

### 🚨 **Emergency Tool Philosophy:**
This AddOn is designed as a "fire extinguisher" - always available when needed, but not for daily use.

### 🏠 **Proper Development Setup:**
- **Local environment** gives you full control and safety
- **Version control** prevents data loss and enables collaboration  
- **Professional IDEs** provide better debugging, autocomplete, and tools
- **Staging environments** let you test safely before going live
- **Deployment automation** reduces human error

### ⚖️ **Risk vs. Benefit:**
- **High risk:** Direct server file editing
- **High benefit:** Quick emergency fixes when other tools unavailable
- **Mitigation:** Auto-deactivation, backups, protected files, trash system

---

**Remember: Great power comes with great responsibility. Use this tool wisely!** 🦸‍♂️

## Warning Against Misuse

This tool is **exclusively** for:
- ✅ Emergency repairs (editing only!)
- ✅ Quick bug fixes of existing files
- ✅ Development/debugging (local only)

**NOT for:**
- ❌ Regular development
- ❌ Production editing
- ❌ Permanent installation
- ❌ Creating or deleting files

## Disclaimer

Use at your own risk. Always create complete backups before using this tool.

## License

This AddOn is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

## Author
KLXM Crossmedia GmbH

Developed for REDAXO CMS - Emergency tool for administrators
