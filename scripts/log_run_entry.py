#!/usr/bin/env python3
"""
Insert a structured entry into docs/AGENT_RUN_LOG.md.
Also performs auto-maintenance: sorts entries and compresses logs older than 3 days.
"""

import argparse
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Tuple, Dict

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
LOG_PATH = ROOT / "docs" / "AGENT_RUN_LOG.md"
SESSIONS_MARKER = "## Sessions"
KEEP_DETAILED_DAYS = 3


class LogEntry:
    def __init__(self, timestamp: datetime, title: str, full_text: str, is_compressed: bool = False):
        self.timestamp = timestamp
        self.title = title.strip()
        self.full_text = full_text
        self.is_compressed = is_compressed

    def to_markdown(self) -> str:
        """Return the full markdown representation."""
        if self.is_compressed:
            # If it's already compressed, return it as is (stripping the bullet for re-formatting later)
            return self.full_text
        
        # Ensure standard header format
        ts_str = self.timestamp.strftime("%Y-%m-%d %H:%M CET")
        header = f"### {ts_str} - {self.title}"
        if not self.full_text.strip().startswith("###"):
            return f"{header}\n{self.full_text}"
        return self.full_text

    def to_compressed(self) -> str:
        """Return a one-line summary."""
        if self.is_compressed:
            return self.full_text.strip()

        # Extract summary info from full text
        summary_text = "Maintenance / No summary found"
        
        # Try to find the Summary bullet block
        summary_match = re.search(r'- \*\*Summary:\*\*\s*(.*?)(?=- \*\*|$)', self.full_text, re.DOTALL)
        if summary_match:
            raw_summary = summary_match.group(1).strip()
            # Extract individual bullets if present
            bullets = re.findall(r'^\s*-\s+(.*)$', raw_summary, re.MULTILINE)
            if bullets:
                summary_text = "; ".join(bullets)
            else:
                summary_text = raw_summary.replace('\n', ' ')
        else:
            # Fallback for manual or legacy formats
            human_match = re.search(r'Human-readable summary\s*(.*?)(?:\n|$)', self.full_text, re.DOTALL)
            if human_match:
                summary_text = human_match.group(1).strip()

        # Clean up formatting
        summary_text = summary_text.replace('`', '').strip()
        if len(summary_text) > 150:
            summary_text = summary_text[:147] + "..."

        return f"* **{self.title}**: {summary_text}"


def get_current_time(ts_str: Optional[str] = None) -> datetime:
    if ts_str:
        try:
            # Attempt flexible parsing
            clean_ts = re.sub(r' CET$', '', ts_str).strip()
            return datetime.strptime(clean_ts, "%Y-%m-%d %H:%M")
        except ValueError:
            pass
    
    # Default to now
    if ZoneInfo:
        return datetime.now(ZoneInfo("Europe/Madrid")).replace(tzinfo=None) # naive for comparison
    return datetime.now()


def parse_existing_log(content: str) -> Tuple[str, List[LogEntry]]:
    """Splits the log into the Top Header and a list of LogEntry objects."""
    if SESSIONS_MARKER not in content:
        return content, []

    parts = content.split(SESSIONS_MARKER)
    header_content = parts[0] + SESSIONS_MARKER + "\n\n"
    body_content = parts[1]

    entries = []

    # 1. Parse Full Entries (### YYYY-MM-DD...)
    # We look for lines starting with ### followed by a date pattern
    raw_full_entries = re.split(r'(^### \d{4}-\d{2}-\d{2}.*?$)', body_content, flags=re.MULTILINE)
    
    # The first element is usually garbage or section headers, skip unless it contains data
    start_idx = 1 if len(raw_full_entries) > 1 else 0
    
    for i in range(start_idx, len(raw_full_entries), 2):
        if i + 1 >= len(raw_full_entries): break
        
        title_line = raw_full_entries[i].strip()
        body_text = raw_full_entries[i+1].rstrip()
        
        # Parse timestamp from title: "### 2025-11-25 00:38 CET - Title"
        ts_match = re.search(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2})', title_line)
        if ts_match:
            dt = datetime.strptime(ts_match.group(1), "%Y-%m-%d %H:%M")
            clean_title = re.sub(r'###.*?CET\s+-\s+', '', title_line).strip()
            entries.append(LogEntry(dt, clean_title, f"{title_line}\n{body_text}", is_compressed=False))

    # 2. Parse Existing Compressed Entries (* **Title**: Summary)
    # We look for lines that match the specific bullet format used by compression
    compressed_lines = re.findall(r'^(\* \*\*.*?:.*?)$', body_content, re.MULTILINE)
    
    # We need to infer dates for these. This is tricky.
    # We'll search for the "#### YYYY-MM-DD" headers to map them.
    # Current strategy: Split by #### header, then grab lines.
    
    day_blocks = re.split(r'(^#### \d{4}-\d{2}-\d{2}$)', body_content, flags=re.MULTILINE)
    current_day_dt = datetime.min

    for block in day_blocks:
        block = block.strip()
        if not block: continue

        # Check if block is a date header
        date_match = re.match(r'^#### (\d{4}-\d{2}-\d{2})$', block)
        if date_match:
            current_day_dt = datetime.strptime(date_match.group(1), "%Y-%m-%d")
            continue
        
        # Process lines within the block
        lines = block.split('\n')
        for line in lines:
            line = line.strip()
            # Match: * **Title**: Summary
            item_match = re.match(r'\* \*\*(.*?)\*\*:\s*(.*)', line)
            if item_match and current_day_dt != datetime.min:
                entries.append(LogEntry(
                    timestamp=current_day_dt, # We lose exact HH:MM for archives, that's fine
                    title=item_match.group(1),
                    full_text=line,
                    is_compressed=True
                ))

    return header_content, entries


def build_new_entry_obj(args: argparse.Namespace) -> LogEntry:
    """Creates a LogEntry object from CLI arguments."""
    now_dt = get_current_time(args.timestamp)
    
    # Format the timestamp string for the header
    ts_str = now_dt.strftime("%Y-%m-%d %H:%M CET")
    heading = f"### {ts_str} - {args.title.strip()}"
    
    lines = []
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

    full_text = heading + "\n" + "\n".join(lines) + "\n"
    
    return LogEntry(now_dt, args.title, full_text, is_compressed=False)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--title", required=True, help="Heading after timestamp")
    parser.add_argument("--session", help="Session identifier")
    parser.add_argument("--mode", help="Run mode (auto/manual)")
    parser.add_argument("--branch", help="Git branch")
    parser.add_argument("--cwd", help="Working directory")
    parser.add_argument("--summary", action="append", help="Summary bullet")
    parser.add_argument("--evidence", help="Evidence pointer")
    parser.add_argument("--followup", action="append", help="Follow-up item")
    parser.add_argument("--timestamp", help="CET timestamp (YYYY-MM-DD HH:MM CET)")

    args = parser.parse_args()

    if not LOG_PATH.exists():
        raise SystemExit(f"Run log not found: {LOG_PATH}")

    # 1. Parse Existing
    content = LOG_PATH.read_text(encoding='utf-8')
    header_content, entries = parse_existing_log(content)

    # 2. Add New
    new_entry = build_new_entry_obj(args)
    entries.append(new_entry)

    # 3. Sort (Descending)
    # Primary sort: Timestamp. Secondary: Is full text? (Prefer full text on top of same minute)
    entries.sort(key=lambda x: x.timestamp, reverse=True)

    # 4. Render
    final_output = [header_content.rstrip()]
    
    cutoff_date = get_current_time() - timedelta(days=KEEP_DETAILED_DAYS)
    
    # Split into Recent vs Archived
    recent_entries = [e for e in entries if e.timestamp >= cutoff_date]
    archived_entries = [e for e in entries if e.timestamp < cutoff_date]

    # Render Recent
    if recent_entries:
        final_output.append("\n<!-- RECENT ACTIVITY (Full Context) -->\n")
        for e in recent_entries:
            # Force full text if it was previously compressed but is now considered "Recent" 
            # (Edge case: changing cutoff days, but usually won't uncompress text magically)
            final_output.append(e.to_markdown())

    # Render Archive
    if archived_entries:
        final_output.append("\n<!-- COMPRESSED HISTORY (Older than 3 days) -->\n")
        current_day = None
        for e in archived_entries:
            day_str = e.timestamp.strftime("%Y-%m-%d")
            if day_str != current_day:
                final_output.append(f"\n#### {day_str}")
                current_day = day_str
            final_output.append(e.to_compressed())

    # 5. Write
    LOG_PATH.write_text("\n".join(final_output) + "\n", encoding='utf-8')
    print(f"Log updated: {LOG_PATH}")


if __name__ == "__main__":
    main()
