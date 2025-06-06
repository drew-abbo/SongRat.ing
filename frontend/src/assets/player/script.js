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

/**
 * Updates the background color for a rating and optionally rounds and submits
 * the rating to the backend.
 *
 * @param {HTMLInputElement} ratingInput The input element.
 * @param {Map<number, number>} ratingsBySongId A map of all ratings for songs
 *  that have ratings.
 * @param {number} songId
 * @param {boolean} [justUpdateColor=false] Whether to just change the input
 *  background color (values not rounded, nothing submitted to backend).
 */
function updateRatingInput(
  ratingInput,
  ratingsBySongId,
  songId,
  justUpdateColor = false
) {
  if (justUpdateColor) {
    ratingInput.style.backgroundColor = colorFromRatingStr(ratingInput.value);
    return;
  }

  const ratingIsValid = stringRepresentsFloat(ratingInput.value);

  // force value to be between 0-10 w/ a step size of .25
  const ratingVal = ratingIsValid
    ? Math.round(Math.max(0, Math.min(parseFloat(ratingInput.value), 10)) * 4) /
      4
    : null;
  ratingInput.value = ratingIsValid ? ratingVal : "";

  const previousRating = ratingsBySongId.get(songId) ?? null;

  // rating not changed
  if (ratingVal === ratingsBySongId.get(songId)) {
    ratingInput.style.backgroundColor = colorFromRatingStr(ratingInput.value);
    return;
  }

  // if the rating existed but no longer does, revert to previous rating
  if (ratingVal === null) {
    ratingInput.value = previousRating;
    ratingInput.style.backgroundColor = colorFromRatingStr(ratingInput.value);
    return;
  }

  ratingInput.style.backgroundColor = colorFromRatingStr(ratingInput.value);

  // submit new rating
  sendRequest("POST", `/api/player/rate_song/${playerCode}`, {
    song_id: songId,
    rating: ratingVal,
  })
    .then(() => {
      ratingsBySongId.set(songId, ratingVal);
    })
    .catch((err) => {
      ratingInput.value = previousRating;
      updateRatingInput(ratingInput, ratingsBySongId, songId, true);
      alert("Ratings submission failed: " + err.message);
    });
}

// a list of all playlists that are opened (used to save that state between
// sessions)
const openPlaylistsByName = new Set(
  JSON.parse(sessionStorage.getItem("openPlaylistsByName"))
);

let playlists;
function createPlaylistElements(gameData) {
  // create a map of all ratings for every song so we can easily look up ratings
  // (this also helps the time complexity of rating lookups, though that doesn't
  // matter that much here)
  const ratingsBySongId = new Map();
  gameData.ratings.forEach((rating) => {
    ratingsBySongId.set(rating.song_id, rating.rating);
  });

  const playlistContainer = document.getElementById("playlists");

  const callbacksToCallOnceAllPlaylistsCreated = [];

  let currPlayerName;
  let currPlaylistIsOwnPlaylist;
  let currPlaylist;
  let currPlaylistContent;
  let songsInPlaylist = 0;
  gameData.songs.forEach((song) => {
    // create new playlist object if we reach a new player name
    if (song.player_name !== currPlayerName) {
      currPlayerName = song.player_name;
      currPlaylistIsOwnPlaylist = gameData.player_name === currPlayerName;

      // playlist name div + text
      const playlistName = newElement("div", ["playlist-name"], {}, [
        newElement("h3", ["playlist-name-text"], {
          innerText: currPlaylistIsOwnPlaylist
            ? "Your Playlist"
            : `${currPlayerName}'s Playlist`,
        }),
      ]);

      currPlaylist = newElement("div", ["playlist"], {}, [playlistName]);
      currPlaylistContent = newElement("div", ["playlist-content"]);

      // find this playlist's link
      let playlistLink = gameData.players.find(
        (p) => p.player_name === currPlayerName
      ).playlist_link;

      // whether or not we should add an edit button
      const editButtonRequired =
        currPlaylistIsOwnPlaylist &&
        gameData.game_status === "waiting_for_players";

      // playlist's link and edit button (both optional)
      if (editButtonRequired || playlistLink) {
        const playlistLinkContainerChildren = [];

        if (editButtonRequired) {
          playlistLinkContainerChildren.push(
            newElement("a", ["playlist-link"], {
              href: `/get_player_info?player_code=${playerCode}`,
              rel: "noopener noreferrer",
              innerText: "Edit Playlist",
            })
          );
        }

        if (playlistLink) {
          playlistLinkContainerChildren.push(
            newElement("a", ["playlist-link"], {
              href: playlistLink,
              target: "_blank",
              rel: "noopener noreferrer",
              innerText: "Link",
            })
          );
        }

        currPlaylistContent.appendChild(
          newElement(
            "div",
            ["playlist-top-buttons-container"],
            {},
            playlistLinkContainerChildren
          )
        );
      }

      // add callback so clicking the playlist name opens/closes the content
      // contained elements need to be unable to be tabbed to when hiding
      const content = currPlaylistContent;
      const playerName = currPlayerName;
      const openPlaylistCallback = () => {
        if (content.classList.contains("open")) {
          content.style.maxHeight = null;
          content.classList.remove("open");
          content // remove tabbability
            .querySelectorAll(".playlist-link, .rating-input")
            .forEach((element) => {
              element.tabIndex = -1;
            });
          setTimeout(() => {
            // spam proof
            if (!content.classList.contains("open")) {
              content.style.visibility = "collapse";
            }
          }, 350);
          openPlaylistsByName.delete(playerName);
          sessionStorage.setItem(
            "openPlaylistsByName",
            JSON.stringify([...openPlaylistsByName])
          );
        } else {
          content.style.maxHeight = `${content.scrollHeight}px`;
          content.classList.add("open");
          content // restore tabbability
            .querySelectorAll(".playlist-link, .rating-input")
            .forEach((element) => {
              element.tabIndex = 0;
            });
          content.style.visibility = "visible";
          openPlaylistsByName.add(playerName);
          sessionStorage.setItem(
            "openPlaylistsByName",
            JSON.stringify([...openPlaylistsByName])
          );
        }
      };
      playlistName.addEventListener("click", openPlaylistCallback);

      // if the playlist was open, open it again (wait 1/4 of a sec because it
      // hasn't been added to the DOM yet)
      if (openPlaylistsByName.has(currPlayerName)) {
        callbacksToCallOnceAllPlaylistsCreated.push(openPlaylistCallback);
      }

      currPlaylist.appendChild(currPlaylistContent);

      if (currPlaylistIsOwnPlaylist) {
        playlistContainer.insertBefore(
          currPlaylist,
          playlistContainer.firstChild
        );
      } else {
        playlistContainer.appendChild(currPlaylist);
      }

      songsInPlaylist = 0;
    }

    if (songsInPlaylist !== 0) {
      currPlaylistContent.appendChild(newElement("hr"));
    }
    songsInPlaylist++;

    const songRow = newElement("div", ["song-row"], {}, [
      newElement("div", ["song"], {}, [
        newElement("h3", ["song-name"], { innerText: song.title }),
        newElement("p", ["song-artist"], { innerText: song.artist }),
      ]),
    ]);

    // conditionally add a rating input (and fill w/ any existing rating)
    if (
      gameData.game_status !== "waiting_for_players" &&
      !currPlaylistIsOwnPlaylist
    ) {
      const ratingInput = newElement("input", ["rating-input"], {
        value: ratingsBySongId.has(song.song_id)
          ? ratingsBySongId.get(song.song_id)
          : "",
        inputMode: "decimal",
      });
      updateRatingInput(ratingInput, ratingsBySongId, song.song_id, true);
      ratingInput.addEventListener("blur", (event) => {
        updateRatingInput(event.target, ratingsBySongId, song.song_id);
      });
      ratingInput.addEventListener("focus", (event) => {
        ratingInput.select();
      });

      // ratings aren't allowed to be submitted for non-active games
      if (gameData.game_status !== "active") {
        ratingInput.disabled = true;
      }

      songRow.appendChild(ratingInput);
    }

    currPlaylistContent.appendChild(songRow);
  });

  for (const func of callbacksToCallOnceAllPlaylistsCreated) {
    try {
      func();
    } catch (err) {
      console.error(err);
    }
  }
}

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

      createPlaylistElements(resJson);

      // remove error message text box since we're not going to call
      // displayErrorScreen() from here
      document.getElementById("error-message").remove();

      gameData = resJson;
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

// when the user hits enter in a rating input move to the next one
document.addEventListener("keydown", function (event) {
  if (
    event.key !== "Enter" ||
    !document.activeElement.classList.contains("rating-input")
  ) {
    return;
  }
  event.preventDefault();

  // need to traverse the DOM to get the next input
  //
  //  <div class="playlist-content">
  //    ...
  //    <div class="song-row">
  //      <div class="song">...</div>
  //      <input class="rating-input" />    <- from here
  //    </div>
  //    <hr />
  //    <div class="song-row">
  //      <div class="song">...</div>
  //      <input class="rating-input" />    <- to here
  //    </div>
  //    ...
  //  </div>

  const nextRatingInput = document.activeElement
    .closest("div")
    .nextElementSibling?.nextElementSibling.querySelectorAll(
      ".rating-input"
    )[0];

  if (nextRatingInput) {
    nextRatingInput.focus();
  } else {
    document.activeElement.blur();
  }
});
