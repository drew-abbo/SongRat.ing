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

const playerCode = new URLSearchParams(window.location.search).get(
  "player_code"
);

// generate the dynamic content from the player_code parameter in the url
let gameData;
(() => {
  // validate player code
  if (!playerCode) {
    displayErrorScreen("No player code provided.");
    return;
  }
  if (!/^P[a-zA-Z0-9]{15}$/.test(playerCode)) {
    displayErrorScreen("The player code has an invalid format.");
    return;
  }

  // request server data with validated player code
  sendRequest("GET", `/api/player/review/${playerCode}`, undefined, [404])
    .then(([status, resJson]) => {
      if (status === 404) {
        displayErrorScreen("The player code is invalid.");
        return;
      }

      // set player name and player code
      document.getElementById("player-name").innerText = resJson.player_name;
      document.getElementById("player-code").innerText = playerCode;

      components.game_info(document.getElementById("game-info"), resJson);
      gameData = resJson;

      createPlaylistElements();

      // remove error message text box since we're not going to call
      // displayErrorScreen() from here
      document.getElementById("error-message").remove();

      makeDynamicElementsVisible();
    })
    .catch((err) => {
      displayErrorScreen(err.message);
    });
})();

// when the user clicks to copy their player code
document
  .getElementById("player-code")
  .addEventListener("click", async function (event) {
    await navigator.clipboard.writeText(playerCode);

    // make "copied" appear above the button for 1.5 seconds
    this.mostRecentClick = event;
    event.target.classList.add("show-copied");
    setTimeout(() => {
      if (this.mostRecentClick === event)
        event.target.classList.remove("show-copied");
    }, 1500);
  });

// handle playlists expanding when you click the playlist header
document.querySelectorAll(".playlist-name").forEach((playlistName) => {
  playlistName.addEventListener("click", () => {
    const content = playlistName.nextElementSibling;
    if (content.classList.contains("open")) {
      content.style.maxHeight = null;
      content.classList.remove("open");
    } else {
      content.style.maxHeight = `${content.scrollHeight}px`;
      content.classList.add("open");
    }
  });
});

// REMOVE LATER: start with all playlists open
document.querySelectorAll(".playlist-content").forEach((content) => {
  content.style.maxHeight = `${content.scrollHeight}px`;
  content.classList.add("open");
});

// rating textboxes change color and round when you deselect them
document.querySelectorAll(".rating-input").forEach((input) => {
  input.addEventListener("blur", () => {
    // force value to be between 0-10 w/ a step size of .25
    input.value = stringRepresentsFloat(input.value)
      ? Math.round(Math.max(0, Math.min(parseFloat(input.value), 10)) * 4) / 4
      : "";
    input.style.backgroundColor = colorFromRatingStr(input.value);
  });
});

function createPlaylistElements() {
  // TODO: use `gameData` to create the playlist elements
  // - when the game is "waiting_for_players" do not give rating inputs
  // - when the game is "active" give rating inputs
  // - when the game is "finished" give *disabled* rating inputs
  // - never give rating inputs for the reviewer's playlist
  // - add <hr> elements in between all songs
}
