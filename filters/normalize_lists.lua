-- Normalise ordered list numbering for deterministic markdown output and
-- conservatively reconstruct flattened list patterns produced by some
-- roundtrip conversions (e.g. "1. Foo 2. Bar" in a single paragraph).

local function is_order_marker(inline)
  return inline.t == "Str" and inline.text:match("^%d+%.$") ~= nil
end

local function is_bullet_marker(inline)
  return inline.t == "Str" and (inline.text == "-" or inline.text == "*" or inline.text == "•")
end

local function is_ignorable_prefix_inline(inline)
  return inline.t == "Space" or inline.t == "SoftBreak"
end

-- Split a flattened inline list like "1. Foo 2. Bar" into list items while
-- preserving inline formatting inside each item.
local function split_flattened_list(content, marker_indexes, is_bullet)
  local items = {}
  for i, idx in ipairs(marker_indexes) do
    local start_idx = idx + 1
    -- Skip immediate whitespace after marker
    while start_idx <= #content and is_ignorable_prefix_inline(content[start_idx]) do
      start_idx = start_idx + 1
    end
    local end_idx
    if i < #marker_indexes then
      end_idx = marker_indexes[i + 1] - 1
    else
      end_idx = #content
    end
    if start_idx <= end_idx then
      local inlines = {}
      for j = start_idx, end_idx do
        table.insert(inlines, content[j])
      end
      table.insert(items, pandoc.Para(inlines))
    end
  end
  if #items == 0 then
    return nil
  end
  if is_bullet then
    return { pandoc.BulletList(items) }
  else
    return { pandoc.OrderedList(items) }
  end
end

function Para(el)
  local content = el.content
  if not content or #content == 0 then
    return el
  end

  -- Collect ordered markers (e.g. "1.", "2.")
  local ordered_idxs = {}
  for i, inline in ipairs(content) do
    if is_order_marker(inline) then
      table.insert(ordered_idxs, i)
    end
  end

  -- Collect bullet markers ("-", "*", "•") if no ordered markers are found
  local bullet_idxs = {}
  if #ordered_idxs == 0 then
    for i, inline in ipairs(content) do
      if is_bullet_marker(inline) then
        table.insert(bullet_idxs, i)
      end
    end
  end

  -- Only rewrite when we see at least two markers (to avoid false positives
  -- on lone "1." or "-" that are not really lists).
  if #ordered_idxs >= 2 then
    local blocks = split_flattened_list(content, ordered_idxs, false)
    if blocks then
      return blocks
    end
  elseif #bullet_idxs >= 2 then
    local blocks = split_flattened_list(content, bullet_idxs, true)
    if blocks then
      return blocks
    end
  end

  return el
end

function OrderedList(el)
  el.start = 1
  el.style = "Decimal"
  return el
end
