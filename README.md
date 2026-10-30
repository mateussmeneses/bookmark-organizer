# AI Bookmark Organizer

A **local-first bookmark organizer** for Chrome, Microsoft Edge and Brave. Review suggested categories, safely apply approved changes using the browser's native bookmarks API, and restore recoverable snapshots.

> **v0.3.0 beta:** Not production-validated with personal bookmarks. Real-browser acceptance and independent AI classification calibration are tracked in [release validation](docs/RELEASE.md). Use a disposable browser profile with synchronization disabled for acceptance tests.

## Highlights

- Direct browser access using Manifest V3 and `chrome.bookmarks` — no mandatory HTML export/import.
- Canonical English topics with Portuguese aliases: Gaming/Jogos, Piracy/Pirataria, Software Testing, Emulation, and more.
- On-device rules work offline, with optional batched AI assistance through Ollama or an OpenAI-compatible API.
- Explicit review and approval, previewed operations, automatic snapshots, journaling, and compensating rollback.
- Optional exact-domain auto-organization, duplicate review, smart collections, and health checks.
- No accounts, third-party tracking, or required subscription.

## Install the extension

1. Download and verify the ZIP from [Releases](https://github.com/mateussmeneses/bookmark-organizer/releases).
2. Extract the ZIP. The extracted directory must contain `manifest.json`.
3. Open `chrome://extensions`, `edge://extensions` or `brave://extensions`.
4. Enable **Developer mode**, choose **Load unpacked**, and select the extracted directory.
5. The dashboard opens and reads bookmarks from the current browser profile automatically.
6. Click **Analyze / sync**, review the proposed paths, approve items, preview, and apply. Every application creates a backup first.

**For testing, use a new disposable browser profile with sync turned off.** Installing the extension in a personal profile before acceptance tests is not recommended.

## Optional AI classification

The extension works offline without the companion. For page metadata and selected AI classification, install Node.js 22+ and run:

```powershell
$env:BOOKMARK_EXTENSION_ID = 'your-32-character-extension-id'
npm.cmd start
```

Open `http://127.0.0.1:3210/pair`, copy the temporary pairing token into the dashboard, and approve the optional localhost permission.

Choose Ollama (e.g. `http://127.0.0.1:11434`) or an HTTPS OpenAI-compatible endpoint and model. Select favorites or click **AI classify all unresolved bookmarks** after explicitly granting consent. Classification runs in batches of 20 with progress and cancellation. The confidence score is heuristic, not a calibrated probability, and all AI decisions remain pending until reviewed.

No bookmarks are sent to a model without consent. API keys are not saved by the companion.

## Backups and restore

Every apply operation creates a snapshot. Use **Backups, restore and recovery** to create an additional snapshot, export a portable JSON backup (optionally AES-GCM encrypted), resume an interrupted operation or roll back.

Browser APIs do not support atomic multi-item transactions, arbitrary bookmark IDs, or full timestamp restoration. Externally added favorites are preserved, so restoration is intentionally conservative. See [backup documentation](docs/BACKUP_AND_RESTORE.md).

## Development

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run benchmark
npm.cmd run package
```

No runtime npm dependencies are required. The optional HTML-compatible legacy companion remains available at `http://127.0.0.1:3210` with `npm.cmd start`, but is not needed for the extension's offline functions. Its original import/export workflow is documented separately in [legacy compatibility](docs/LEGACY_HTML.md).

## Guides

- [Installation and browser permissions](docs/INSTALLATION.md)
- [Quick start](docs/QUICK_START.md)
- [Complete user guide](docs/USER_GUIDE.md)
- [AI configuration and privacy](docs/AI_CONFIGURATION.md)
- [Backups, restore and recovery](docs/BACKUP_AND_RESTORE.md)
- [Automation and sync](docs/AUTOMATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development and testing](docs/DEVELOPMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Release validation and limitations](docs/RELEASE.md)

MIT licensed. Contributions are welcome.


## AI-first full-library classification

The extension supports a semantic-first workflow with an explicitly selected Ollama or OpenAI-compatible model. Pair the local companion, select the model, grant permission for the run, and click **Analyze entire library with AI**. All unreviewed eligible bookmarks are processed, not just low-confidence keyword suggestions. Results are cached by model and input; previously approved decisions are protected. No bookmark is moved until the user reviews and approves a plan. Without an AI model, use **Offline analyze / sync**. See [AI configuration](docs/AI_CONFIGURATION.md).
