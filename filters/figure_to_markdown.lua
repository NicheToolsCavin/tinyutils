--[[
  figure_to_markdown.lua

  Convert HTML5 semantic elements to Markdown equivalents:
  - <figure> with <img> + <figcaption> → ![alt](url) + caption in italics
  - <figcaption> → italicized text when standalone
  - <aside> → blockquote

  This prevents raw HTML passthrough in HTML→Markdown conversions.
]]

function Figure(el)
  -- A Figure in Pandoc's AST has:
  --   el.content = the figure content (typically an image)
  --   el.caption = structured caption data

  -- Build result blocks
  local result = {}

  -- Add the main content (images, paragraphs, etc.)
  for _, block in ipairs(el.content) do
    table.insert(result, block)
  end

  -- Add caption as italicized paragraph if present
  if el.caption and el.caption.long and #el.caption.long > 0 then
    local caption_inlines = {}

    -- Flatten all caption blocks into inline elements
    for _, block in ipairs(el.caption.long) do
      if block.content then
        for _, inline in ipairs(block.content) do
          table.insert(caption_inlines, inline)
        end
      end
    end

    -- Wrap in emphasis (italics)
    if #caption_inlines > 0 then
      local caption_para = pandoc.Para({pandoc.Emph(caption_inlines)})
      table.insert(result, caption_para)
    end
  end

  return result
end

-- Handle raw HTML figure elements that Pandoc didn't parse
function RawBlock(el)
  if el.format == 'html' then
    local text = el.text

    -- Check if this is a figure tag
    if text:match('^%s*<figure') then
      -- Try to extract image and caption
      local img_src = text:match('src="([^"]+)"')
      local img_alt = text:match('alt="([^"]*)"') or ''
      local caption = text:match('<figcaption[^>]*>(.+)</figcaption>')

      if img_src then
        local result = {}

        -- Add image as markdown
        local img = pandoc.Para({pandoc.Image({pandoc.Str(img_alt)}, img_src, '')})
        table.insert(result, img)

        -- Add caption as italicized paragraph
        if caption then
          -- Strip HTML tags from caption
          local caption_text = caption:gsub('<[^>]+>', '')
          local caption_para = pandoc.Para({pandoc.Emph({pandoc.Str(caption_text)})})
          table.insert(result, caption_para)
        end

        return result
      end
    end

    -- Check if this is an aside tag (convert to blockquote)
    if text:match('^%s*<aside') then
      local content = text:match('<aside[^>]*>(.+)</aside>')
      if content then
        -- Strip HTML and create blockquote
        local clean_text = content:gsub('<[^>]+>', '')
        return pandoc.BlockQuote({pandoc.Para({pandoc.Str(clean_text)})})
      end
    end
  end

  return el
end

-- Handle inline raw HTML elements
function RawInline(el)
  if el.format == 'html' then
    -- Convert <mark> to highlighted text (backticks as approximation)
    if el.text:match('<mark>') then
      local content = el.text:match('<mark>(.+)</mark>')
      if content then
        return pandoc.Code(content)
      end
    end
  end

  return el
end

return {
  { Figure = Figure },
  { RawBlock = RawBlock },
  { RawInline = RawInline }
}
