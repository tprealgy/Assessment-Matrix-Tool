# Assessment Matrix Tool

A desktop application for managing student assessments and grading matrices. This tool helps teachers track student progress across different assessment areas using a visual matrix system.

## 🚀 Quick Start Guide

### First Time Setup
1. **Download** the Assessment Matrix Tool folder
2. **Move to OneDrive** (recommended): `OneDrive - Lärande/Assessment Matrix Tool/`
3. **Run** `Assessment Matrix Tool.exe`
4. **Create your first course** using the "Skapa kurs" button
5. **Add assessment areas** (e.g., "Planering", "Genomförande", "Reflektion")
6. **Add students** to your course
7. **Start assessing** by creating assignments and grading

### Key Features
- ✅ **Visual Assessment Matrix**: Track student progress with color-coded assignments
- ✅ **Multiple Courses**: Manage several classes simultaneously
- ✅ **Assignment Management**: Create, edit, and undo assignments
- ✅ **Student Import/Export**: Backup and transfer student data
- ✅ **Flexible Grading**: E, C, A levels with customizable colors
- ✅ **Cloud Sync Ready**: Works seamlessly with OneDrive

## 📁 Understanding Your Files

```
Assessment Matrix Tool/
├── Assessment Matrix Tool.exe    ← Main application (run this)
├── data/                        ← YOUR STUDENT DATA (CRITICAL!)
│   └── matris.db               ← Database with all your work
├── resources/                   ← App files (don't touch)
└── other system files...
```

**⚠️ IMPORTANT**: The `data/` folder contains ALL your student information, grades, and courses. Never delete this folder!

## ☁️ Data Protection & Backup

### Automatic Cloud Backup (Recommended)
1. **Move the entire app folder to OneDrive**
   - Location: `OneDrive - Lärande/Assessment Matrix Tool/`
   - Your data syncs automatically to the cloud
   - Protected from computer crashes or theft

2. **Always run the app from OneDrive**
   - Double-click the .exe file in your OneDrive folder
   - Changes save automatically to the cloud

### Manual Backup Options
- **Export Students**: Use "Exportera data" button in each course
- **Copy Data Folder**: Regularly copy the `data/` folder to USB/external drive
- **Full App Backup**: Copy entire Assessment Matrix Tool folder

### Data Recovery
- **Restore Deleted Students**: Use "Återställ" link in course admin
- **Restore Deleted Courses**: Use settings button on main page
- **Import Students**: Use "Importera" button with exported JSON files

## 🔄 Updating the Application

### When a New Version is Released:

1. **📥 Download** the new version
2. **❌ Close** the current app completely
3. **📂 Navigate** to your app folder (in OneDrive)
4. **🔄 Replace ONLY** the `Assessment Matrix Tool.exe` file
5. **✅ Keep** the `data/` folder (contains all your work)
6. **▶️ Start** the updated app
7. **✔️ Verify** your courses and students are still there

**⚠️ Never replace the entire folder** - you'll lose all your data!

### Update Checklist:
- [ ] App is completely closed
- [ ] Only .exe file is replaced
- [ ] Data folder is untouched
- [ ] App starts and shows your courses

## 🎯 How to Use the Assessment Matrix

### Creating Assessments
1. **Select a student** from the dropdown
2. **Enter assignment name** (e.g., "Projekt 1")
3. **Choose assessment areas** (check boxes)
4. **Select levels and colors** (E=green, C=yellow, A=red)
5. **Click "Lägg till uppgift"**

### Grading Students
1. **Click colored buttons** in the matrix to grade
2. **Colors represent achievement levels**:
   - 🟢 Green = Achieved/Good
   - 🟡 Yellow = Partially achieved
   - 🔴 Red = Not achieved
   - ⚪ Grey = Not assessed (E-level only)

### Bulk Operations
- **"Skapa för alla studenter"**: Creates assignment for entire class
- **"Ångra senaste uppgift"**: Removes last created assignment
- **"Radera alla uppgifter"**: Clears all assignments (God Mode)

## 🛠️ Troubleshooting

### Common Issues

**App won't start:**
- Check if .exe file is in the correct folder
- Try running as administrator
- Ensure data folder exists

**Can't type in text fields:**
- Click once on the text field
- Try resizing the window slightly
- Restart the app if problem persists

**Lost data:**
- Check OneDrive sync status
- Look for data folder in original location
- Use "Återställ" options in the app

**Import/Export not working:**
- Ensure files are in JSON format for import
- Check file permissions
- Try exporting to desktop first

### Getting Help
- Check the settings (⚙️) for app configuration
- Use "Återställ" options for deleted items
- Contact IT support if data recovery is needed

## 📊 Best Practices

### For Teachers
- **Regular Exports**: Export student data monthly
- **Descriptive Names**: Use clear assignment names ("Projekt 1 - Planering")
- **Consistent Grading**: Establish color coding standards
- **Backup Before Updates**: Export data before updating app

### For IT Administrators
- **OneDrive Setup**: Ensure teachers have OneDrive access
- **Update Distribution**: Provide only .exe files for updates
- **Training**: Show teachers backup and restore procedures
- **Support**: Keep contact information readily available

## 📞 Support & Contact

For technical support, training, or questions:
- Contact your IT department
- Keep this README file for reference
- Report bugs or feature requests to development team

---

**Version**: 2.1.0  
**Last Updated**: January 2025  
**Compatibility**: Windows 10/11