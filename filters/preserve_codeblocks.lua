-- Preserve fenced code blocks and language tags through Pandoc passes.
--
-- This filter is intentionally conservative: it only upgrades patterns that
-- clearly look like fenced blocks that have been flattened into paragraphs,
-- and it leaves existing CodeBlock nodes untouched.

local fence_pattern = "^%s*```([%w_-]*)%s*$"

-- Helper: trim leading/trailing whitespace
local function trim(s)
  return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

-- If a paragraph consists of a single Str element that looks like an inline
-- fenced block (e.g. "```js code ... ```"), promote it to a CodeBlock. This
-- helps roundtrip cases where DOCX/HTML paths have collapsed a fenced block
-- into a single line of text.
function Para(el)
  if #el.content ~= 1 then
    return el
  end
  local first = el.content[1]
  if first.t ~= "Str" then
    return el
  end

  local text = trim(first.text or "")
  -- Look for inline fenced patterns: ```lang ... ```
  if not text:match("```") then
    return el
  end

  -- Extract language (first word after opening fence) and body.
  local start_fence, rest = text:match("^```([%w_-]*)%s*(.*)")
  if not start_fence then
    return el
  end
  local body, closing = rest:match("^(.*)```%s*$")
  if not body or not closing then
    return el
  end

  local classes = {}
  if start_fence ~= "" then
    table.insert(classes, start_fence)
  end

  return pandoc.CodeBlock(body, {class = classes[1]})
end

function CodeBlock(el)
  -- Always emit fenced blocks so roundtrips keep a stable representation,
  -- regardless of how the writer would normally render CodeBlock nodes.
  local info = ""
  if el.classes and #el.classes > 0 then
    info = el.classes[1]
  end
  local fence = "```" .. info
  local fenced = fence .. "\n" .. el.text .. "\n```\n"
  return pandoc.RawBlock("markdown", fenced)
end
