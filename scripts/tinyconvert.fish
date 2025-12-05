# TinyUtils Convert - Fish shell function
# Usage: tinyconvert input.docx md      # Convert DOCX to Markdown
#        tinyconvert input.md pdf       # Convert Markdown to PDF
#        tinyconvert input.docx html    # Convert DOCX to HTML
#        cat file.md | tinyconvert - pdf  # Pipe markdown to PDF
#
# Setup: Set your API key in ~/.config/fish/config.fish:
#        set -gx TINYUTILS_API_KEY "your-api-key-here"

function tinyconvert --description "Convert documents via TinyUtils API"
    set -l TINYUTILS_API "https://www.tinyutils.net/api/convert"

    # Check for API key
    if not set -q TINYUTILS_API_KEY; or test -z "$TINYUTILS_API_KEY"
        echo "Error: TINYUTILS_API_KEY not set" >&2
        echo "Add to ~/.config/fish/config.fish:" >&2
        echo '  set -gx TINYUTILS_API_KEY "your-api-key"' >&2
        return 1
    end

    # Parse arguments
    if test (count $argv) -lt 2
        echo "Usage: tinyconvert <input-file> <output-format> [options]"
        echo "       tinyconvert - <output-format>  # Read from stdin (markdown)"
        echo ""
        echo "Formats: md, pdf, html, docx, odt, rtf, txt, epub, latex"
        echo ""
        echo "Examples:"
        echo "  tinyconvert document.docx md"
        echo "  tinyconvert notes.md pdf"
        echo "  echo '# Hello' | tinyconvert - pdf"
        return 1
    end

    set -l input_file $argv[1]
    set -l output_format $argv[2]

    # Handle stdin input (for piping markdown)
    if test "$input_file" = "-"
        set -l text_content (cat)
        set -l payload (jq -n \
            --arg text "$text_content" \
            --arg fmt "$output_format" \
            '{inputs: [{text: $text, name: "input.md"}], to: [$fmt]}')

        set -l response (echo $payload | curl -s -X POST "$TINYUTILS_API" \
            -H "Content-Type: application/json" \
            -H "X-API-Key: $TINYUTILS_API_KEY" \
            -d @-)

        # Extract blob URL and download
        set -l blob_url (echo $response | jq -r '.outputs[0].blobUrl // empty')
        if test -n "$blob_url"
            if string match -q "data:*" "$blob_url"
                # Data URL - decode base64
                echo $blob_url | sed 's/data:[^;]*;base64,//' | base64 -d
            else
                # HTTP URL - download
                curl -sL "$blob_url"
            end
        else
            echo "Error: $(echo $response | jq -r '.detail // .error // "Unknown error"')" >&2
            return 1
        end
        return 0
    end

    # Check file exists
    if not test -f "$input_file"
        echo "Error: File not found: $input_file" >&2
        return 1
    end

    # Determine MIME type from extension
    set -l ext (string lower (path extension $input_file))
    switch $ext
        case .docx
            set mime "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        case .doc
            set mime "application/msword"
        case .odt
            set mime "application/vnd.oasis.opendocument.text"
        case .rtf
            set mime "application/rtf"
        case .pdf
            set mime "application/pdf"
        case .md .markdown
            set mime "text/markdown"
        case .txt
            set mime "text/plain"
        case .html .htm
            set mime "text/html"
        case .epub
            set mime "application/epub+zip"
        case '*'
            set mime "application/octet-stream"
    end

    # Encode file as base64 data URL
    set -l base64_content (base64 -i "$input_file")
    set -l data_url "data:$mime;base64,$base64_content"
    set -l filename (path basename $input_file)

    # Build JSON payload
    set -l payload (jq -n \
        --arg url "$data_url" \
        --arg name "$filename" \
        --arg fmt "$output_format" \
        '{inputs: [{blobUrl: $url, name: $name}], to: [$fmt]}')

    # Make API request
    set -l response (echo $payload | curl -s -X POST "$TINYUTILS_API" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $TINYUTILS_API_KEY" \
        -d @-)

    # Check for errors
    set -l ok (echo $response | jq -r '.ok // false')
    if test "$ok" != "true"
        echo "Error: $(echo $response | jq -r '.detail // .error // "Unknown error"')" >&2
        return 1
    end

    # Extract output blob URL
    set -l blob_url (echo $response | jq -r '.outputs[0].blobUrl // empty')
    set -l output_name (echo $response | jq -r '.outputs[0].name // empty')

    if test -z "$blob_url"
        echo "Error: No output generated" >&2
        return 1
    end

    # Download or decode output
    if string match -q "data:*" "$blob_url"
        # Data URL - decode base64 and save
        echo $blob_url | sed 's/data:[^;]*;base64,//' | base64 -d > "$output_name"
    else
        # HTTP URL - download
        curl -sL "$blob_url" -o "$output_name"
    end

    echo "Created: $output_name"
end
