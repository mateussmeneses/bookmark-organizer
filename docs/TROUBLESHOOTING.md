# Troubleshooting

## The dashboard does not list favorites
Check that the extension is enabled in the correct browser profile and has bookmark permission. Click **Analyze / sync**. The extension cannot access favorites in a different browser profile automatically.

## AI provider errors
Check that the optional companion is running and paired with the exact extension ID. For Ollama, ensure the exact model is downloaded. For a remote OpenAI-compatible provider use an HTTPS base URL without `/chat/completions`. Some providers reject the structured JSON response format; inspect the server error.

## Review or apply says the browser changed
Another tab, browser sync, or an extension modified the tree. Refresh analysis and approve a new preview. Do not force an old plan.

## Recovery reports a conflict
Inspect **Backups, restore and recovery**. Save an additional manual snapshot before any reconciliation. Do not remove an unknown user-created folder to make a batch succeed.

## The local companion will not connect
Verify Node.js 22+, `BOOKMARK_EXTENSION_ID`, loopback permission and the temporary token from `http://127.0.0.1:3210/pair`. Restarting the companion invalidates the old token.

## PowerShell blocks npm.ps1
Use `npm.cmd` rather than changing your machine-wide execution policy.

## Theme or layout issues
Try reloading the extension. Real browser visual and accessibility testing remains part of beta acceptance; report browser version, expected/actual result and a screenshot without private URLs.
