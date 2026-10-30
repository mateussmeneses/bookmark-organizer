# Development roadmap

## Delivered in beta
- Direct Chromium Manifest V3 bookmark access (not mandatory HTML export).
- Offline category normalization, including bilingual aliases and distinct niche topics.
- Interactive review, correction, approval and change preview.
- Journaled apply operations, snapshots, encrypted manual export and conservative restore.
- Exact-domain opt-in background organization.
- Optional AI provider bridge and manual batch classification for unresolved bookmarks.
- Synthetic tests, performance benchmarks, CI packaging, and public GitHub releases.

## Evidence gates before stable
1. Successful real browser acceptance against disposable Chrome, Edge and Brave profiles.
2. Active native browser sync, external edits, controlled termination and crash recovery verified on all supported browsers.
3. Stratified semantic evaluation with real inference and consented representative bookmarks.
4. UI accessibility and keyboard review on all supported browsers, with screenshots.
5. Backup quota management, long-lived storage, and multi-profile restoration limitations clearly tested.
6. Verified browser update/uninstall experience and complete English documentation.

CI success alone does not satisfy these criteria. No automated operation may destroy user bookmarks or reclassify uncertain entries without approval.
