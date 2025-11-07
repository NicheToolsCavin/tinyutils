# Codex Context: Email Sanitization and Git/GitHub Setup

Date: $(date)

## Scope
- Hide personal emails across repos and standardize commit identity to GitHub noreply.
- Align `git` and `gh` to the correct account per repo.
- Provide session resume + SSH commit signing setup.

## Accounts and Noreply Emails
- cavingraves → 193660148+cavingraves@users.noreply.github.com
- FractalAwareness-Cavin → 238901224+FractalAwareness-Cavin@users.noreply.github.com
- NicheToolsCavin → 233439074+NicheToolsCavin@users.noreply.github.com

## Codex Resume
- Most recent session: `codex resume --last`
- Picker: `codex resume`
- With directory: `codex -C /Users/cav/dev/TinyUtils resume --last`

## Repo 1: 3IATLAS-astro-app-import (FractalAwareness-Cavin)
Local path: /Users/cav/dev/TinyUtils/_audit_3iatlas (clone used for audit/rewrite)
Remote: https://github.com/FractalAwareness-Cavin/3IATLAS-astro-app-import.git
Active gh account: FractalAwareness-Cavin (HTTPS)

Actions
- Set local identity:
  - `git config user.name "FractalAwareness-Cavin"`
  - `git config user.email "238901224+FractalAwareness-Cavin@users.noreply.github.com"`
- .mailmap added (root):
  - Map fractalawarenesscavin@gmail.com → FractalAwareness-Cavin noreply
  - Map cavingraves@gmail.com → FractalAwareness-Cavin noreply
- History rewrite (built-in filter-branch):
  - Safety branch: `backup/pre-rewrite-YYYYMMDD-HHMMSS` (local only)
  - Replaced author/committer emails in {cavingraves@gmail.com, fractalawarenesscavin@gmail.com} → noreply
- Verification:
  - After rewrite: only `238901224+FractalAwareness-Cavin@users.noreply.github.com`
- Force push: `git push --force --tags origin main`

Notes
- No signed commits/tags were present.

## Repo 2: tinyutils (NicheToolsCavin)
Path: /Users/cav/dev/TinyUtils/tinyutils
Remote: https://github.com/NicheToolsCavin/tinyutils.git
Active gh account: NicheToolsCavin (HTTPS)

Actions
- Set local identity:
  - `git -C tinyutils config user.name "NicheToolsCavin"`
  - `git -C tinyutils config user.email "233439074+NicheToolsCavin@users.noreply.github.com"`
- .mailmap added at `tinyutils/.mailmap`:
  - Map nichetoolscavin@gmail.com → NicheToolsCavin noreply
  - Map cavingraves@gmail.com → NicheToolsCavin noreply
- History rewrite across all branches:
  - Local safety branch: `backup/pre-rewrite-YYYYMMDD-HHMMSS`
  - Rewrote author/committer emails to NicheToolsCavin noreply
  - Cleaned `refs/original` and reflogs; ran aggressive GC
- Force-pushed branches and tags (examples):
  - main, test/dlf-quick-extras-2025-10-22, all codex/* branches
- Verification (post-rewrite):
  - Unique emails: `233439074+NicheToolsCavin@users.noreply.github.com`, `noreply@github.com` (for GitHub merges)

## Commands Reference (Audit + Rewrite)
- List unique emails: `git log --all --format='%ae%n%ce' | sort -u`
- Set local identity:
  - `git config user.name "<Name>"`
  - `git config user.email "<noreply@users.noreply.github.com>"`
- .mailmap example:
  - `<Display Name> <noreply> <real-email@domain>`
- Built-in rewrite (env-filter):
  - `git filter-branch --env-filter '<set GIT_AUTHOR_*/GIT_COMMITTER_* when matching emails>' --tag-name-filter cat -- --all`
- Cleanup: `rm -rf .git/refs/original .git/logs && git gc --prune=now --aggressive`
- Force-push all: `git push --force origin --all && git push --force origin --tags`

## gh Alignment / HTTPS
- Confirm: `gh auth status -h github.com` (shows active account)
- Ensure remote URL owner matches active account.

## SSH Commit Signing (Optional)
1) Generate signing key (per account):
   - `ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_<account>_sign -C "<Account> signing key"`
2) Add to GitHub as Signing key:
   - `gh ssh-key add ~/.ssh/id_ed25519_<account>_sign.pub --type signing --title "<Account> signing"`
3) Configure in repo:
   - `git -C <repo> config gpg.format ssh`
   - `git -C <repo> config user.signingkey ~/.ssh/id_ed25519_<account>_sign.pub`
   - `git -C <repo> config commit.gpgsign true`
4) Test:
   - `git -C <repo> commit --allow-empty -m "chore: test signed"`
   - `git -C <repo> log --show-signature -1`

## Troubleshooting
- HTTPS credential prompts: clear Keychain “github.com” or `git credential reject` for the origin URL.
- Protected branches: temporarily allow force pushes to complete rewrite.
- Residual emails: re-run env-filter including any new patterns, then push --force.

