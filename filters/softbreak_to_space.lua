-- Replace Pandoc SoftBreak elements with spaces to avoid hard-wrapped markdown.

function SoftBreak()
  return pandoc.Space()
end
