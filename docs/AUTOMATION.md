# Automation and synchronization

## Automatic detection
The extension reads the browser's bookmark tree on installation and can synchronize on browser startup and bookmark change events. A background alarm debounces events to avoid immediate repeated processing.

## Review Mode — default
Analyze, inspect, approve, preview and apply. Unapproved records never move. Each approved batch creates a backup and journal.

## Auto-Organize — explicit opt-in
Enable automation in the dashboard and create **exact-domain** rules with explicit per-rule authorization. Only those matching rules with confidence >=95% are eligible for background movement. Unrecognized and ambiguous items go to review. Auto mode does not automatically delete bookmarks.

## AI-assisted bulk review
Pair the companion, configure a model, authorize the operation, and select **AI classify all unresolved bookmarks**. The action classifies low-confidence pending items in groups of 20, saves progress, and requires review before application. It is separate from automatic domain rules.

## Browser sync conflicts
Concurrent changes can invalidate a preview or pause a batch. The journal tracks expected tree state. Recover or re-run analysis after resolving conflicts. Native browser sync should remain disabled in disposable acceptance profiles.
