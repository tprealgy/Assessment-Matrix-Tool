# 🏗️ Build & Release Process

## 📦 Two-File Release Strategy

Every release should provide **both** files:

### 1. 🆕 Full Installation Package
- **File:** `Assessment-Matrix-Tool-v[VERSION]-Full.zip`
- **Contents:** Complete `dist/win-unpacked/` folder
- **For:** New users, fresh installations, IT deployments
- **Size:** ~150-200MB

### 2. 🔄 Update Package  
- **File:** `Assessment Matrix Tool.exe`
- **Contents:** Only the executable from `dist/win-unpacked/`
- **For:** Existing users updating their app
- **Size:** ~100-150MB

## 🛠️ Build Commands

```bash
# 1. Clean build
rmdir /s /q dist
npm run build

# 2. Create update file (just copy the exe)
copy "dist\win-unpacked\Assessment Matrix Tool.exe" "Assessment Matrix Tool.exe"

# 3. Create full package (zip the entire folder)
# Zip dist/win-unpacked/ as "Assessment-Matrix-Tool-v[VERSION]-Full.zip"
```

## 📋 Release Checklist

### Before Release:
- [ ] Version number updated in package.json
- [ ] CHANGELOG.md updated with changes
- [ ] Build completed successfully (ignore signing errors)
- [ ] Both files created and tested
- [ ] **CRITICAL**: Clean build with `rmdir /s /q dist` first
- [ ] **VERIFY**: Test assessment area editing in built exe

### Release Files:
- [ ] `Assessment Matrix Tool.exe` (update file)
- [ ] `Assessment-Matrix-Tool-v[VERSION]-Full.zip` (full package)
- [ ] Release notes using RELEASE_TEMPLATE.md

### Upload Order:
1. **Upload both files** to GitHub release
2. **Label clearly** which is which
3. **Use release template** for description
4. **Test download links** before announcing

## 🎯 File Naming Convention

```
Assessment Matrix Tool.exe                           ← Update file
Assessment-Matrix-Tool-v1.0.0-Full.zip             ← Full package
Assessment-Matrix-Tool-v1.0.1-Full.zip             ← Next version
```

## ✅ Quality Assurance

### Test Update File:
- [ ] Download .exe only
- [ ] Replace in existing installation
- [ ] Verify app starts and data intact

### Test Full Package:
- [ ] Extract to new location
- [ ] Run fresh installation
- [ ] Verify all features work

This ensures both new users and existing users have the right download option!