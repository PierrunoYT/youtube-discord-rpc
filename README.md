# YouTube Discord RPC

A Firefox extension that displays your currently playing YouTube video as Discord Rich Presence.

## Preview

Your Discord status will show:
- Video title
- Channel name
- Play/Pause status (affects progress bar)
- Time progress
- Video thumbnail
- "Watch on YouTube" button

## Limitations / Known Issues

- **Timestamps may not update correctly** in some cases (progress can drift).
- **Pausing may not stop the progress bar** reliably in Discord (it can continue counting based on the last timestamp Discord received).
- The extension polls for video updates every 3 seconds, so changes may not be instant.
- When the browser tab becomes hidden, Discord presence is cleared.

## Requirements

- Windows 10/11
- Firefox browser
- Node.js (v14+ recommended)
- Discord desktop app (running)

## How It Works

1. **Content Script** (`extension/content.js`): Runs on YouTube pages, extracts video information (title, channel, playback state) every 3 seconds, and sends updates to the background script.
2. **Background Script** (`extension/background.js`): Maintains connection to the native messaging host and forwards messages from the content script.
3. **Native Host** (`native-host/host.js`): Node.js process that communicates with Discord via IPC (named pipes) and updates Rich Presence status.
4. **Native Messaging**: Firefox's native messaging API bridges the extension and the Node.js host process.

## Setup

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it (e.g., "YouTube")
3. Copy the **Application ID** from the General Information page
4. (Optional) Go to **Rich Presence** → **Art Assets** to upload custom images

   **Note:** This project uses YouTube thumbnail URLs for the large image, so custom assets are optional.

### 2. Configure the Native Host

Set a **User** environment variable named `DISCORD_CLIENT_ID` to your Discord Application ID.

**Windows Instructions:**
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to the "Advanced" tab
3. Click "Environment Variables"
4. Under "User variables", click "New"
5. Variable name: `DISCORD_CLIENT_ID`
6. Variable value: Your Discord Application ID
7. Click OK on all dialogs

**Important:** Set it as a **User** environment variable (not System) so Firefox's native host process can inherit it.

### 3. Run Installation

Double-click `install.bat` to:
- Generate/update `native-host/youtube_discord_rpc.json` with the correct absolute path to `native-host/run-host.bat`
- Register the native messaging host in Windows Registry (`HKCU\Software\Mozilla\NativeMessagingHosts\youtube_discord_rpc`)
- Install Node.js dependencies (`native-host/package.json`)

**Note:** The installation script will automatically detect the correct paths based on where you extracted the project.

### 4. Load Firefox Extension

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on..."**
3. Navigate to the `extension` folder and select `manifest.json`

The extension will remain loaded until you restart Firefox or remove it manually.

### 5. Test

1. Make sure Discord desktop app is running (not the web version)
2. Open a YouTube video in Firefox
3. Your Discord status should update within a few seconds!

**Testing Tips:**
- Check the browser console (`F12` → Console tab) for extension messages
- Check `native-host/debug.log` for native host logs
- The "Watch on YouTube" button only appears to other users viewing your profile, not to yourself

## Project Structure

```
DiscordRPC/
├── extension/
│   ├── manifest.json          # Extension manifest (Firefox WebExtension)
│   ├── content.js             # Extracts video info from YouTube pages
│   └── background.js          # Communicates with native host via native messaging
├── native-host/
│   ├── host.js                # Discord IPC implementation and RPC updates
│   ├── package.json           # Node.js dependencies
│   ├── run-host.bat           # Launcher script for native host
│   ├── test-rpc.js           # Test script for Discord RPC (uses discord-rpc library)
│   ├── youtube_discord_rpc.json  # Native messaging manifest (auto-generated)
│   └── debug.log              # Log file (created at runtime)
├── install.bat                # Installation script
└── README.md
```

## Technical Details

### Discord IPC Implementation

The native host (`host.js`) implements Discord's IPC protocol directly using Node.js `net` module:
- Connects via named pipes (`\\?\pipe\discord-ipc-0` through `discord-ipc-9`)
- Uses binary protocol with opcodes and JSON payloads
- Handles connection, activity updates, and cleanup

### Message Flow

1. Content script detects video changes → sends `VIDEO_UPDATE` or `VIDEO_STOPPED` messages
2. Background script forwards messages to native host via native messaging
3. Native host parses messages and updates Discord Rich Presence via IPC
4. Native host sends status responses back to extension

### Dependencies

The `package.json` lists `@discordjs/collection` and `ws`, but the actual implementation (`host.js`) uses only Node.js built-in modules (`net`, `fs`, `path`). The listed dependencies are not required for the current implementation.

## Troubleshooting

### Extension not connecting to native host

- Check `about:debugging` → "This Firefox" → your extension → "Inspect" for errors
- Verify the registry entry exists: `HKCU\Software\Mozilla\NativeMessagingHosts\youtube_discord_rpc`
- Check that the path in the registry points to the correct `.json` file
- Ensure `native-host/youtube_discord_rpc.json` has the correct absolute path to `run-host.bat`
- Try running `install.bat` again to regenerate the manifest

### Discord presence not showing

- Ensure Discord desktop app is running (not Discord web)
- Verify `DISCORD_CLIENT_ID` environment variable is set correctly (check with `echo %DISCORD_CLIENT_ID%` in PowerShell)
- Check `native-host/debug.log` for connection errors
- In Discord Settings → Activity Privacy, enable "Display current activity as a status message"
- Restart Discord after setting the environment variable if it was just added

### Native host errors

- Check `native-host/debug.log` for detailed error messages
- Ensure Node.js is installed and accessible from command line (`node --version`)
- Verify all dependencies are installed (`cd native-host && npm install`)
- Make sure the `DISCORD_CLIENT_ID` environment variable is set as a User variable (not System)

### "Watch on YouTube" button not showing

- Buttons only appear to other users viewing your profile, not to yourself
- Ensure the video URL is valid in the activity data

### Video updates not reflecting

- The extension polls every 3 seconds, so changes may take a few seconds
- Check browser console for content script errors
- Verify you're on a YouTube watch page (URL contains `?v=...`)
- Try refreshing the YouTube page

## Testing the Native Host

You can test the Discord connection independently using `test-rpc.js`:

```bash
cd native-host
node test-rpc.js
```

**Note:** `test-rpc.js` uses the `discord-rpc` library (if installed), while the actual implementation uses raw IPC. You may need to install additional dependencies to run the test script.

## Permanent Installation

For permanent use without reloading on each Firefox restart, you need to sign the extension:

1. Create a [Firefox Add-ons Developer account](https://addons.mozilla.org/developers/)
2. Package your extension (zip the `extension` folder contents)
3. Submit for signing or use self-signing tools
4. Install the signed `.xpi` file

Alternatively, you can use Firefox's `about:config` to set `xpinstall.signatures.required` to `false` (not recommended for security reasons).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
