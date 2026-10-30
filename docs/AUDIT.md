# V1 audit and V2 scope

Baseline: 10 passing Node tests. No Git repository or remote was present. Existing private input, reports and state are excluded from publication and must not be migrated destructively.

Findings: O(n²) ancestor-index rebuilding and folder scans; no browser API integration; no canonical taxonomy; Gaming/Emulation/Piracy conflated; folder names treated as authority; no persistent inference cache; sequential network enrichment; no cross-process lock; partial-operation recovery absent; undo toggles snapshots rather than providing a cursor; UI in Portuguese; no extension tests, CI, static checks or build. Real browser UI and AI quality were unverified.

Scope: retain the Node HTML compatibility path, safe network client and original snapshots. Add browser-portable taxonomy/indexing, extension orchestration, recoverable operation journal, local learning, profile-local snapshots, dashboard and release tooling. Existing private files are never rewritten by migration. V1 timing is retained as a synthetic benchmark baseline, not shipped in the extension.

Release gates: mocked tests do not establish browser compatibility. Real Chrome/Edge/Brave profile tests and authenticated GitHub CI/release verification remain mandatory before describing a release as production-validated.

## Continuation — 2026-10-30

Terminal access restored; `npm.cmd test` avoids the local PowerShell npm.ps1 execution-policy error. The existing implementation was retained. Baseline V2: 20 passing tests; continuation: 23 passing tests plus syntax/manifest/dashboard checks. No personal bookmark mutations or private-state migration were performed.

Completed missing companion route and pairing page with an exact extension-origin allowlist, token and consent; reduced optional host permission to loopback. Invalidated previews after review/configuration changes and rejected approvals for changed bookmarks. Kept cancellation enabled in the dashboard. Added between-operation tree checkpoints. Restores now preserve external empty folders rather than deleting all folders absent from a snapshot. Added synthetic HTTP fixtures, packaging/checksum tooling and Node 22/24 CI.

Remaining gates and known limitations are recorded in [RELEASE.md](RELEASE.md). Original findings are historical, not claims that every V2 scope item has been completed. Cross-process locking of the legacy store, a cursor-based undo UI, live model calibration and complete cross-browser fault-injection acceptance remain pending.
