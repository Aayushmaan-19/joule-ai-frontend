// marked.parse() renders raw HTML found in the text verbatim — it
// does no sanitization of its own. That text comes from the AI
// model, which has live web search, so a page it reads could contain
// HTML/script designed to run in this app's origin once echoed back
// and inserted via innerHTML. DOMPurify strips anything unsafe from
// the rendered output before it's ever returned, regardless of which
// branch below produced it.

// Registers KaTeX math rendering on `marked`, once, if both are
// loaded as globals (see index.html). $...$ is inline math, $$...$$
// is block/display math. Without this, marked's own CommonMark
// escaping rule strips the backslash off \( \) \[ \] delimiters
// (backslash + punctuation is a recognized escape) while leaving
// \sqrt, \pi, \boxed etc. untouched (backslash + letter isn't a
// recognized escape) — that mismatch is exactly what produced the
// broken "(\sqrt{-\pi})" output. nonStandard:true drops the
// requirement that $ be surrounded by whitespace, since chat replies
// won't always have clean spacing around math (e.g. "(the answer is
// $x^2$).").
if (typeof marked !== "undefined" && typeof markedKatex !== "undefined") {
  marked.use(markedKatex({ throwOnError: false, nonStandard: true }));
}

export function renderMarkdown(text) {
  const html =
    typeof marked !== "undefined"
      ? marked.parse(text, { breaks: true, gfm: true })
      : text
          .replace(/### (.*)/g, "<h3>$1</h3>")
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/\n/g, "<br>");

  return typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(html) : html;
}
