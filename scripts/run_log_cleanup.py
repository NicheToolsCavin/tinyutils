import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
ROOT = Path(__file__).resolve().parents[1]
INPUT_FILE = ROOT / "docs" / "AGENT_RUN_LOG.md"
OUTPUT_FILE = ROOT / "docs" / "AGENT_RUN_LOG_OPTIMIZED.md"
KEEP_DETAILED_DAYS = 4  # How many days of full logs to keep

def parse_date(date_str):
    """Attempts to parse date strings from the log headers."""
    # Regex to capture YYYY-MM-DD
    match = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if match:
        return datetime.strptime(match.group(1), "%Y-%m-%d")
    return datetime.min

def parse_log(content):
    entries = []
    # Split by level 3 headers (###)
    raw_entries = re.split(r'(^###\s+.*$)', content, flags=re.MULTILINE)
    
    header_content = raw_entries[0] # Keep the top file header
    
    current_entry = {}
    
    for i in range(1, len(raw_entries), 2):
        title = raw_entries[i].strip()
        body = raw_entries[i+1].strip()
        
        # Extract date for sorting
        date_obj = parse_date(title)
        
        entries.append({
            'title': title,
            'body': body,
            'date': date_obj,
            'full_text': f"{title}\n\n{body}"
        })
        
    # Sort descending (newest first)
    entries.sort(key=lambda x: x['date'], reverse=True)
    return header_content, entries

def compress_body(body):
    """Extracts only the most critical info for older logs."""
    summary = []
    
    # Extract file changes
    files = re.findall(r'[`]([^`\n]+)[`]', body)
    unique_files = list(set([f for f in files if '.' in f and not ' ' in f]))[:5]
    
    # Extract the summary text
    human_summary = re.search(r'Summary:\s*(.*?)(?:\n|$)', body, re.DOTALL)
    if not human_summary:
        human_summary = re.search(r'Human-readable summary\s*(.*?)(?:\n|$)', body, re.DOTALL)
        
    summary_text = "Maintenance / No summary found"
    if human_summary:
        # Get first sentence or first 100 chars
        summary_text = human_summary.group(1).strip().split('.')[0].replace('\n', ' ')
        
    file_str = f" | Files: {', '.join(unique_files)}" if unique_files else ""
    return f"- {summary_text}{file_str}"

def main():
    try:
        content = INPUT_FILE.read_text(encoding='utf-8')
    except FileNotFoundError:
        print(f"Error: Could not find {INPUT_FILE}")
        return

    header, entries = parse_log(content)
    cutoff_date = datetime.now() - timedelta(days=KEEP_DETAILED_DAYS)

    optimized_content = [header.strip()]
    optimized_content.append("\n\n<!-- COMPRESSED HISTORY (Older than 3 days) -->\n")
    
    # Process Archive
    current_day = None
    for entry in entries:
        if entry['date'] < cutoff_date:
            day_str = entry['date'].strftime("%Y-%m-%d")
            if day_str != current_day:
                optimized_content.append(f"\n#### {day_str}")
                current_day = day_str
            
            # Compress
            clean_title = entry['title'].replace('### ', '').split('—')[-1].strip()
            compressed = compress_body(entry['body'])
            optimized_content.append(f"* **{clean_title}**: {compressed.strip('- ')}")

    optimized_content.append("\n\n<!-- RECENT ACTIVITY (Full Context) -->\n")

    # Process Recent
    for entry in entries:
        if entry['date'] >= cutoff_date:
            optimized_content.append(f"\n{entry['full_text']}\n")

    OUTPUT_FILE.write_text("\n".join(optimized_content), encoding='utf-8')

    print(f"Successfully optimized log to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
