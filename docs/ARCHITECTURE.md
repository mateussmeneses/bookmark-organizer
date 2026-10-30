# Architecture

```text
Chromium bookmarks API
   -> extension/background.js (profile state, event scheduling, commands)
   -> extension/core/classifier.js + taxonomy.js (local classification and caching)
   -> extension/core/reconcile.js (preview plan, write-ahead execution, rollback)
   -> extension/core/backup.js (validated snapshot, optional authenticated encryption)
   -> extension/dashboard.* (review, selection, progress)
   -> optional localhost companion server.js + lib/network.js (metadata / AI)
```

The extension is independent of the companion for browsing and applying local organization plans. Communication with the companion uses an exact extension-origin allowlist, a temporary session token, explicit consent and optional loopback host permission.

The legacy Netscape HTML parser and UI remain under `lib/`, `public/`, `audit.js` and `server.js`. They are a compatibility path, not the extension's normal browser synchronization mechanism.

The app does not execute third-party website code during metadata inspection. Requests reject local/private targets and private redirects. The repository excludes all real browser data and generated reports.

Relevant data stores: `chrome.storage.local` for extension metadata, proposals, snapshots and journals; `data/` for the optional legacy HTML companion. They are separate and are never silently merged.
