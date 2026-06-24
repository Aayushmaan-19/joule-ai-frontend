export function renderMarkdown(text) {

  if (typeof marked !== "undefined") {

    return marked.parse(text, {
      breaks: true,
      gfm: true,
    });
  }

  return text
    .replace(/### (.*)/g, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");
}