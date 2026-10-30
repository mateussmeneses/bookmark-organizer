# Release v0.3.0 beta 8 — validation report

**Status: pre-release. The code has not been production-validated against personal bookmarks.**

## Engineering changes
- Fixed responsive source-folder cleanup controls after inspecting full-page Chrome/Edge screenshots.
- Fixed pending-review counts to ignore bookmarks already approved or rejected.
- New in beta 7: source-folder cleanup checks the original parent and fields before removing an empty folder.
- New in beta 7: undo removes only organizer-created folders recorded in completed operations; interrupted/adopted folders are preserved.
- New in beta 7: classification progress writes are lightweight; full cache and proposal checkpoints happen every 2,000 items plus cancellation/final save.
- New in beta 7: synthetic benchmarks measure duplicate grouping separately, with regression tests for cleanup identity and rollback provenance.
- Restored the optional source-folder cleanup UI controls after reconciling concurrent patches.\n- Added a guided, opt-in AI action to classify all unresolved bookmarks in batches of 20, with explicit consent, progress and cancellation.
- Improved exact/tracking duplicate grouping to avoid repeated array copies.
- Extended compensating rollback to remove known organizer-created folders only when still empty and unchanged.
- Added dedicated regression tests and a synthetic 1K/5K/10K performance benchmark.
- Fixed a real Chrome rollback integrity failure by hashing canonical JSON before storage serialization (preserves legacy verification when possible).\n- Reworked the CDP browser smoke runner to use a WebSocket endpoint and real temporary browser profiles, rather than the previous fragile debugging pipe.
- Expanded English documentation, release workflow, and walkthroughs.

## Verification evidence
- Node 22/24 unit tests, syntax checks and 1K/5K/10K synthetic benchmarks: required release gates; see CI for this commit.
- Chrome/Edge real browser smoke tests: **passed** with Chrome/156.0.8078.48 and Edge/155.0.4283.62 in disposable profiles. Current CI enforces these tests before release.
- Brave smoke test: **passed** in a fresh temporary profile with the verified official v1.98.62 installer. The CDP product identifies itself as Chrome/156.0.8078.74.
- Live AI classification quality: **not calibrated** against a real LLM and representative personal bookmarks.
- Browser sync / interruption recovery: synthetic tests exist; real browser fault-injection remains outstanding.
- Encryption and snapshots: tested synthetically; application state depends on Chrome extension storage quotas.

The GitHub release requires Node 22/24 tests and real Chrome/Edge/Brave smoke tests to pass; it remains intentionally marked **prerelease**. A successful build does not imply readiness for personal bookmark migration.

## Manual acceptance checklist
- [ ] Chrome: install, analyze, approve, preview, apply, rollback, restart and verify
- [ ] Edge: same complete workflow
- [ ] Brave: same complete workflow
- [ ] Active sync and external bookmark edits
- [ ] Service worker termination during application and recovery
- [ ] Representative AI calibration across personal topics with consent
- [ ] Visual and keyboard accessibility with captured evidence

Only promote to stable when the checklist and security review are complete.
