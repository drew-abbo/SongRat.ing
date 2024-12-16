// auto resize the game description text box to fit the content
const gameDescTextBox = document.getElementById("game-description");
function autoResizeTextarea() {
  gameDescTextBox.style.height = "auto";
  gameDescTextBox.style.height = `${gameDescTextBox.scrollHeight - 27}px`;
}
gameDescTextBox.addEventListener("input", autoResizeTextarea);
window.addEventListener("resize", autoResizeTextarea);
window.addEventListener("load", autoResizeTextarea);

// ensures inputs with type="number" don't allow any non-numeric input
// (disables paste in the process)
document.querySelectorAll('input[type="number"]').forEach((input) => {
  input.addEventListener("keypress", (event) => {
    if (isNaN(String.fromCharCode(event.keyCode))) event.preventDefault();
  });
  input.addEventListener("paste", (event) => {
    event.preventDefault();
  });
});

function setInvalidInputReason(reason) {
  document.getElementById("invalid-input-reason").innerText = reason;
}

// Returns a valid song count from a string (in range [0, 100]) or null
// if it isn't valid. All whitespace strings return a default value.
function validateSongCount(str, defaultVal) {
  str = str.trim();
  if (str === "") {
    return defaultVal;
  }
  if (!/^\d+$/.test(str)) {
    return null;
  }
  const ret = Number(str);
  return ret >= 1 && ret <= 100 ? ret : null;
}

function disableCreateButton() {
  document.getElementById("create-button").disabled = true;
}
function enableCreateButton(cooldownMs = 500) {
  setTimeout(() => {
    document.getElementById("create-button").disabled = false;
  }, cooldownMs);
}

// when the "Create" button is clicked
document.getElementById("create-button").addEventListener("click", () => {
  const gameName = document.getElementById("game-name").value.trim();
  if (!gameName) {
    setInvalidInputReason("Please set a game name.");
    return;
  }

  // ensure both songs per playlist values are valid
  const minSongs = validateSongCount(
    document.getElementById("min-songs").value,
    1
  );
  const maxSongs = validateSongCount(
    document.getElementById("max-songs").value,
    100
  );
  if (!minSongs || !maxSongs || minSongs > maxSongs) {
    setInvalidInputReason(
      "Songs per playlist limits must be integers from 1-100 where " +
        "min ≤ max."
    );
    return;
  }

  const gameDescription = document
    .getElementById("game-description")
    .value.trim();

  const requirePlaylistLink = document.getElementById(
    "require-playlist-link"
  ).checked;

  setInvalidInputReason("");
  disableCreateButton();

  const requestJson = {
    game_name: gameName,
    game_description: gameDescription,
    min_songs_per_playlist: minSongs,
    max_songs_per_playlist: maxSongs,
    require_playlist_link: requirePlaylistLink,
  };

  sendRequest("POST", "/api/game/new", requestJson)
    .then(([status, resJson]) => {
      // save new admin code as last used so it autofills next time
      localStorage.setItem("lastUsedCode", resJson.admin_code);

      window.location.href = `/admin?admin_code=${resJson.admin_code}`;
    })
    .catch((err) => {
      setInvalidInputReason(err.message);
      enableCreateButton();
    });
});
