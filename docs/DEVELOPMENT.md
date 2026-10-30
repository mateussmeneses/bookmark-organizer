# Development, tests and release process

## Requirements
Node.js 22+ and PowerShell for packaging. The project has no mandatory npm runtime dependencies.

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run benchmark
npm.cmd run package
```

The benchmark generates synthetic libraries of 1,000, 5,000 and 10,000 bookmarks and reports cold classification, cache reuse, reconciliation planning and heap usage. It measures deterministic processing rather than real model inference or native browser writes.

## Real-browser smoke test
Run with an installed browser executable:

```powershell
node tools/browser-smoke.js "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

The runner creates a **fresh temporary profile** with sync disabled, loads the extension, creates synthetic data, applies a plan, rolls it back, checks backup encryption/restore and confirms dashboard rendering. It must never attach to personal browser data.

The CI matrix runs JavaScript checks, tests, synthetic benchmarks and ZIP packaging on Windows with Node 22 and 24. A separate browser-smoke job runs available Chrome/Edge executables and exposes its result. Browser acceptance is non-gating until the test harness and environments are validated; read failures rather than inferring compatibility from unit tests.

## Release procedure
An automated beta release may be created on `main` after the test matrix succeeds. Releases labeled **beta** are not production validation or browser-store approval. Promote to stable only after Chrome, Edge and Brave acceptance with disposable profile test matrices, recorded versions and evidence.

## Style and privacy
Keep public documentation, UI changes and new code comments in English. Never commit real bookmarks, personal exports, user profiles, private backups, API keys, or logs. Add regression tests when fixing bugs.
