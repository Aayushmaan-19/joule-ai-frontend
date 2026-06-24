let currentMode =
  "normal";

function activateShinigamiProtocol() {

  currentMode =
    "shinigami";

  document.body.classList.add(
    "shinigami"
  );

  console.log(
    "MODE:",
    currentMode
  );
}

function disableShinigami() {

  currentMode =
    "normal";

  document.body.classList.remove(
    "shinigami"
  );

  console.log(
    "MODE:",
    currentMode
  );
}

let secretSequence = [];

const secretCode = [

  "arrowup",
  "arrowup",

  "arrowdown",
  "arrowdown",

  "arrowleft",
  "arrowright",

  "arrowleft",
  "arrowright",

  "a",
  "a"

];

document.addEventListener(
  "keydown",
  e => {

    if (!e.key) return;

    const key =
      e.key.toLowerCase();

    secretSequence.push(
      key
    );

    if (
      secretSequence.length >
      secretCode.length
    ) {

      secretSequence.shift();
    }

    const matched =

      secretSequence.join(",") ===
      secretCode.join(",");

    if (matched) {

      if (
        currentMode ===
        "shinigami"
      ) {

        disableShinigami();

      } else {

        activateShinigamiProtocol();
      }

      secretSequence = [];
    }
  }
);