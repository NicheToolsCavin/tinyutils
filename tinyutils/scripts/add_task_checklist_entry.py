#!/usr/bin/env python3
"""Insert a row into docs/AGENT_TASK_CHECKLIST.md."""

import argparse
from datetime import datetime
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
CHECKLIST_PATH = ROOT / "docs" / "AGENT_TASK_CHECKLIST.md"
ACTIVE_HEADER = "## Active Tasks (Newest First)\n"
PLAN_UPDATES_HEADER = "## Plan Updates\n"


def current_timestamp() -> str:
    if ZoneInfo is None:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M CET")
    return datetime.now(ZoneInfo("Europe/Madrid")).strftime("%Y-%m-%d %H:%M CET")


def insert_active_row(content: str, row: str) -> str:
    if ACTIVE_HEADER not in content:
        raise SystemExit("Checklist missing Active Tasks header")
    start = content.index(ACTIVE_HEADER) + len(ACTIVE_HEADER)
    remainder = content[start:]
    lines = remainder.splitlines()
    if len(lines) < 2:
        raise SystemExit("Active tasks table malformed")
    new_lines = [lines[0], lines[1], row] + lines[2:]
    return content[:start] + "\n".join(new_lines)


def insert_plan_update(content: str, update: str) -> str:
    if PLAN_UPDATES_HEADER not in content:
        raise SystemExit("Checklist missing Plan Updates header")
    start = content.index(PLAN_UPDATES_HEADER) + len(PLAN_UPDATES_HEADER)
    return content[:start] + f"- {update}\n" + content[start:]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task", required=True, help="Task title")
    parser.add_argument("--source", required=True, help="Source session/reference")
    parser.add_argument("--status", default="Open", help="Task status")
    parser.add_argument("--notes", default="", help="Notes/Evidence cell")
    parser.add_argument("--plan-update", help="Optional plan update bullet to prepend")
    parser.add_argument("--timestamp", help="CET timestamp (defaults to now)")

    args = parser.parse_args()

    if not CHECKLIST_PATH.exists():
        raise SystemExit(f"Checklist not found: {CHECKLIST_PATH}")

    ts = args.timestamp.strip() if args.timestamp else current_timestamp()
    row = f"| {args.task} | {args.source} | {args.status} | {args.notes} |"

    content = CHECKLIST_PATH.read_text()
    updated = insert_active_row(content, row)

    if args.plan_update:
        update_line = f"{ts} - {args.plan_update.strip()}"
        updated = insert_plan_update(updated, update_line)

    CHECKLIST_PATH.write_text(updated)


if __name__ == "__main__":
    main()
