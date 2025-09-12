# Changelog

All notable changes to the Assessment Matrix Tool will be documented in this file.

## [0.9.2-beta] - 2025-01-16

### 🐛 Bug Fixes
- **Assessment Area Editing**: Fixed missing API endpoints in Electron build
  - Added PUT `/api/assessment-areas/:index` endpoint to electron-server.js
  - Added DELETE `/api/assessment-areas/:index` endpoint to electron-server.js
  - Added POST `/api/assessment-areas/reorder` endpoint to electron-server.js
  - Assessment area editing now works properly in the built application (port 3001)

---

## [0.9.1-beta] - 2025-01-16

### 🐛 Bug Fixes
- **Assessment Area Management**: Fixed missing API endpoints for editing assessment areas
  - Added PUT `/api/assessment-areas/:index` for updating area names and descriptions
  - Added DELETE `/api/assessment-areas/:index` for removing assessment areas
  - Added POST `/api/assessment-areas/reorder` for reordering areas
  - Assessment area names can now be edited and saved properly in admin interface
- **Application Startup**: Improved VBS launcher script
  - Now kills processes using port 3000 before starting (safer than killing all Node processes)
  - Prevents conflicts from previous server instances
  - Ensures latest code changes are always loaded

### 🔧 Technical Improvements
- **Error Handling**: Added proper error handling and user feedback for assessment area operations
- **Toast Notifications**: Enhanced admin interface with success/error messages for area management

---

## [0.9.0-beta] - 2025-01-15

### ✨ New Features
- **Undo Last Assignment**: Added ability to undo the most recently created assignment for a student
  - Shows assignment name in confirmation dialog before deletion
  - Removes all instances of the assignment across all assessment areas and levels
  - Available in both individual student view and bulk operations

### 🐛 Bug Fixes
- **Export/Import System**: Fixed student data export and import functionality
  - Resolved 404 error when exporting student data
  - Fixed route conflict between `/api/students/export` and `/api/students/:id`
  - Standardized export format to JSON (matching import requirements)
  - Fixed import confirmation dialog displaying escaped characters instead of proper newlines

### 🔧 Technical Improvements
- **Input Focus Fix**: Improved Electron input field responsiveness
  - Added `focusable: true` to BrowserWindow configuration
  - Simplified electron-fix.js with more reliable focus handling
  - Applied fix to all HTML pages for consistent behavior
- **Route Organization**: Reorganized API routes to prevent conflicts
  - Moved specific routes before parameterized routes
  - Ensured proper route matching in Express.js

### 🎨 UI/UX Improvements
- **Export Filenames**: Added timestamp to exported files for better organization
  - Format: `coursename_students_2024-01-15T14-30-45.json`
- **Import Dialogs**: Fixed formatting in import confirmation messages
  - Proper line breaks and readable text formatting

---

## [0.8.0-beta] - 2025-08-05

### 🚀 Major Changes
- **SQLite Migration**: Migrated from JSON file storage to SQLite database for better performance and data integrity
- **Electron Desktop App**: Created standalone desktop application eliminating Node.js installation requirement
- **Centralized Configuration**: Implemented file-based configuration system replacing localStorage

### ✨ New Features
- **Student Management**: Create, hide/show, delete, and restore students
- **Student Import/Export**: CSV export and JSON import functionality
- **Assignment Editing**: Edit assignment colors and levels after creation
- **Course Restoration**: Restore deleted courses with expiration system
- **Settings Page**: Customizable colors, limits, and UI behavior
- **Data Abstraction**: Separate data modules with validation and business logic

### 🐛 Bug Fixes
- **Input Focus Issues**: Fixed unresponsive text fields in Electron environment
- **Database Path**: Corrected database location for writable user directory
- **API Route Parity**: Synchronized all routes between development and Electron servers
- **Assignment Operations**: Fixed create, edit, delete, and grading functionality

### 🔧 Technical Improvements
- **Database Schema**: Comprehensive SQLite schema with proper relationships and indexes
- **Data Migration**: Automatic migration from JSON to SQLite preserving all existing data
- **Server Architecture**: Separate embedded server for Electron with async initialization
- **Error Handling**: Improved error handling and user feedback throughout application

### 📁 File Structure
- **Data Layer**: `data/` directory with modular data handling
- **Database**: `database.js` with connection management and helper methods
- **Migration**: `migrate.js` for seamless data format transitions
- **Configuration**: `config.js` for centralized settings management

### 🎨 UI/UX Improvements
- **Modern Interface**: Updated admin interface with card-based layout
- **Color Management**: Enhanced color picker and palette system
- **Form Validation**: Improved input validation and user feedback
- **Responsive Design**: Better layout handling across different screen sizes

---

## [0.1.0-alpha] - Previous Version

### Initial Features
- Basic assessment matrix functionality
- JSON-based data storage
- Web-based interface
- Course and student management
- Assignment tracking and grading