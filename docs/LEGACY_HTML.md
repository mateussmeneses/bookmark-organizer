# Legacy Netscape HTML companion

The legacy V1 interface is retained only for compatibility with previous local HTML-based workflows. The current extension does not require exported HTML.

To use the legacy interface intentionally, put a Netscape-compatible HTML export in `input/`, then run `npm.cmd start` and open `http://127.0.0.1:3210`. The V1 app audits, compares, reviews and exports the proposed tree; it does not write directly to the native browser profile.

Legacy inputs, outputs, snapshots and reports must remain private. The `input/`, `data/`, and `reports/` folders are git-ignored. Do not confuse V1 state backups with the extension's browser snapshots.
