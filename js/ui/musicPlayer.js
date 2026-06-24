import {
  SONGS,
  ICONS
}
from "../utils/constants.js";

import {
  audio,
  musicIcon
}
from "../utils/dom.js";

import {
  setMusicPlaying,
  setLastSong
}
from "../config/actions.js";

import {
  isPlaying,
  lastSong
}
from "../config/selectors.js";

function playRandom() {

  let index;

  do {

    index = Math.floor(
      Math.random() * SONGS.length
    );

  } while (

    SONGS.length > 1 &&
    index === lastSong()

  );

  setLastSong(index);

  audio.pause();
  audio.currentTime = 0;

  audio.src = SONGS[index];

  audio.play()
    .catch(err => {
      console.error(
        "Audio play failed:",
        err
      );
    });

  setMusicPlaying(true);

  musicIcon.src =
    ICONS.pause;
}

export function toggleMusic() {

  if (!isPlaying()) {

    playRandom();

    return;
  }

  audio.pause();

  audio.currentTime = 0;

  audio.src = "";

  setMusicPlaying(false);

  musicIcon.src =
    ICONS.play;
}

audio.addEventListener(
  "ended",
  () => {

    if (isPlaying()) {

      playRandom();
    }
  }
);