import { sleep }
from "../utils/helpers.js";

export async function typeText(
  element,
  text
) {

  element.innerHTML = "";

  for (const char of text) {

    element.innerHTML += char;

    await sleep(18);
  }
}