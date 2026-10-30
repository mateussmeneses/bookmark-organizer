# Changelog

## 0.3.0 beta 7
- Hardened source-folder cleanup with parent and identity verification.
- Limited rollback folder deletion to positively recorded organizer creations.
- Reduced full-cache writes during analysis; added 2,000-item checkpoints.
- Added separate duplicate grouping benchmark measurements and regression tests.
- Maintains mandatory Chrome, Edge and Brave smoke-test release gates.


## 0.3.0 beta 6
- Verified real Chrome, Edge and Brave smoke workflows in disposable profiles.
- Reconciled the optional empty-source-folder cleanup checkbox and preview action.
- Made all three browser smoke suites required CI release gates.
- Corrected beta-tag automation so new releases match the published commit.

## 0.3.0 beta 2\n- Fixed a browser-only backup checksum mismatch from storage key reordering; added regression coverage.\n\n## 0.3.0 beta 1
- Added opt-in, batched classification of unresolved bookmarks using the configured AI companion.
- Optimized duplicate grouping for large collections.
- Improved rollback to clean known empty folders created during organization.
- Extended regression tests and synthetic benchmarks.
- Rebuilt the real-browser CDP smoke harness.
- Added release automation and comprehensive English documentation.

## 0.2.0
- Initial Chromium Manifest V3 extension prerelease with native bookmark access.
- Local rules and taxonomy, review, recovery journal, and encrypted backup export.
- Optional localhost AI/metadata companion and Windows CI packaging.
