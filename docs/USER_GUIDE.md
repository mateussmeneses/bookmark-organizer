# User guide

## Organizing an existing library
**Analyze / sync** reads native browser bookmarks and calculates local candidate categories. The interface lists current and proposed paths for every bookmark. Filter by category or by low-confidence results, then approve or reject changes.

A bookmark can receive one primary destination and multiple descriptive tags. Categories are standardized in English and accept Portuguese synonyms. For example, `Jogos` and `Video Games` map to `Gaming`; `Pirataria` maps to `Piracy`, which remains distinct from Emulation and Modding.

Correct a category using **Edit selection** and approve it to store an exact-URL local correction. Reset these learning rules using **Reset learned preferences**.

## Bulk review
Select a page or several items, choose a canonical destination, then approve. Changes to browser content after approval invalidate stale previews. Review and generate a fresh plan when the browser has changed.

## Original and proposed trees
The Original tree is a read-only view of the current browser hierarchy. Proposed categories are destinations, not separate bookmarks; drag a card to a category to suggest a pending correction.

## Duplicates
The app distinguishes identical URLs, common tracking-parameter variants, redirect targets (when inspected), and page excerpts. These are review signals, not authorization to delete. Automatic deletion is intentionally disabled.

## Health inspection
Select a limited set of URLs, grant per-operation consent, and run **Inspect selected links**. HTTP 404/410 can indicate a missing page; 401/403/429, transient network failures and 5xx are inconclusive. Do not delete bookmarks based solely on these signals.

## Other views
Smart Collections save a query without moving any physical bookmark. The progress bar shows analysis and AI batch progress. Cancel requests are cooperative; already completed, reviewed operations remain in local storage.

## Scope of restoration
Undo and restore protect links and original folder placement. Browser-generated IDs and historical timestamps cannot be reproduced arbitrarily. Organizer-created empty folders are cleaned only when proven to belong to the operation and still empty; unknown folders and external additions are retained.

## Optional empty-folder cleanup
Before Preview, check **Clean up source folders that become empty** if you want to remove obsolete paths. The plan then attempts to remove only existing source folders emptied by approved moves. Any non-empty folder is retained, including folders with unapproved or externally added items. This step has a recoverable backup, but restoring a deleted folder requires a new browser-assigned ID.
