# TinyUtils Backup Guide

Ensure the working tree survives accidental deletes (`rm -rf`) by keeping timestamped archives plus an optional off-site mirror.

## 1. Local snapshot archives

Use `scripts/backup_repo.sh` to create compressed snapshots under `~/dev/TinyBackups` (customise with an argument if you prefer another path).

```bash
cd /Users/cav/dev/TinyUtils/tinyutils
./scripts/backup_repo.sh                # writes ~/dev/TinyBackups/tinyutils-YYYYMMDDTHHMMSSZ.tar.gz
KEEP_COUNT=30 ./scripts/backup_repo.sh  # keep the latest 30 archives; defaults to 14
./scripts/backup_repo.sh ~/Backups/TinyUtils
```

The tarball excludes `node_modules`, `artifacts`, and other transient folders but keeps Git metadata and local `.env` files so the repo can be restored exactly as-is.

### Automate with `launchd` (macOS)

Create `~/Library/LaunchAgents/com.tinyutils.backup.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.tinyutils.backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd /Users/cav/dev/TinyUtils/tinyutils && ./scripts/backup_repo.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>2</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/Users/cav/dev/TinyBackups/backup.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/cav/dev/TinyBackups/backup.err</string>
</dict>
</plist>
```

Load it with:

```bash
launchctl load ~/Library/LaunchAgents/com.tinyutils.backup.plist
```

This runs the backup daily at 02:00. Adjust the interval to suit (e.g., run every 6 hours by duplicating entries or switch to a `StartInterval` value in seconds). The script keeps the latest 14 archives by default; raise `KEEP_COUNT` if you want a longer window.

### Event-driven backups while you work

Use the template in `launchd/com.tinyutils.backup.watch.plist` to trigger archives whenever files in the repo change (with a 10-minute cooldown so edits don’t spawn constant backups):

1. Copy the template and load it:
   ```bash
   mkdir -p ~/Library/LaunchAgents
   cp /Users/cav/dev/TinyUtils/tinyutils/launchd/com.tinyutils.backup.watch.plist ~/Library/LaunchAgents/
   launchctl unload ~/Library/LaunchAgents/com.tinyutils.backup.watch.plist 2>/dev/null || true
   launchctl load ~/Library/LaunchAgents/com.tinyutils.backup.watch.plist
   ```
2. The job watches `/Users/cav/dev/TinyUtils/tinyutils` for changes and runs:
   ```bash
   MIN_INTERVAL_SECONDS=600 SKIP_IF_CLEAN=1 ./scripts/backup_repo.sh
   ```
   - `MIN_INTERVAL_SECONDS=600` enforces a 10‑minute cooldown between backups (set to `0` to disable).
   - `SKIP_IF_CLEAN=1` skips the backup if `git status --porcelain` is empty.
   - Set `FORCE=1` when you need to override both safeguards (e.g., manual run).
3. `launchd` writes logs to `~/dev/TinyBackups/watch-backup.log` / `.err`; rotate or prune them occasionally.
4. Modify the template if your repo lives elsewhere or if you want a tighter interval.

## 2. Off-site / cloud versioning

For Time-Machine-style history in the cloud, layer a content-addressable backup tool on top of the local archives:

1. Install [restic](https://restic.net/) or [borgbackup](https://www.borgbackup.org/) (both deduplicate and encrypt).
2. Configure credentials and repository targets. Example (fish shell) for Backblaze B2:
   ```fish
   mkdir -p ~/.config
   printf 'your-restic-password\n' > ~/.config/restic-tinyutils.pass
   chmod 600 ~/.config/restic-tinyutils.pass

   mkdir -p ~/dev/TinyBackups/scripts
   cat > ~/dev/TinyBackups/scripts/restic.env <<'ENV'
export RESTIC_REPOSITORY='b2:tinyutils-backups:/repo'
export RESTIC_PASSWORD_FILE="$HOME/.config/restic-tinyutils.pass"
# export B2_ACCOUNT_ID='your-account-id'
# export B2_ACCOUNT_KEY='your-app-key'
# export AWS_ACCESS_KEY_ID='...'
# export AWS_SECRET_ACCESS_KEY='...'
ENV

   restic init
   ```
   Replace the repository string with your provider (`s3:…`, `rclone:…`, etc.) and store secrets with `set -Ux` so they survive shell restarts.
3. Run `~/dev/TinyBackups/scripts/restic_push.sh` to upload the latest tarballs (the script auto-loads `restic.env`):
   ```fish
   ~/dev/TinyBackups/scripts/restic_push.sh
   ```
   The script aborts if no archives are present or if required env vars are missing.
4. Automate via the LaunchAgent template stored alongside the backup scripts (`~/dev/TinyBackups/scripts/com.tinyutils.restic.plist`) so the push happens every 30 minutes (tweak the interval as needed):
   ```fish
   set UID_NUM (id -u)
   mkdir -p ~/Library/LaunchAgents
   cp ~/dev/TinyBackups/scripts/com.tinyutils.restic.plist ~/Library/LaunchAgents/
   launchctl bootout gui/$UID_NUM ~/Library/LaunchAgents/com.tinyutils.restic.plist 2>/dev/null
   launchctl bootstrap gui/$UID_NUM ~/Library/LaunchAgents/com.tinyutils.restic.plist
   ```
   Logs write to `~/dev/TinyBackups/restic.log` / `.err`. Use `launchctl kickstart gui/$UID_NUM/com.tinyutils.restic` after a backup completes if you want an immediate upload instead of waiting for the next interval.

Because the tarballs already contain Git history and `.env` files, pulling a specific restore point is as simple as:

```bash
restic restore latest --target ~/restore/
tar -xzf ~/restore/tinyutils-20251105T020000Z.tar.gz -C /Users/cav/dev/TinyUtils/
```

## 3. Git remotes (optional)

If you prefer pure Git, add an off-site bare repo (e.g., GitHub, self-hosted Gitea) and push frequently:

```bash
git remote add backup git@github.com:cavin/tinyutils-backup.git
git push backup main
```

Use short-lived tokens and never push `.env.local` or other secret files—gitignore them or use `git-crypt`/`sops` when necessary.

## Restore checklist

1. Retrieve the relevant tarball (local or restic).
2. Extract into the desired directory.
3. Reinstall dependencies (`pnpm install`) and verify environment variables (`.env.local`).
4. Run `pnpm test` or the preview smoke scripts before resuming work.
