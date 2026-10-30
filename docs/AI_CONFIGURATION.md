# AI providers, classification, and privacy

The extension uses offline deterministic rules by default. Its sparse keyword vectors are **not** neural-network embeddings. Reliable semantic understanding of uncommon subjects requires an optional real model and empirical evaluation.

## Ollama (local)
1. Install and start Ollama, then download a supported instruction model.
2. Start the Node.js companion and pair it as described in [installation](INSTALLATION.md).
3. Select `Ollama`; enter `http://127.0.0.1:11434` and the installed model name.
4. Check the consent option and use **AI classify selection** or **AI classify all unresolved bookmarks**.

## OpenAI-compatible HTTP API
Choose `OpenAI-compatible`, supply the HTTPS API base URL ending with `/v1`, the provider's exact model ID, and an API key. The companion appends `/chat/completions` automatically. Responses must contain JSON classification proposals; some providers do not support `response_format=json_object`.

## Privacy
Classification requires consent for the selected operation. Remote AI receives selected URLs, titles and selected metadata. The extension never automatically uploads all bookmarks and never stores an API key. The pairing token is local and expires on companion restart.

The **all unresolved** command processes pending, uncertain bookmarks in groups of 20. It runs only when explicitly requested, caches results for later review, and supports cancellation. It is not an autonomous background inference or silent upload.

## Quality evaluation
Do not treat heuristic confidence as measured probability. Use a stratified labeled evaluation sample containing at least 50 representative personal bookmarks, including bilingual, niche and ambiguous topics. Record per-category precision, abstention and wrong-folder rates. No quality benchmark on the user's private library has been performed.
