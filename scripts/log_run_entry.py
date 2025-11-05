#!/usr/bin/env python3
"""Insert a structured entry into docs/AGENT_RUN_LOG.md."""

import argparse
from datetime import datetime
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
LOG_PATH = ROOT / "docs" / "AGENT_RUN_LOG.md"
SESSIONS_MARKER = "## Sessions\n\n"


def format_timestamp(ts: datetime) -> str:
    if ZoneInfo is None:
        return ts.strftime("%Y-%m-%d %H:%M CET")
    cet = ts.astimezone(ZoneInfo("Europe/Madrid"))
    return cet.strftime("%Y-%m-%d %H:%M CET")


def build_entry(args: argparse.Namespace) -> str:
    heading = f"### {args.timestamp} - {args.title.strip()}"
    lines = [heading]

    if args.session:
        lines.append(f"- **Session:** `{args.session.strip()}`")
    if args.mode:
        lines.append(f"- **Mode:** {args.mode.strip()}")
    if args.branch:
        lines.append(f"- **Branch:** `{args.branch.strip()}`")
    if args.cwd:
        lines.append(f"- **CWD:** {args.cwd.strip()}")

    if args.summary:
        lines.append("- **Summary:**")
        for item in args.summary:
            item = item.strip()
            if item:
                lines.append(f"  - {item}")

    if args.evidence:
        lines.append(f"- **Evidence:** {args.evidence.strip()}")

    followups = args.followup or []
    if followups:
        lines.append("- **Follow-ups:**")
        for item in followups:
            item = item.strip()
            if item and item.upper() != "NONE":
                lines.append(f"  - {item}")
    elif args.followup is not None:
        lines.append("- **Follow-ups:** None")

    lines.append("")
    return "\n".join(lines)


def insert_entry(content: str, entry: str) -> str:
    if SESSIONS_MARKER not in content:
        raise SystemExit("Run log missing '## Sessions' marker")
    idx = content.index(SESSIONS_MARKER) + len(SESSIONS_MARKER)
    return content[:idx] + entry + content[idx:]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--title", required=True, help="Heading after the timestamp (e.g. 'Auto - feat/...')")
    parser.add_argument("--session", help="Session identifier from code CLI logs")
    parser.add_argument("--mode", help="Run mode (auto/manual)")
    parser.add_argument("--branch", help="Git branch")
    parser.add_argument("--cwd", help="Working directory")
    parser.add_argument("--summary", action="append", help="Summary bullet (repeatable)")
    parser.add_argument("--evidence", help="Evidence pointer (artifacts, docs, etc.)")
    parser.add_argument("--followup", action="append", help="Follow-up item (repeatable; use --followup NONE to log 'None')")
    parser.add_argument("--timestamp", help="CET timestamp (YYYY-MM-DD HH:MM CET). Defaults to now.")

    args = parser.parse_args()

    if not LOG_PATH.exists():
        raise SystemExit(f"Run log not found: {LOG_PATH}")

    if args.timestamp:
        ts_str = args.timestamp.strip()
    else:
        now = datetime.now(ZoneInfo("Europe/Madrid") if ZoneInfo else None)
        ts_str = format_timestamp(now)
    args.timestamp = ts_str

    entry = build_entry(args)
    content = LOG_PATH.read_text()
    updated = insert_entry(content, entry + "\n")
    LOG_PATH.write_text(updated)


if __name__ == "__main__":
    main()
