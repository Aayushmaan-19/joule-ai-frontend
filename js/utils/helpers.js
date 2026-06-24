export function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

export function cleanAIText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function fixPronunciation(text) {

  const fixes = {
    ai: "A I",
    api: "A P I",
    html: "H T M L",
    css: "C S S",
    javascript: "Java Script",
  };

  for (const word in fixes) {

    text = text.replace(
      new RegExp(word, "gi"),
      fixes[word]
    );
  }

  return text;
}