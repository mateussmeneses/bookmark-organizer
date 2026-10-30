# Semantic-first AI bookmark organization

The browser extension has two analysis actions:

- **Analyze entire library with AI** — the primary semantic workflow when an AI model has been configured and the user grants consent for this run.
- **Offline analyze / sync** — fast deterministic processing without a model, used for offline fallback and local indexing.

The AI workflow **evaluates every eligible pending bookmark**, including items whose keyword classification already looks confident. Approved/rejected proposals, manual corrections and exact-domain user rules are preserved.

## Setup

1. Install the extension in a disposable browser profile for initial testing and start the optional Node.js companion with `npm.cmd start`.
2. Pair the companion using the extension's ID and current localhost session token; see [INSTALLATION.md](INSTALLATION.md).
3. Under **Automation, models and privacy**, configure **Ollama** (`http://127.0.0.1:11434` and your installed model name) or **OpenAI-compatible** (HTTPS base URL ending in `/v1`, model ID, API key).
4. Check the per-operation consent box. Click **Analyze entire library with AI** in the top toolbar.
5. The extension refreshes the entire bookmark tree, sends eligible links to the selected model in batches of up to 20, normalizes the classifications and presents them for review.
6. Approve proposals, preview the exact move plan and apply it. **AI inference itself never moves, deletes or renames bookmarks.**

## Caching and continuity

Semantic results are cached by input evidence (URL, title and selected metadata), the selected provider, endpoint and model, and local rules. A subsequent analysis skips unchanged items. Switching models or editing bookmark evidence invalidates the relevant semantic result. Low-confidence or unrecognized topics go to **Review Inbox**, and cached ambiguous decisions are not repeatedly charged until their input or model changes.

The extension records lightweight progress per 20-item batch and checkpoints proposals and results after 100 items, cancellation, completion or error. A retry processes unfinished items. The model is never called silently at browser startup.

## Classification contract

The model receives titles, URLs and selected metadata, not the complete browser profile by default. It must classify topics using meaning rather than simple keywords; Portuguese and English labels map to an English canonical taxonomy. For example, Gaming/Jogos and Piracy/Pirataria are distinct categories. The companion validates model IDs, result completeness and duplicate entries. Unknown categories are sent to Review Inbox instead of creating unreviewed folders. An OpenAI-compatible model that rejects `response_format: json_object` is retried only on a specific compatibility error.

## Privacy and quality

Remote providers receive the metadata you explicitly authorize for that run. Ollama keeps inference local; an external service is governed by that provider's data practices. API keys are not persisted by the extension.

Model-reported confidence is **not calibrated**. Live quality must still be measured against a representative labeled sample, including uncommon bilingual categories, before any automated AI-based modification is considered. The synthetic benchmark measures offline code, not model inference speed.
