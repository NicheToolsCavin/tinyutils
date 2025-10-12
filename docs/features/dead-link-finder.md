# Dead Link Finder — Feature Log

## 2025-10-12 — P1 polish: robots status normalization, debug mode, hardened exports & copy UX; server caps
- **Human notes:** Responses now report request IDs and consistent robots status messaging, the page shows a collapsible debug block when `?debug=1`, exports (CSV/JSON/keyboard copy) are hardened with better filenames, and the copy status button includes the run ID.
- **Dev notes:** Updated `api/check.js` (robots normalization, concurrency cap, request header), refreshed `tools/dead-link-finder/index.html` (debug UI, exports, shortcuts), added this log entry.
- **Risk:** Medium — touches critical API flow and front-end export logic; regression tests rely on manual verification.
- **Revert plan:** Revert the commit (`git revert <sha>`) to restore prior API/UI behaviour and remove this log entry.
