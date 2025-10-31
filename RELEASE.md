# Release Instructions

## For Testers

### Download Ready-to-Use Version
1. Go to [Releases](../../releases)
2. Download the latest `Assessment-Matrix-Tool-v2.1.0.zip`
3. Extract the zip file
4. Run `Assessment Matrix Tool.exe`

### No Installation Required
- This is a portable application
- No Node.js or other dependencies needed
- Works on Windows 10/11

## For Developers

### Building from Source
```bash
# Clone the repository
git clone [your-repo-url]
cd assessment-matrix-tool

# Install dependencies
npm install

# Run in development mode
npm start

# Build the desktop app
npm run build
```

### Development vs Built Version
- **Development**: `npm start` - runs on port 3000
- **Built**: Electron app - runs on port 3001
- Both use separate databases

## Testing Guidelines

### What to Test
- [ ] Create courses and assessment areas
- [ ] Add and manage students
- [ ] Create assignments and grade students
- [ ] Export/import student data
- [ ] Undo last assignment feature
- [ ] Data persistence after app restart

### Reporting Issues
Please report bugs with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Your Windows version

### Data Safety
- App stores data in `data/` folder
- Recommended: Place app in OneDrive for backup
- Export student data regularly