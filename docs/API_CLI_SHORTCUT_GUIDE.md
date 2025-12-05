# TinyUtils Convert API - CLI & Shortcut Guide

The Convert API supports **direct file input** via base64 data URLs, making it accessible from shell scripts, fish functions, and iOS Shortcuts without needing blob storage authentication.

## Authentication

**Web UI:** No authentication required (same-origin requests are allowed)

**CLI/Scripts/Shortcuts:** Requires API key via `X-API-Key` header

### Getting Your API Key

Contact the TinyUtils admin to get an API key, then set it in your environment:

```bash
# Fish shell (~/.config/fish/config.fish)
set -gx TINYUTILS_API_KEY "your-api-key-here"

# Bash/Zsh (~/.bashrc or ~/.zshrc)
export TINYUTILS_API_KEY="your-api-key-here"
```

## API Endpoint

```
POST https://www.tinyutils.net/api/convert
Content-Type: application/json
X-API-Key: your-api-key-here
```

## Two Input Methods

### Method 1: Direct Text (for Markdown/Plain Text)

```json
{
  "inputs": [{"text": "# Hello World\n\nThis is **bold**.", "name": "doc.md"}],
  "to": ["pdf"]
}
```

### Method 2: Base64 Data URL (for any file)

```json
{
  "inputs": [{
    "blobUrl": "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQAAAA...",
    "name": "document.docx"
  }],
  "to": ["md", "html"]
}
```

## Supported Formats

| Format | MIME Type | Extension |
|--------|-----------|-----------|
| Word | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | .docx |
| OpenDocument | `application/vnd.oasis.opendocument.text` | .odt |
| Rich Text | `application/rtf` | .rtf |
| Markdown | `text/markdown` | .md |
| HTML | `text/html` | .html |
| PDF | `application/pdf` | .pdf |
| Plain Text | `text/plain` | .txt |
| ePub | `application/epub+zip` | .epub |

## Response Format

```json
{
  "ok": true,
  "outputs": [{
    "name": "document.md",
    "size": 1234,
    "blobUrl": "data:text/markdown;base64,IyBIZWxsbw==",
    "target": "md"
  }],
  "logs": [],
  "errors": []
}
```

---

## Fish Shell Function

Save to `~/.config/fish/functions/tinyconvert.fish`:

```fish
source /path/to/tinyutils/scripts/tinyconvert.fish
```

### Usage

```bash
# Convert DOCX to Markdown
tinyconvert document.docx md

# Convert Markdown to PDF
tinyconvert notes.md pdf

# Pipe markdown to PDF
echo "# Quick Note" | tinyconvert - pdf
```

---

## iPad/iPhone Shortcut

### Create the Shortcut

1. **Open Shortcuts app** → + New Shortcut

2. **Add action: "Get File"**
   - From: Files app (or specify location)
   - This prompts user to select a document

3. **Add action: "Base64 Encode"**
   - Input: File from previous step
   - This converts the file to base64 text

4. **Add action: "Text"**
   - Create the JSON payload:
   ```
   {
     "inputs": [{
       "blobUrl": "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,[Base64 Encoded]",
       "name": "[Name of File]"
     }],
     "to": ["md"]
   }
   ```
   - Replace `[Base64 Encoded]` with the magic variable from step 3
   - Replace `[Name of File]` with the file name variable

5. **Add action: "Get Contents of URL"**
   - URL: `https://www.tinyutils.net/api/convert`
   - Method: POST
   - Headers:
     - `Content-Type: application/json`
     - `X-API-Key: your-api-key-here` (store in a Text variable for security)
   - Request Body: JSON (the text from step 4)

6. **Add action: "Get Dictionary Value"**
   - Key: `outputs`
   - Then get first item, then get `blobUrl`

7. **Add action: "If"**
   - Condition: Contains `data:`
   - If true: Decode base64 and save
   - If false: Download URL and save

8. **Add action: "Save File"**
   - Save the decoded/downloaded content

### Simplified Markdown-to-PDF Shortcut

For quick markdown notes → PDF:

1. **Ask for Input** (Text)
2. **Text** block:
   ```json
   {"inputs": [{"text": "[Asked Text]", "name": "note.md"}], "to": ["pdf"]}
   ```
3. **Get Contents of URL** → POST to API
4. **Get Dictionary Value** → `outputs.0.blobUrl`
5. **Base64 Decode** (if data URL)
6. **Save to Files**

### Shortcut Tips

- Use **"Choose from Menu"** to let user pick output format (md, pdf, html)
- Add **"Quick Look"** before saving to preview
- Use **"Share Sheet"** as input to convert files from any app
- Store the API URL in a **Text** variable for easy updates

---

## cURL Examples

### Convert DOCX to Markdown

```bash
# Encode file and convert
BASE64=$(base64 -i document.docx)
curl -X POST https://www.tinyutils.net/api/convert \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TINYUTILS_API_KEY" \
  -d "{
    \"inputs\": [{
      \"blobUrl\": \"data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,$BASE64\",
      \"name\": \"document.docx\"
    }],
    \"to\": [\"md\"]
  }"
```

### Convert Markdown Text to PDF

```bash
curl -X POST https://www.tinyutils.net/api/convert \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TINYUTILS_API_KEY" \
  -d '{
    "inputs": [{"text": "# Hello\n\nThis is a test.", "name": "test.md"}],
    "to": ["pdf"]
  }'
```

### With jq (extract and decode output)

```bash
response=$(curl -s -X POST https://www.tinyutils.net/api/convert \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TINYUTILS_API_KEY" \
  -d '{"inputs": [{"text": "# Test", "name": "t.md"}], "to": ["pdf"]}')

# Get blob URL
blob_url=$(echo "$response" | jq -r '.outputs[0].blobUrl')

# Decode if data URL
if [[ "$blob_url" == data:* ]]; then
  echo "$blob_url" | sed 's/data:[^;]*;base64,//' | base64 -d > output.pdf
else
  curl -sL "$blob_url" -o output.pdf
fi
```

---

## Options

```json
{
  "inputs": [...],
  "to": ["md"],
  "from": "docx",  // Optional: force input format
  "options": {
    "acceptTrackedChanges": true,   // Accept Word track changes
    "extractMedia": false,          // Extract images to ZIP
    "removeZeroWidth": true,        // Clean zero-width chars
    "normalizeLists": false,        // Normalize list formatting
    "asciiPunctuation": false,      // Convert smart quotes to ASCII
    "mdDialect": "gfm"              // gfm, commonmark, markdown_strict
  }
}
```

---

## Error Handling

```json
{
  "ok": false,
  "detail": "Error message here"
}
```

Always check `ok === true` before processing outputs.

---

## Limits

- Max file size: ~10MB (base64 increases size ~33%)
- Timeout: 60 seconds
- Supported conversions: 100+ format combinations via Pandoc
