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

// returns a matrix of all ratings (each sub-array is an array of all ratings
// from just one player)
function createRatingMatrix(gameData) {
  // need to be able to get an index from the song id
  const songIdToIndexMap = new Map();
  for (let i = 0; i < gameData.songs.length; i++) {
    songIdToIndexMap.set(gameData.songs[i].song_id, i);
  }

  // need to be able to get an index from the rater player name
  const raterPlayerNameToIndexMap = new Map();
  for (let i = 0; i < gameData.players.length; i++) {
    raterPlayerNameToIndexMap.set(gameData.players[i].player_name, i);
  }

  // fill matrix with all null
  const ratingMatrix = Array.from({ length: gameData.players.length }, () =>
    Array(gameData.songs.length).fill(null)
  );

  // for every rating, update the matrix
  for (const rating of gameData.ratings) {
    ratingMatrix[raterPlayerNameToIndexMap.get(rating.rater_player_name)][
      songIdToIndexMap.get(rating.song_id)
    ] = rating.rating;
  }

  return ratingMatrix;
}

function matrixTranspose(matrix) {
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

function rowFilterOutNull(row) {
  return row.filter((x) => x !== null);
}

function rowAverage(row) {
  row = rowFilterOutNull(row);
  if (row.length < 1) {
    return null;
  }

  return row.reduce((acc, num) => acc + num, 0) / row.length;
}

function rowMedian(row) {
  row = rowFilterOutNull(row);
  if (row.length < 1) {
    return null;
  }

  const sorted = row.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length & 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function rowStdev(row) {
  row = rowFilterOutNull(row);
  if (row.length < 2) {
    return null;
  }

  const mean = rowAverage(row);
  const variance =
    row.reduce((acc, num) => acc + (num - mean) ** 2, 0) / row.length;
  return Math.sqrt(variance);
}

function rowMode(row) {
  row = rowFilterOutNull(row);
  if (row.length < 1) {
    return null;
  }

  const freqMap = new Map();
  row.forEach((num) => {
    freqMap.set(num, (freqMap.get(num) ?? 0) + 1);
  });

  let maxFreq;
  for (const [num, freq] of freqMap) {
    if (!maxFreq || freq > maxFreq) {
      maxFreq = freq;
    }
  }

  let ret = null;
  for (const [num, freq] of freqMap) {
    if (freq !== maxFreq) {
      continue;
    }
    if (ret) {
      return null; // mode is indecisive
    }
    ret = num;
  }
  return ret;
}

function rowMin(row) {
  row = rowFilterOutNull(row);
  if (row.length < 1) {
    return null;
  }

  let ret = row[0];
  for (let i = 1; i < row.length; i++) {
    if (row[i] < ret) {
      ret = row[i];
    }
  }
  return ret;
}

function rowMax(row) {
  row = rowFilterOutNull(row);
  if (row.length < 1) {
    return null;
  }

  let ret = row[0];
  for (let i = 1; i < row.length; i++) {
    if (row[i] > ret) {
      ret = row[i];
    }
  }
  return ret;
}

function rowMinFrom(row, playerNames) {
  row = rowFilterOutNull(row);
  if (row.length < 1) {
    return null;
  }

  let minFound = row[0];
  let minCount = 1;
  let ret = playerNames[0];
  for (let i = 1; i < row.length; i++) {
    if (row[i] === minFound) {
      minCount++;
    } else if (row[i] < ret) {
      minFound = row[i];
      minCount = 1;
      ret = playerNames[i];
    }
  }
  return minCount === 1 ? ret : null;
}

function rowMaxFrom(row, playerNames) {
  row = rowFilterOutNull(row);
  if (row.length < 1) {
    return null;
  }

  let maxFound = row[0];
  let maxCount = 1;
  let ret = playerNames[0];
  for (let i = 1; i < row.length; i++) {
    if (row[i] === maxFound) {
      maxCount++;
    } else if (row[i] > ret) {
      maxFound = row[i];
      maxCount = 1;
      ret = playerNames[i];
    }
  }
  return maxCount === 1 ? ret : null;
}

function getSongsTableColumns(gameData) {
  const songs = gameData.songs;
  const playerNames = gameData.players.map((player) => player.player_name);

  // set some rules about each column
  const columnInfo = [
    { id: "index", name: "#", width: "thin", render: true },
    { id: "owner", name: "Owner", width: "medium", render: true },
    { id: "title", name: "Title", width: "wide", render: true },
    { id: "artist", name: "Artist", width: "wide", render: true },

    // insert a column for each player's ratings
    ...playerNames.map((playerName) => {
      return {
        id: "player:" + playerName,
        name: playerName,
        width: "thin",
        render: true,
      };
    }),

    { id: "average", name: "Avg.", width: "thin", render: true },
    { id: "median", name: "Median", width: "thin", render: false },
    { id: "stdev", name: "Std. Dev.", width: "thin", render: false },
    { id: "mode", name: "Mode", width: "thin", render: false },
    { id: "min", name: "Min.", width: "thin", render: false },
    { id: "max", name: "Max.", width: "thin", render: false },
    { id: "minFrom", name: "Min. From", width: "medium", render: false },
    { id: "maxFrom", name: "Max. From", width: "medium", render: false },
  ];

  // this matrix is an array of columns
  const ratingMatrix = createRatingMatrix(gameData);

  // this matrix is an array of rows
  const ratingMatrixT = matrixTranspose(ratingMatrix);

  // collect all column data
  const columnData = [
    // index, owner, title, and artist
    Array.from({ length: songs.length }, (_, i) => i + 1),
    songs.map((song) => song.player_name),
    songs.map((song) => song.title),
    songs.map((song) => song.artist),

    // each player's ratings
    ...ratingMatrix,

    // average, median, stdev, mode, min, max, minFrom, and maxFrom
    ratingMatrixT.map((row) => rowAverage(row)),
    ratingMatrixT.map((row) => rowMedian(row)),
    ratingMatrixT.map((row) => rowStdev(row)),
    ratingMatrixT.map((row) => rowMode(row)),
    ratingMatrixT.map((row) => rowMin(row)),
    ratingMatrixT.map((row) => rowMax(row)),
    ratingMatrixT.map((row) => rowMinFrom(row, playerNames)),
    ratingMatrixT.map((row) => rowMaxFrom(row, playerNames)),
  ];

  return [columnInfo, columnData];
}

function initializeSongTable(gameData) {
  const [columnInfo, columnData] = getSongsTableColumns(gameData);
  const rowData = matrixTranspose(columnData);

  const songsTableCard = document.getElementById("songs-table-card");

  let renderSongsTable;

  const columnCheckboxItems = newElement(
    "div",
    ["column-checkbox-items"],
    {},
    (() => {
      const ret = [];

      let ratingsCheckboxItem = newElement(
        "button",
        ["column-checkbox-item", "on"],
        { innerText: "Ratings" }
      );
      const playerColumns = [];

      for (const column of columnInfo) {
        // can't toggle the index column
        if (column.id === "index") {
          continue;
        }

        // all player columns (ratings) are toggled by 1 button
        if (column.id.startsWith("player:")) {
          if (!playerColumns.length) {
            ret.push(ratingsCheckboxItem);
          }
          playerColumns.push(column);
          continue;
        }

        const columnCheckboxItem = newElement(
          "button",
          ["column-checkbox-item", column.render ? "on" : "off"],
          { innerText: column.name }
        );
        columnCheckboxItem.addEventListener("click", (event) => {
          event.target.classList.toggle("on");
          event.target.classList.toggle("off");
          column.render = !column.render;
          renderSongsTable();
        });
        ret.push(columnCheckboxItem);
      }

      ratingsCheckboxItem.addEventListener("click", (event) => {
        event.target.classList.toggle("on");
        event.target.classList.toggle("off");
        playerColumns.forEach((column) => {
          column.render = !column.render;
        });
        renderSongsTable();
      });

      return ret;
    })()
  );

  const songsTable = newElement("table");

  renderSongsTable = () => {
    songsTable.innerHTML = "";

    // table heading
    songsTable.appendChild(
      newElement("thead", [], {}, [
        newElement(
          "tr",
          [],
          {},
          columnInfo
            .filter((column) => column.render)
            .map((column) =>
              newElement("th", ["table-column-width-" + column.width], {
                innerText: column.name,
              })
            )
        ),
      ])
    );

    // table data
    songsTable.appendChild(
      newElement(
        "tbody",
        [],
        {},
        rowData.map((row) =>
          newElement(
            "tr",
            [],
            {},
            row
              .map((rowItem, columnIndex) => [rowItem, columnInfo[columnIndex]])
              .filter(
                (rowItemWithColumnInfo) => rowItemWithColumnInfo[1].render
              )
              .map((rowItemWithColumnInfo) =>
                newElement(
                  "td",
                  ["table-column-width-" + rowItemWithColumnInfo[1].width],
                  {
                    innerText: rowItemWithColumnInfo[0] ?? "-",
                  }
                )
              )
          )
        )
      )
    );
  };

  [
    newElement("div", ["table-scroll-container"], {}, [songsTable]),
    newElement("hr"),
    columnCheckboxItems,
  ].forEach((element) => songsTableCard.appendChild(element));

  renderSongsTable();
}

function renderSongDataTable(gameData) {
  const playerNames = gameData.players.map((player) => player.player_name);

  const songsTableCard = document.getElementById("songs-table-card");

  const songsTable = newElement("table");
  songsTableCard.appendChild(
    newElement("div", ["table-scroll-container"], {}, [songsTable])
  );
}

const adminCode = new URLSearchParams(window.location.search).get("admin_code");

// generate the dynamic content from the admin_code parameter in the url
let gameData;
(() => {
  // validate admin code
  if (!adminCode) {
    displayErrorScreen("No admin code provided.");
    return;
  }
  if (!/^A[a-zA-Z0-9]{15}$/.test(adminCode)) {
    displayErrorScreen("The admin code has an invalid format.");
    return;
  }

  // request server data with validated admin code
  sendRequest("GET", `/api/admin/review/${adminCode}`, undefined, [404])
    .then(([status, resJson]) => {
      if (status === 404) {
        displayErrorScreen("The admin code is invalid.");
        return;
      }

      // set game name and admin code
      document.getElementById("game-name").innerText = resJson.game_name;
      document.getElementById("admin-code").innerText = adminCode;

      // set game status and (optionally) invite code
      const inviteCode = resJson.invite_code;
      if (inviteCode) {
        document.getElementById("invite-code").innerText = inviteCode;
      } else {
        document.getElementById("invite-code-copy-card").remove();
      }

      document.getElementById("game-status").innerText =
        "this game is " + resJson.game_status.replace(/_/g, " ");

      components.game_info(document.getElementById("game-info"), resJson);

      // remove error message text box since we're not going to call
      // displayErrorScreen() from here
      // RE-ADD THIS:
      // document.getElementById("error-message").remove();

      // don't render tables if there are no players
      const noPlayers = resJson.players.length === 0;
      if (noPlayers) {
        document.getElementById("songs-table-card").remove();
      } else {
        document.getElementById("need-more-data-msg").innerText = "";
        initializeSongTable(resJson);
      }

      gameData = resJson;
      makeDynamicElementsVisible();
    })
    .catch((err) => {
      displayErrorScreen(err.message);
    });
})();

// when the user clicks to copy their admin code
document.querySelectorAll(".copy-code-button").forEach((elem) =>
  elem?.addEventListener("click", async function (event) {
    await navigator.clipboard.writeText(event.target.innerText);

    // make "copied" appear above the button for 1.5 seconds
    this.mostRecentClick = event;
    event.target.classList.add("show-copied");
    setTimeout(() => {
      if (this.mostRecentClick === event)
        event.target.classList.remove("show-copied");
    }, 1500);
  })
);
