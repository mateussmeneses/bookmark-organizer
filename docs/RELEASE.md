# Release v0.3.0 beta 1 — validation report

**Status: pre-release. The code has not been production-validated against personal bookmarks.**

## Engineering changes
- Added a guided, opt-in AI action to classify all unresolved bookmarks in batches of 20, with explicit consent, progress and cancellation.
- Improved exact/tracking duplicate grouping to avoid repeated array copies.
- Extended compensating rollback to remove known organizer-created folders only when still empty and unchanged.
- Added dedicated regression tests and a synthetic 1K/5K/10K performance benchmark.
- Reworked the CDP browser smoke runner to use a WebSocket endpoint and real temporary browser profiles, rather than the previous fragile debugging pipe.
- Expanded English documentation, release workflow, and walkthroughs.

## Verification evidence
- Unit tests and syntax checks: see the specific CI run for this commit.
- Chrome/Edge browser test: see the separate non-gating browser-smoke job.
- Brave compatibility: **not verified** until recorded against a disposable Brave profile.
- Live AI classification quality: **not calibrated** against a real LLM and representative personal bookmarks.
- Browser sync / interruption recovery: synthetic tests exist; real browser fault-injection remains outstanding.
- Encryption and snapshots: tested synthetically; application state depends on Chrome extension storage quotas.

The automated GitHub release is intentionally marked **prerelease**. A successful build does not imply readiness for personal bookmark migration.

## Manual acceptance checklist
- [ ] Chrome: install, analyze, approve, preview, apply, rollback, restart and verify
- [ ] Edge: same complete workflow
- [ ] Brave: same complete workflow
- [ ] Active sync and external bookmark edits
- [ ] Service worker termination during application and recovery
- [ ] Representative AI calibration across personal topics with consent
- [ ] Visual and keyboard accessibility with captured evidence

Only promote to stable when the checklist and security review are complete.
