-- Normalise ordered list numbering for deterministic markdown output.

function OrderedList(el)
  el.start = 1
  el.style = "Decimal"
  return el
end
