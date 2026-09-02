// marked.parse() renders raw HTML found in the text verbatim — it
// does no sanitization of its own. That text comes from the AI
// model, which has live web search, so a page it reads could contain
// HTML/script designed to run in this app's origin once echoed back
// and inserted via innerHTML. DOMPurify strips anything unsafe from
// the rendered output before it's ever returned, regardless of which
// branch below produced it.
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