# Installation

## Requirements
- Chrome, Microsoft Edge or Brave supporting Manifest V3.
- A Windows, macOS or Linux desktop.
- Node.js 22+ only if you want the optional AI/metadata companion.

## Install (unpacked extension)
1. Open [GitHub Releases](https://github.com/mateussmeneses/bookmark-organizer/releases) and download the latest ZIP and its SHA-256 file.
2. Unzip into a permanent folder that will not be deleted while the extension is loaded.
3. In Chrome, open `chrome://extensions`. In Edge open `edge://extensions`; in Brave open `brave://extensions`.
4. Enable **Developer mode** and choose **Load unpacked**.
5. Select the folder containing `manifest.json`, not the repository root.
6. Allow bookmark access. The dashboard opens automatically and reads the current profile.
7. Test using a disposable browser profile with browser sync disabled before installing in a personal profile.

No manual bookmark export or import is required for the extension. Existing original bookmarks are never changed by the **Analyze** operation.

## Optional local companion
In the repository root, set `BOOKMARK_EXTENSION_ID` to the 32-character ID shown on the extensions page and run `npm.cmd start` (Windows), or `npm start` on other systems. Open `http://127.0.0.1:3210/pair`, copy the token into the dashboard, and approve the optional loopback permission. Pairing expires when the server restarts. Do not expose port 3210 to the network.

## Update
Download the new ZIP, extract it to the same unpacked extension folder, and click **Reload** on the extensions page. Keep backup exports before updating or uninstalling. Reinstalling from a *different* folder may change the extension ID and storage identity; retain your original directory and exported backups.
