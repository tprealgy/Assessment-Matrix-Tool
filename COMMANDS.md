# Assessment Matrix Tool - Available Commands

## 🚀 Development Commands

### `npm start`
**What it does:** Starts the Node.js server for development
**When to use:** Daily development and testing
**How to use:** 
- Open terminal in project folder
- Run `npm start`
- Server starts at http://localhost:3000
- Use your "Grader" shortcut (recommended)

### `npm run electron`
**What it does:** Runs the app as an Electron desktop application
**When to use:** Testing the desktop app experience during development
**How to use:**
- Open terminal in project folder
- Run `npm run electron`
- Desktop window opens with your app

## 📦 Distribution Commands

### `npm run build`
**What it does:** Creates a distributable executable for sharing
**When to use:** When you want to share the app with other teachers
**How to use:**
- Open terminal in project folder
- Run `npm run build`
- Wait 2-3 minutes for build to complete
- Find executable at `dist/win-unpacked/Assessment Matrix Tool.exe`

### `npm run dist`
**What it does:** Same as `npm run build` but with additional packaging options
**When to use:** Alternative to `npm run build`
**How to use:** Same as build command

## 🛠️ Utility Commands

### `node migrate.js`
**What it does:** Migrates JSON data to SQLite database
**When to use:** Already completed - only needed if you restore from backup
**How to use:**
- Open terminal in project folder
- Run `node migrate.js`
- Creates backup and migrates data

### `npm test`
**What it does:** Runs tests (currently placeholder)
**When to use:** When tests are implemented
**How to use:** `npm test`

## 📁 File Shortcuts

### "Grader" Desktop Shortcut
**What it does:** Starts the development server and opens browser
**When to use:** Your primary way to start the app for daily use
**How to use:** Double-click the "Grader" shortcut on desktop

### `start.vbs`
**What it does:** VBS script that powers the "Grader" shortcut
**When to use:** Automatically used by the shortcut
**How to use:** Runs automatically when you use the shortcut

## 🎯 Recommended Workflow

### For Daily Development:
1. **Double-click "Grader" shortcut** (easiest)
2. OR run `npm start` in terminal
3. App opens in browser at http://localhost:3000
4. Make changes to code
5. Refresh browser to see changes

### For Testing Desktop App:
1. Run `npm run electron`
2. Test app in desktop window
3. Close window when done

### For Sharing with Other Teachers:
1. Run `npm run build`
2. Wait for build to complete
3. Copy entire `dist/win-unpacked/` folder
4. Share folder with other teachers
5. They double-click `Assessment Matrix Tool.exe`

## 🔧 Troubleshooting

### If server won't start:
- Check if port 3000 is already in use
- Close any running instances
- Try restarting terminal

### If build fails:
- Check Windows permissions
- Try running terminal as administrator
- The unpacked version in `dist/win-unpacked/` usually works even if installer fails

### If Electron won't start:
- Make sure `npm start` works first
- Check if Node.js dependencies are installed
- Try `npm install` to reinstall packages

## 📝 Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm start` | Development server | Daily development |
| `npm run electron` | Desktop app testing | Test desktop experience |
| `npm run build` | Create executable | Share with others |
| "Grader" shortcut | Start development | Primary daily use |