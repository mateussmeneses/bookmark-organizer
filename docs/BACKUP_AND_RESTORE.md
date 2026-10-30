# Backup, restore and recovery

## Protection model
Before applying a plan, the extension stores a snapshot of the complete bookmark tree and checks its integrity using SHA-256. It writes a journal entry for every browser operation before executing it, and checkpoints expected state after each step.

Manual backups are available in the dashboard. For a portable encrypted backup, use a passphrase of 12+ characters. Encryption uses PBKDF2-HMAC-SHA256 and AES-256-GCM. Keep the password private: it is not recoverable by the project.

## Restore a saved snapshot
Open **Backups, restore and recovery**, choose a backup, then select **Restore selected backup**. The operation itself creates a new snapshot first. A snapshot from another extension/browser profile is rejected. You can also import a previously exported JSON backup for the same profile.

## Interrupted jobs
Use **Resume interrupted batch** only after reviewing conflicts. **Undo / compensating rollback** restores the previous structure where permitted by browser APIs. A rollback cleans *only* known empty folders created by that operation; it will not delete a folder containing other user data.

## Limitations
Chrome's bookmark API provides no atomic multi-item transaction. Some races require manual conflict resolution. Original bookmark IDs and historical timestamps may not be restorable after deletion. External additions and unknown empty folders are preserved intentionally. Stored backup history currently has no automatic expiry or quota pruning; export important backups and manage browser storage proactively.

**Never test a new release against your only copy of personal bookmarks.**
