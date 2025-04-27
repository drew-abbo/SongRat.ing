function makeDynamicElementsVisible() {
  document.getElementById("loading-msg").remove();
  document.querySelectorAll(".dynamic-content").forEach((element) => {
    element.style.visibility = "visible";
  });
}

function displayErrorScreen(msg) {
  document.getElementById("loading-msg").remove();

  const headerElement = document.getElementById("header");
  const errorMessageElement = document.getElementById("error-message");

  document.querySelectorAll(".dynamic-content").forEach((element) => {
    if (element !== headerElement && element !== errorMessageElement) {
      element.remove();
    }
  });

  headerElement.style.visibility = "visible";

  errorMessageElement.innerText = msg;
  errorMessageElement.style.visibility = "visible";
}

const inviteCode = new URLSearchParams(window.location.search).get(
  "invite_code"
);
const playerCode = new URLSearchParams(window.location.search).get(
  "player_code"
);

// class for modifying a list of songs
class Songs {
  /**
   * @param onChangeFunc A function that is called any time there's any
   * modification to a row. The function is passed the event and `this`
   * (the source `Songs` object).
   * @param onBlurFunc A function that is called any time a row is fully
   * unfocused. The function is passed the event and `this` (the source
   * `Songs` object).
   */
  constructor(onChangeFunc = () => {}, onBlurFunc = () => {}) {
    this._rootElement = document.getElementById("songs");
    this._rows = [];
    this._onChangeFunc = onChangeFunc;
    this._onBlurFunc = onBlurFunc;
  }

  _ensureRowIndexValid(rowIndex) {
    if (rowIndex < 0 || rowIndex >= this._rows.length) {
      throw new Error(
        `Can't remove row ${rowIndex} (${this._rows.length} rows)`
      );
    }
  }

  rowCount() {
    return this._rows.length;
  }

  addRow() {
    const newRow = {
      hr: null,
      songDiv: null,
      songNameInput: null,
      artistInput: null,
    };

    if (this._rows.length) {
      newRow.hr = newElement("hr");
    }

    newRow.songDiv = newElement("div", ["song"]);

    newRow.songNameInput = newElement("input", ["song-name-input"], {
      type: "text",
      placeholder: "Song Name",
      maxlength: 255,
    });

    newRow.artistInput = newElement("input", ["song-artist-input"], {
      type: "text",
      placeholder: "Artist(s)",
      maxlength: 255,
    });

    this._rows.push(newRow);

    if (newRow.hr) {
      this._rootElement.appendChild(newRow.hr);
    }
    newRow.songDiv.appendChild(newRow.songNameInput);
    newRow.songDiv.appendChild(newRow.artistInput);
    this._rootElement.appendChild(newRow.songDiv);

    // the enter key goes to the next input field
    newRow.songNameInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      newRow.artistInput.focus();
    });
    newRow.artistInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      this._rows[
        this.rowIndexFromInputElement(newRow.artistInput) + 1
      ]?.songNameInput.focus();
    });

    // user defined onChangeFunc is called on change
    const onChangeFunc = (event) => {
      this._onChangeFunc(event, this);
    };
    newRow.songNameInput.addEventListener("input", onChangeFunc);
    newRow.artistInput.addEventListener("input", onChangeFunc);

    // user defined onBlurFunc is called when an input blurs and the other
    // isn't focused
    newRow.songNameInput.addEventListener("blur", (event) => {
      if (event.relatedTarget !== newRow.artistInput) {
        this._onBlurFunc(event, this);
      }
    });
    newRow.artistInput.addEventListener("blur", (event) => {
      if (event.relatedTarget !== newRow.songNameInput) {
        this._onBlurFunc(event, this);
      }
    });
  }

  removeRow(rowIndex) {
    this._ensureRowIndexValid(rowIndex);

    const row = this._rows.splice(rowIndex, 1)[0];

    // when removing the 1st row, remove the next row's hr
    if (rowIndex === 0 && this._rows.length > 0) {
      this._rows[0].hr.remove();
    }

    row.hr?.remove();
    row.songDiv.remove();
  }

  rowIsEmpty(rowIndex) {
    this._ensureRowIndexValid(rowIndex);
    const row = this._rows[rowIndex];
    return !(row.songNameInput.value.trim() || row.artistInput.value.trim());
  }

  rowIsFull(rowIndex) {
    this._ensureRowIndexValid(rowIndex);
    const row = this._rows[rowIndex];
    return !!(row.songNameInput.value.trim() && row.artistInput.value.trim());
  }

  emptyRowCount() {
    let ret = 0;
    for (let i = 0; i < this._rows.length; i++) {
      const row = this._rows[i];
      if (!(row.songNameInput.value.trim() || row.artistInput.value.trim())) {
        ret++;
      }
    }
    return ret;
  }

  fullRowCount() {
    let ret = 0;
    for (let i = 0; i < this._rows.length; i++) {
      const row = this._rows[i];
      if (row.songNameInput.value.trim() && row.artistInput.value.trim()) {
        ret++;
      }
    }
    return ret;
  }

  rowName(rowIndex) {
    this._ensureRowIndexValid(rowIndex);
    return this._rows[rowIndex].songNameInput.value;
  }

  rowArtist(rowIndex) {
    this._ensureRowIndexValid(rowIndex);
    return this._rows[rowIndex].artistInput.value;
  }

  rowIndexFromInputElement(rowInputElement) {
    for (let i = 0; i < this._rows.length; i++) {
      if (
        rowInputElement === this._rows[i].songNameInput ||
        rowInputElement === this._rows[i].artistInput
      ) {
        return i;
      }
    }
    return -1;
  }
}

let gameData;

const songs = new Songs(
  // if we're typing in the last row, add a new row, unless we clear out
  // the 2nd to last row, then we should be the last row
  (event, songs) => {
    const rowIndex = songs.rowIndexFromInputElement(event.target);
    if (rowIndex + 1 === songs.rowCount() && !songs.rowIsEmpty(rowIndex)) {
      songs.addRow();
    } else if (
      rowIndex + 2 === songs.rowCount() &&
      songs.rowIsEmpty(rowIndex)
    ) {
      songs.removeRow(rowIndex + 1);
    }
  },

  // if we leave focus of a row and the row is empty (and not the last
  // row) we should remove the row (also update the song counter)
  (event, songs) => {
    const rowIndex = songs.rowIndexFromInputElement(event.target);
    if (rowIndex + 1 !== songs.rowCount() && songs.rowIsEmpty(rowIndex)) {
      songs.removeRow(rowIndex);
    }

    const songCounterElement = document.getElementById("song-counter");
    const numSongs = songs.rowCount() - 1;

    if (numSongs === 0) {
      songCounterElement.innerText = "";
      return;
    }

    const minSongs = gameData.min_songs_per_playlist;
    const maxSongs = gameData.max_songs_per_playlist;

    songCounterElement.innerText =
      `${numSongs} / ${minSongs}` +
      (minSongs === maxSongs ? "" : `-${maxSongs}`);
  }
);

// start with 1 empty row
songs.addRow();

function fillExistingPlayerData(gameData) {
  // Given as `gameData`:
  // {
  //   game_name: string
  //   game_description: string
  //   min_songs_per_playlist: numuber
  //   max_songs_per_playlist: number
  //   require_playlist_link: boolean
  // }
  //
  // TODO:
  // - Get player data from server.
  // - Fill in player name.
  // - Fill in player playlist link (possibly returned from server as `null`).
  // - Fill in songs (using `songs` API).
  // - Throw an error if something goes wrong.
}

// generate the dynamic content from the invite_code parameter in the url
(() => {
  // ensure we have either an invite or player code
  if (!inviteCode && !playerCode) {
    displayErrorScreen("No invite or player code provided.");
    return;
  }
  if (inviteCode && playerCode) {
    displayErrorScreen("An invite and player code were both provided.");
    return;
  }

  // update page title, header, & submit button text based on the kind of code
  if (inviteCode) {
    document.title = "Join Game";
    document.getElementById("submit-button").innerText = "Join";
  } else {
    document.title = "Update Player Info";
    document.getElementById("submit-button").innerText = "Update";
  }
  document.getElementById("header").innerText = document.title;

  // validate invite or player code
  if (inviteCode && !/^I[a-zA-Z0-9]{15}$/.test(inviteCode)) {
    displayErrorScreen("The invite code has an invalid format.");
    return;
  }
  if (playerCode && !/^P[a-zA-Z0-9]{15}$/.test(playerCode)) {
    displayErrorScreen("The player code has an invalid format.");
    return;
  }

  // request server data with validated invite code
  sendRequest("GET", `/api/game/peek/${inviteCode || playerCode}`, undefined, [
    404,
  ])
    .then(([status, resJson]) => {
      if (status === 404) {
        if (inviteCode) {
          displayErrorScreen("The invite code is invalid or expired.");
        } else {
          displayErrorScreen("The player code is invalid.");
        }
        return;
      }

      components.game_info(document.getElementById("game-info"), resJson);

      // display whether the playlist link field is required
      if (resJson.require_playlist_link) {
        document.getElementById("playlist-link").required = true;
        document
          .querySelector('label[for="playlist-link"]')
          ?.classList.add("required-label");
      }

      if (playerCode) {
        fillExistingPlayerData(gameData);
      }

      gameData = resJson;
      makeDynamicElementsVisible();
    })
    .catch((err) => {
      displayErrorScreen(err.message);
    });
})();

function disableSubmitButton() {
  document.getElementById("submit-button").disabled = true;
}
function enableSubmitButton(cooldownMs = 500) {
  setTimeout(() => {
    document.getElementById("submit-button").disabled = false;
  }, cooldownMs);
}

function setErrorMessage(reason) {
  document.getElementById("error-message").innerText = reason;
}

document.getElementById("submit-button").addEventListener("click", () => {
  const playerName = document.getElementById("player-name").value.trim();
  if (!playerName) {
    setErrorMessage("Please set a player name.");
    return;
  }

  const playlistLink = document.getElementById("playlist-link").value.trim();
  if (!playlistLink && gameData.require_playlist_link) {
    setErrorMessage("Please set a playlist link.");
    return;
  }

  const numSongs = songs.fullRowCount();
  if (numSongs !== songs.rowCount() - 1) {
    setErrorMessage("1 or more songs are missing information.");
    return;
  }
  if (numSongs < gameData.min_songs_per_playlist) {
    setErrorMessage("Too few songs provided.");
    return;
  }
  if (numSongs > gameData.max_songs_per_playlist) {
    setErrorMessage("Too many songs provided.");
    return;
  }

  const songList = [];
  for (let i = 0; i < songs.rowCount() - 1; i++) {
    songList.push({
      title: songs.rowName(i),
      artist: songs.rowArtist(i),
    });
  }
  // handle the unlikely event that the song list length changed since
  // we last checked
  if (songList.length !== numSongs) {
    throw new Error("Unexpected number of songs retrieved.");
  }

  setErrorMessage("");
  disableSubmitButton();

  const requestJson = {
    player_name: playerName,
    playlist_link: playlistLink || null,
    songs: songList,
  };

  sendRequest(
    "POST",
    inviteCode
      ? `/api/game/join/${inviteCode}`
      : `/api/player/update_info/${playerCode}`,
    requestJson,
    [409]
  )
    .then(([status, resJson]) => {
      // if we get a 409 it almost definitely means the player name is
      // already taken (since we already validated everything else)
      if (status === 409) {
        setErrorMessage(
          "The provided player name is already taken for this game."
        );
        enableSubmitButton();
        return;
      }

      // save last used player code so it autofills on the home page next time
      localStorage.setItem("lastUsedCode", resJson.player_code);

      window.location.href = `/player?player_code=${resJson.player_code}`;
    })
    .catch((err) => {
      setErrorMessage(err.message);
      enableSubmitButton();
    });
});
