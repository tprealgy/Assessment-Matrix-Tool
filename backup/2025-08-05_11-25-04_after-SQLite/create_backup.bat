@echo off
:: This script creates a timestamped backup of the entire project directory using robocopy.

:: 1. Set the backup directory name
set "BACKUP_DIR=backup"

:: 2. Create the main backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" (
    echo Creating backup directory...
    mkdir "%BACKUP_DIR%"
)

:: 3. Generate a reliable timestamp using PowerShell (YYYY-MM-DD_HH-mm-ss)
for /f "usebackq" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'"`) do set "TS=%%i"

:: 4. Define the full path for this specific backup
set "TARGET_DIR=%BACKUP_DIR%\%TS%"

:: 5. Perform the backup using robocopy
:: /E    - Copies subdirectories, including empty ones.
:: /XD   - Excludes directories matching the given names.
:: We exclude the main backup folder itself and node_modules to prevent cyclic copies and reduce clutter.
echo Backing up project to %TARGET_DIR%...
robocopy . "%TARGET_DIR%" /E /XD "%BACKUP_DIR%" "node_modules"

echo.
echo Backup complete!
pause
