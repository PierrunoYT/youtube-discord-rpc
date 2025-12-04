@echo off
setlocal enabledelayedexpansion

echo ========================================
echo YouTube Discord RPC - Installation
echo ========================================
echo.

:: Get the current directory
set "INSTALL_DIR=%~dp0"
set "NATIVE_HOST_DIR=%INSTALL_DIR%native-host"

:: Update the native host manifest with correct path
set "BAT_PATH=%NATIVE_HOST_DIR%\run-host.bat"
set "BAT_PATH_ESCAPED=%BAT_PATH:\=\\%"

echo Creating native messaging manifest...

:: Create the manifest with the correct path
(
echo {
echo   "name": "youtube_discord_rpc",
echo   "description": "YouTube Discord RPC Native Host",
echo   "path": "%BAT_PATH_ESCAPED%",
echo   "type": "stdio",
echo   "allowed_extensions": ["youtube-discord-rpc@example.com"]
echo }
) > "%NATIVE_HOST_DIR%\youtube_discord_rpc.json"

:: Register the native messaging host in Windows Registry
echo Registering native messaging host...
reg add "HKCU\Software\Mozilla\NativeMessagingHosts\youtube_discord_rpc" /ve /t REG_SZ /d "%NATIVE_HOST_DIR%\youtube_discord_rpc.json" /f

if %errorlevel% neq 0 (
    echo Failed to register native messaging host!
    pause
    exit /b 1
)

:: Install npm dependencies
echo.
echo Installing Node.js dependencies...
cd /d "%NATIVE_HOST_DIR%"
call npm install

if %errorlevel% neq 0 (
    echo Failed to install npm dependencies!
    echo Make sure Node.js is installed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
echo Next steps:
echo 1. Create a Discord Application at https://discord.com/developers/applications
echo 2. Copy the Application ID and paste it in native-host\host.js
echo 3. Add Rich Presence assets named 'youtube', 'play', 'pause'
echo 4. Load the extension in Firefox:
echo    - Go to about:debugging#/runtime/this-firefox
echo    - Click "Load Temporary Add-on"
echo    - Select extension\manifest.json
echo.
pause
