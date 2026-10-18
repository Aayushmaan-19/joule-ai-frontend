/**
 * Prompt chips on the empty-chat screen. A chip only seeds the input and
 * focuses it, so the person finishes the thought; nothing is sent for them.
 */
const hero = document.getElementById("idleHero");
const input = document.getElementById("input");

hero?.addEventListener("click", e => {
  const chip = e.target.closest(".idle-chip");
  if (!chip) return;

  input.value = chip.dataset.prompt;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
