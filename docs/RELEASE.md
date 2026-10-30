# 0.2.0 pre-release validation

This release is a test candidate, not a production-validated bookmark migration.

## Verified locally

- Node 24.16.0: 23 automated tests passed, including V1 HTTP tests against a temporary synthetic input directory.
- Syntax checks cover all JavaScript files; manifest version and dashboard element references are checked.
- Regression coverage: revoked preview approval, externally changed bookmark before approval, external changes between batch operations, interrupted create reconciliation, backup write failure, encrypted snapshot tampering and wrong passwords, cross-profile restore rejection, preserved external bookmarks and empty folders.
- Companion origin allowlist, session token, consent, CORS preflight and private-network rejection are tested.
- ZIP packaging is restricted to extension files. SHA-256 sidecar accompanies the artifact.

## Browser acceptance

`node tools/browser-smoke.js <browser-executable>` creates a new temporary profile with sync disabled. It creates only a synthetic example.org bookmark and checks analysis, approval, application, rollback, encrypted restore and dashboard rendering. It never attaches to an existing profile. Profiles remain in the OS temporary directory for diagnosis; screenshots go to ignored `dist/`.

The harness uses the experimental [DevTools extension loading API](https://chromedevtools.github.io/devtools-protocol/tot/Extensions/). Local Chrome and Edge attempts timed out before `Browser.getVersion`; they do not establish extension compatibility, and the harness itself has not completed a successful real-browser run. Chrome, Edge and Brave acceptance is still pending. Brave was not found in its standard machine installation path.

Before promoting to stable, exercise all three browsers in disposable profiles: UI/keyboard review, active synchronization, managed folders, concurrent user edits, service worker termination mid-operation, backup export/import and restart recovery. Record browser versions and results here. Do not test against personal bookmarks.

## Limits

- Bookmark APIs are not transactional. A change racing an individual API call cannot be excluded; the journal and checkpoints detect many conflicts and preserve recovery snapshots.
- Interrupted creates matching an external create may be ambiguous; do not resume until the conflict has been inspected.
- Restoring keeps folders absent from the snapshot, including organizer-created empty folders, because their ownership cannot be inferred safely.
- Backup history has no automatic pruning; browser storage and disk usage grow.
- Auto-organization is opt-in and limited to explicitly authorized exact-domain rules. Confidence is heuristic, not calibrated.
- V1 still requires one companion process per data directory. Do not migrate or overwrite existing private state.
- Model quality, live model integration, full cross-browser behavior and active-sync recovery are not validated by mocked tests.

## Publication

Publish only source, synthetic fixtures, docs and the extension ZIP/checksum. Exclude `input/`, `data/`, `reports/`, browser profiles and local screenshots. Publish GitHub release `v0.2.0` as a pre-release; it is not a Chrome/Edge store submission. Check the authenticated CI result after pushing.
