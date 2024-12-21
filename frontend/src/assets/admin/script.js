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

function matrixToAllRatingsForPlayer(rowMatrix, songs) {
  const ret = [];
  let lastPlayer = null;
  for (let i = 0; i < rowMatrix.length; i++) {
    if (songs[i].player_name !== lastPlayer) {
      ret.push([]);
      lastPlayer = songs[i].player_name;
    }
    ret.at(-1).push(...rowMatrix[i]);
  }
  return ret;
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
  let found = null;
  let foundIndex = null;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === null) {
      continue;
    }
    if (found === null) {
      found = row[i];
      foundIndex = i;
    } else if (row[i] === found) {
      foundIndex = null; // no repeats
    } else if (row[i] < found) {
      found = row[i];
      foundIndex = i;
    }
  }
  return foundIndex === null ? null : playerNames[foundIndex];
}

function rowMaxFrom(row, playerNames) {
  let found = null;
  let foundIndex = null;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === null) {
      continue;
    }
    if (found === null) {
      found = row[i];
      foundIndex = i;
    } else if (row[i] === found) {
      foundIndex = null; // no repeats
    } else if (row[i] > found) {
      found = row[i];
      foundIndex = i;
    }
  }
  return foundIndex === null ? null : playerNames[foundIndex];
}

function songsByPlayer(songs) {
  const ret = new Map();
  let lastPlayer = null;
  let lastPlayerArr = null;
  for (const song of songs) {
    if (song.player_name !== lastPlayer) {
      lastPlayer = song.player_name;
      lastPlayerArr = [];
      ret.set(lastPlayer, lastPlayerArr);
    }
    lastPlayerArr.push(song);
  }
  return ret;
}

function getSongsTableColumns(gameData) {
  const songs = gameData.songs;
  const playerNames = gameData.players.map((player) => player.player_name);

  // set some rules about each column
  const columnInfo = [
    {
      id: "index",
      name: "#",
      width: "thin",
      renderMode: "default",
      render: true,
    },
    {
      id: "owner",
      name: "Owner",
      width: "medium",
      renderMode: "playerName",
      render: true,
    },
    {
      id: "title",
      name: "Title",
      width: "wide",
      renderMode: "default",
      render: true,
    },
    {
      id: "artist",
      name: "Artist",
      width: "wide",
      renderMode: "default",
      render: true,
    },

    // insert a column for each player's ratings
    ...playerNames.map((playerName) => {
      return {
        id: "player:" + playerName,
        name: playerName,
        width: "thin",
        renderMode: "range0_10",
        render: gameData.game_status !== "waiting_for_players",
      };
    }),

    {
      id: "average",
      name: "Avg.",
      width: "thin",
      renderMode: "range0_10",
      render: gameData.game_status !== "waiting_for_players",
    },
    {
      id: "median",
      name: "Median",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "stdev",
      name: "Std. Dev.",
      width: "thin",
      renderMode: "default",
      render: false,
    },
    {
      id: "mode",
      name: "Mode",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "min",
      name: "Min.",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "max",
      name: "Max.",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "minFrom",
      name: "Min. From",
      width: "medium",
      renderMode: "playerName",
      render: false,
    },
    {
      id: "maxFrom",
      name: "Max. From",
      width: "medium",
      renderMode: "playerName",
      render: false,
    },
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

function averagesGivenPerPlaylistMatrix(rowMatrix, playerNames) {
  const ret = [];
  let lastPlayer = null;
  let counts;
  for (let i = 0; i < rowMatrix.length; i++) {
    if (playerNames[i] !== lastPlayer) {
      if (lastPlayer !== null) {
        for (let j = 0; j < ret.at(-1).length; j++) {
          if (counts[j] !== 0) {
            ret.at(-1)[j] /= counts[j];
          } else {
            ret.at(-1)[j] = null;
          }
        }
      }
      lastPlayer = playerNames[i];
      ret.push(rowMatrix[i].map(() => 0));
      counts = rowMatrix[i].map(() => 0);
    }
    for (let j = 0; j < rowMatrix[i].length; j++) {
      if (rowMatrix[i][j] !== null) {
        ret.at(-1)[j] += rowMatrix[i][j];
        counts[j]++;
      }
    }
  }
  for (let j = 0; j < ret.at(-1).length; j++) {
    if (counts[j] !== 0) {
      ret.at(-1)[j] /= counts[j];
    } else {
      ret.at(-1)[j] = null;
    }
  }
  return ret;
}

function getPlayersTableColumns(gameData) {
  const songs = gameData.songs;
  const playerNames = gameData.players.map((player) => player.player_name);

  // set some rules about each column
  const columnInfo = [
    {
      id: "index",
      name: "#",
      width: "thin",
      renderMode: "default",
      render: true,
    },
    {
      id: "player",
      name: "Player",
      width: "medium",
      renderMode: "playerName",
      render: true,
    },
    {
      id: "songCount",
      name: "Songs",
      width: "thin",
      renderMode: "default",
      render: true,
    },

    // columns related to ratings received
    {
      id: "averageReceived",
      name: "Avg. Received",
      width: "thin",
      renderMode: "range0_10",
      render: gameData.game_status !== "waiting_for_players",
    },
    {
      id: "medianReceived",
      name: "Median Received",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "stdevReceived",
      name: "Std. Dev. Received",
      width: "thin",
      renderMode: "default",
      render: false,
    },
    {
      id: "modeReceived",
      name: "Mode Received",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "minRatingReceived",
      name: "Min. Rating Received",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "maxRatingReceived",
      name: "Max. Rating Received",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "likedMostBy",
      name: "Liked Most By",
      width: "medium",
      renderMode: "playerName",
      render: false,
    },
    {
      id: "likedLeastBy",
      name: "Liked Least By",
      width: "medium",
      renderMode: "playerName",
      render: false,
    },

    // columns related to ratings given
    {
      id: "averageGiven",
      name: "Avg. Given",
      width: "thin",
      renderMode: "range0_10",
      render: gameData.game_status !== "waiting_for_players",
    },
    {
      id: "medianGiven",
      name: "Median Given",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "stdevGiven",
      name: "Std. Dev. Given",
      width: "thin",
      renderMode: "default",
      render: false,
    },
    {
      id: "modeGiven",
      name: "Mode Given",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "minRatingGiven",
      name: "Min. Rating Given",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "maxRatingGiven",
      name: "Max. Rating Given",
      width: "thin",
      renderMode: "range0_10",
      render: false,
    },
    {
      id: "favorite",
      name: "Favorite",
      width: "medium",
      renderMode: "playerName",
      render: false,
    },
    {
      id: "leastFavorite",
      name: "Least Favorite",
      width: "medium",
      renderMode: "playerName",
      render: false,
    },
  ];

  // this matrix is an array of columns
  const ratingMatrix = createRatingMatrix(gameData);

  // this matrix is an array of rows
  const ratingMatrixT = matrixTranspose(ratingMatrix);

  // this matrix is an array of rows where each row is all ratings received for
  // any given player
  const ratingMatrixTByPlayer = matrixToAllRatingsForPlayer(
    ratingMatrixT,
    songs
  );

  // array of rows where each row is the average rating recieved by each player
  const avgMatrix = averagesGivenPerPlaylistMatrix(
    ratingMatrixT,
    songs.map((song) => song.player_name)
  );

  // array of rows where each row is the average rating given by each player
  const avgMatrixT = matrixTranspose(avgMatrix);

  // collect all column data
  const columnData = [
    // index, player, songCount
    Array.from({ length: playerNames.length }, (_, i) => i + 1),
    [...playerNames],
    Array.from(songsByPlayer(songs).values()).map(
      (playerSongs) => playerSongs.length
    ),

    // averageReceived, medianReceived, stdevReceived, modeReceived,
    // minRatingReceived, maxRatingReceived, minRatingReceivedFrom,
    // maxRatingReceivedFrom, likedMostBy, likedLeastBy
    ratingMatrixTByPlayer.map((row) => rowAverage(row)),
    ratingMatrixTByPlayer.map((row) => rowMedian(row)),
    ratingMatrixTByPlayer.map((row) => rowStdev(row)),
    ratingMatrixTByPlayer.map((row) => rowMode(row)),
    ratingMatrixTByPlayer.map((row) => rowMin(row)),
    ratingMatrixTByPlayer.map((row) => rowMax(row)),
    avgMatrix.map((row) => rowMaxFrom(row, playerNames)),
    avgMatrix.map((row) => rowMinFrom(row, playerNames)),

    // averageGiven, medianGiven, stdevGiven, modeGiven, minRatingGiven,
    // maxRatingGiven, minRatingGivenTo, maxRatingGivenTo, favorite,
    // leastFavorite
    ratingMatrix.map((column) => rowAverage(column)),
    ratingMatrix.map((column) => rowMedian(column)),
    ratingMatrix.map((column) => rowStdev(column)),
    ratingMatrix.map((column) => rowMode(column)),
    ratingMatrix.map((column) => rowMin(column)),
    ratingMatrix.map((column) => rowMax(column)),
    avgMatrixT.map((column) => rowMaxFrom(column, playerNames)),
    avgMatrixT.map((column) => rowMinFrom(column, playerNames)),
  ];

  return [columnInfo, columnData];
}

const allPlayerColors = [
  "#bbebb2",
  "#b2ebde",
  "#b2caeb",
  "#ebb2df",
  "#d0b2eb",
  "#ebb2b2",
  "#e5ebb2",
];
const colorsByPlayer = new Map();
function renderModeToColor(cellValue, renderMode) {
  const defaultColor = "var(--color-white)";

  if (renderMode === "playerName") {
    if (!cellValue) {
      return defaultColor;
    }
    let ret = colorsByPlayer.get(cellValue);
    if (!ret) {
      ret = allPlayerColors.shift();
      allPlayerColors.push(ret);
      colorsByPlayer.set(cellValue, ret);
    }
    return ret;
  }

  if (renderMode === "range0_10") {
    return colorFromRatingStr(String(cellValue), defaultColor);
  }

  if (renderMode !== "default") {
    console.error(`Unknown render mode ${renderMode}`);
  }

  return defaultColor;
}

function roundTo2(num) {
  if (typeof num !== "number") {
    return num;
  }

  const numArr = String(num.toFixed(2)).split("");
  while (numArr.at(-1) == "0") {
    numArr.pop();
  }
  if (numArr.at(-1) === ".") {
    numArr.pop();
  }
  return numArr.join("");
}

function initializeSongTable(gameData) {
  const [columnInfo, columnData] = getSongsTableColumns(gameData);

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
        [
          "column-checkbox-item",
          gameData.game_status !== "waiting_for_players" ? "on" : "off",
        ],
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
  const songsTableOrderInfo = newElement("p", ["table-order-info"]);

  let orderBy = "index";
  let orderByReversed = false;
  let filterForPlayer = null;

  renderSongsTable = () => {
    songsTable.innerHTML = "";

    // table heading
    const headingElements = columnInfo
      .filter((column) => column.render)
      .map((column) => {
        const ret = newElement(
          "th",
          [
            "table-column-width-" + column.width,
            ...(column.id.startsWith("player:") ? ["generic-hover-glow"] : []),
          ],
          {
            innerText: column.name,
            ...(column.id.startsWith("player:")
              ? {
                  style: `background-color: ${renderModeToColor(
                    column.name,
                    "playerName"
                  )};`,
                }
              : {}),
          }
        );

        ret.addEventListener("click", (event) => {
          if (orderBy === column.id) {
            if (!orderByReversed) {
              orderByReversed = true;
            } else {
              orderBy = "index";
              orderByReversed = false;
            }
          } else {
            orderBy = column.id;
            orderByReversed = false;
          }
          renderSongsTable();
        });

        return ret;
      });
    songsTable.appendChild(
      newElement("thead", [], {}, [newElement("tr", [], {}, headingElements)])
    );

    // create row data and reorder it
    const rowData = matrixTranspose(columnData);

    // filter out ratings that aren't from the player we're filtering for (this
    // assumes that all songs owned by any given player are in consecutive rows)
    const ownerColumnIndex = 1;
    if (filterForPlayer) {
      for (let i = 0; i < rowData.length; i++) {
        if (rowData[i][ownerColumnIndex] !== filterForPlayer) {
          rowData.splice(i, 1);
          i--;
        }
      }
    }

    const orderByColumnIndex = columnInfo.findIndex(
      (column) => column.id === orderBy
    );
    rowData.sort((rowA, rowB) =>
      ((a, b) => {
        // null/undefined values should never come before actual values, so they
        // need to be put at the front if we're going to reverse the array
        if (a === null) {
          return a === b ? 0 : orderByReversed ? -1 : 1;
        }
        if (b === null) {
          return orderByReversed ? 1 : -1;
        }

        // if the 2 types don't match and aren't either numbers or strings then
        // just don't change the order
        if (typeof a !== typeof b || !["number", "string"].includes(typeof a)) {
          return 0;
        }

        if (typeof a === "number") {
          return a - b;
        }

        // string sorting is case insensitive, but prioritizes upper case for
        // tiebreakers
        const caseInsensitive = a.toLowerCase().localeCompare(b.toLowerCase());
        if (caseInsensitive !== 0) return caseInsensitive;
        return a.localeCompare(b, undefined, { caseFirst: "upper" });
      })(rowA[orderByColumnIndex], rowB[orderByColumnIndex])
    );

    if (orderByReversed) {
      rowData.reverse();
    }

    // update the row indices because any reordering screwed it up for sure
    for (let i = 0; i < rowData.length; i++) {
      rowData[i][0] = i + 1;
    }

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
              .map((rowItemWithColumnInfo) => {
                const ret = newElement(
                  "td",
                  ["table-column-width-" + rowItemWithColumnInfo[1].width],
                  {
                    innerText: roundTo2(rowItemWithColumnInfo[0]) ?? "-",
                    style: `background-color: ${renderModeToColor(
                      rowItemWithColumnInfo[0],
                      rowItemWithColumnInfo[1].renderMode
                    )};`,
                  }
                );

                // add the ability to filter by players
                if (rowItemWithColumnInfo[1].id === "owner") {
                  ret.classList.add("generic-hover-glow");
                  ret.addEventListener("click", (event) => {
                    filterForPlayer =
                      filterForPlayer === rowItemWithColumnInfo[0]
                        ? null
                        : rowItemWithColumnInfo[0];
                    renderSongsTable();
                  });
                }

                return ret;
              })
          )
        )
      )
    );

    songsTableOrderInfo.innerText =
      "Ordered by " +
      orderBy +
      (orderByReversed ? " (high to low)" : " (low to high)") +
      (filterForPlayer ? ", filtered for " + filterForPlayer + "'s songs" : "");
  };

  [
    newElement("div", ["table-scroll-container"], {}, [songsTable]),
    songsTableOrderInfo,
    newElement("hr"),
    columnCheckboxItems,
  ].forEach((element) => songsTableCard.appendChild(element));

  renderSongsTable();
}

function initializePlayerTable(gameData) {
  const [columnInfo, columnData] = getPlayersTableColumns(gameData);

  const playersTableCard = document.getElementById("players-table-card");

  let renderPlayersTable;

  const columnCheckboxItems = newElement(
    "div",
    ["column-checkbox-items"],
    {},
    (() => {
      const ret = [];

      for (const column of columnInfo) {
        // can't toggle the index column
        if (column.id === "index") {
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
          renderPlayersTable();
        });
        ret.push(columnCheckboxItem);
      }

      return ret;
    })()
  );

  const playersTable = newElement("table");
  const playersTableOrderInfo = newElement("p", ["table-order-info"]);

  let orderBy = "index";
  let orderByReversed = false;

  renderPlayersTable = () => {
    playersTable.innerHTML = "";

    // table heading
    const headingElements = columnInfo
      .filter((column) => column.render)
      .map((column) => {
        const ret = newElement("th", ["table-column-width-" + column.width], {
          innerText: column.name,
        });

        ret.addEventListener("click", (event) => {
          if (orderBy === column.id) {
            if (!orderByReversed) {
              orderByReversed = true;
            } else {
              orderBy = "index";
              orderByReversed = false;
            }
          } else {
            orderBy = column.id;
            orderByReversed = false;
          }
          renderPlayersTable();
        });

        return ret;
      });
    playersTable.appendChild(
      newElement("thead", [], {}, [newElement("tr", [], {}, headingElements)])
    );

    // create row data and reorder it
    const rowData = matrixTranspose(columnData);

    const orderByColumnIndex = columnInfo.findIndex(
      (column) => column.id === orderBy
    );
    rowData.sort((rowA, rowB) =>
      ((a, b) => {
        // null/undefined values should never come before actual values, so they
        // need to be put at the front if we're going to reverse the array
        if (a === null) {
          return a === b ? 0 : orderByReversed ? -1 : 1;
        }
        if (b === null) {
          return orderByReversed ? 1 : -1;
        }

        // if the 2 types don't match and aren't either numbers or strings then
        // just don't change the order
        if (typeof a !== typeof b || !["number", "string"].includes(typeof a)) {
          return 0;
        }

        if (typeof a === "number") {
          return a - b;
        }

        // string sorting is case insensitive, but prioritizes upper case for
        // tiebreakers
        const caseInsensitive = a.toLowerCase().localeCompare(b.toLowerCase());
        if (caseInsensitive !== 0) return caseInsensitive;
        return a.localeCompare(b, undefined, { caseFirst: "upper" });
      })(rowA[orderByColumnIndex], rowB[orderByColumnIndex])
    );

    if (orderByReversed) {
      rowData.reverse();
    }

    // update the row indices because any reordering screwed it up for sure
    for (let i = 0; i < rowData.length; i++) {
      rowData[i][0] = i + 1;
    }

    // table data
    playersTable.appendChild(
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
                    innerText: roundTo2(rowItemWithColumnInfo[0]) ?? "-",
                    style: `background-color: ${renderModeToColor(
                      rowItemWithColumnInfo[0],
                      rowItemWithColumnInfo[1].renderMode
                    )};`,
                  }
                )
              )
          )
        )
      )
    );

    playersTableOrderInfo.innerText =
      "Ordered by " +
      orderBy +
      (orderByReversed ? " (high to low)" : " (low to high)");
  };

  [
    newElement("div", ["table-scroll-container"], {}, [playersTable]),
    playersTableOrderInfo,
    newElement("hr"),
    columnCheckboxItems,
  ].forEach((element) => playersTableCard.appendChild(element));

  renderPlayersTable();
}

function createGameNextStepElement(gameData) {
  let buttonText;
  let buttonConfirmationMsg;
  let buttonRequestURL;

  if (gameData.game_status === "waiting_for_players") {
    const playersStillNeeded = 2 - gameData.players.length;
    if (playersStillNeeded > 0) {
      return newElement("h3", ["game-next-step-element"], {
        innerText:
          `You need ${playersStillNeeded} more player` +
          (playersStillNeeded > 1 ? "s" : "") +
          " to start this game...",
      });
    }

    buttonText = "Start Game...";
    buttonConfirmationMsg =
      "Starting a game locks in all players and their songs.";
    buttonRequestURL = `/api/admin/begin/${adminCode}`;
  } else {
    const ratingPercentCompletion =
      (gameData.ratings.length /
        (gameData.players.length * gameData.songs.length -
          gameData.songs.length)) *
      100;

    if (ratingPercentCompletion !== 100) {
      return newElement("h3", ["game-next-step-element"], {
        innerText: `Songs are ${roundTo2(ratingPercentCompletion)}% rated.`,
      });
    }

    buttonText = "End Game...";
    buttonConfirmationMsg = "Ending a game locks in all ratings.";
    buttonRequestURL = `/api/admin/end/${adminCode}`;
  }

  const ret = newElement("button", ["game-next-step-element"], {
    innerText: buttonText,
  });
  ret.addEventListener("click", (event) => {
    if (!confirm(buttonConfirmationMsg)) {
      return;
    }
    event.target.disabled = true;

    sendRequest("POST", buttonRequestURL)
      .then(() => {
        location.reload();
      })
      .catch((err) => {
        alert("The game state couldn't be changed: " + err.message);
        event.target.disabled = false;
      });
  });
  return ret;
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

      const inviteCode = resJson.invite_code;

      components.game_info(document.getElementById("game-info"), resJson);

      // add more game info
      [
        newElement(
          "p",
          [],
          {
            id: "game-status",
            innerText: "this game is " + resJson.game_status.replace(/_/g, " "),
          },
          []
        ),
        newElement("div", [], { id: "copy-code-cards" }, [
          // invite code
          ...(inviteCode
            ? [
                newElement(
                  "div",
                  ["copy-code-card"],
                  { id: "invite-code-copy-card" },
                  [
                    newElement("p", ["copy-code-button-label"], {
                      id: "invite-code-label",
                      innerText: "Invite Code",
                    }),
                    giveButtonCopyCodeCallback(
                      newElement("button", ["copy-code-button"], {
                        innerText: inviteCode,
                      })
                    ),
                  ]
                ),
              ]
            : []),

          // admin code
          newElement(
            "div",
            ["copy-code-card"],
            { id: "admin-code-copy-card" },
            [
              newElement("p", ["copy-code-button-label"], {
                id: "admin-code-label",
                innerText: "Admin Code",
              }),
              giveButtonCopyCodeCallback(
                newElement("button", ["copy-code-button"], {
                  innerText: adminCode,
                })
              ),
            ]
          ),
        ]),

        // player names and codes
        ...(resJson.players.length
          ? [
              newElement("hr"),
              newElement("h3", [], {
                id: "player-code-carousel-label",
                innerText: "Player Codes",
              }),
              newElement(
                "div",
                [],
                {
                  id: "player-code-carousel-container",
                },
                [
                  newElement(
                    "div",
                    [],
                    {
                      id: "player-code-carousel",
                    },
                    resJson.players.map((player) =>
                      newElement(
                        "div",
                        ["copy-code-card"],
                        { id: "invite-code-copy-card" },
                        [
                          newElement("p", ["copy-code-button-label"], {
                            id: "invite-code-label",
                            innerText: player.player_name,
                          }),
                          giveButtonCopyCodeCallback(
                            newElement("button", ["copy-code-button"], {
                              innerText: player.player_code,
                            })
                          ),
                        ]
                      )
                    )
                  ),
                ]
              ),
            ]
          : []),

        // start/end game info/buttons
        ...(resJson.game_status !== "finished"
          ? [createGameNextStepElement(resJson)]
          : []),
      ].forEach((elem) => {
        document.getElementById("game-info").appendChild(elem);
      });

      // don't render tables if there are no players
      const noPlayers = resJson.players.length === 0;
      if (noPlayers) {
        document.getElementById("songs-table-card").remove();
        document.getElementById("players-table-card").remove();
      } else {
        document.getElementById("need-more-data-msg").innerText = "";
        initializeSongTable(resJson);
        initializePlayerTable(resJson);
      }

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

// when the user clicks to copy their code
function giveButtonCopyCodeCallback(elem) {
  elem.addEventListener("click", async function (event) {
    await navigator.clipboard.writeText(event.target.innerText);

    // make "copied" appear above the button for 1.5 seconds
    this.mostRecentClick = event;
    event.target.classList.add("show-copied");
    setTimeout(() => {
      if (this.mostRecentClick === event)
        event.target.classList.remove("show-copied");
    }, 1500);
  });
  return elem;
}
