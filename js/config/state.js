const state = {

  ui: {

    darkMode: false,

    currentMode: "normal",

    isUserScrollingUp: false

  },

  music: {

    isPlaying: false,

    lastSongIndex: -1

  },

  voice: {

    isListening: false

  },

  tools: {

    imageGenerationEnabled: false

  },

  backend: {

    isAwake: false

  },

  auth: {

    user: null,

    token: null,

    profile: null

  },

  chat: {

    messages: [],

    currentConversationId: null,

    isPrivate: false

  }

};

export default state;