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
        render: true,
      };
    }),

    {
      id: "average",
      name: "Avg.",
      width: "thin",
      renderMode: "range0_10",
      render: true,
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
  let orderBy = "index";
  let orderByReversed = false;

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
            ...(column.id.startsWith("player:")
              ? ["player-column-table-header-cell"]
              : []),
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

    // update the row indices because any reordering screwed it up for sure
    for (let i = 0; i < rowData.length; i++) {
      rowData[i][0] = i + 1;
    }

    if (orderByReversed) {
      rowData.reverse();
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
  };

  [
    newElement("div", ["table-scroll-container"], {}, [songsTable]),
    newElement("hr"),
    columnCheckboxItems,
  ].forEach((element) => songsTableCard.appendChild(element));

  renderSongsTable();
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
          "h3",
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
                        id: "invite-code",
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
                  id: "admin-code",
                  innerText: adminCode,
                })
              ),
            ]
          ),
        ]),
      ].forEach((elem) => {
        document.getElementById("game-info").appendChild(elem);
      });

      // remove error message text box since we're not going to call
      // displayErrorScreen() from here
      document.getElementById("error-message").remove();

      // don't render tables if there are no players
      const noPlayers = resJson.players.length === 0;
      if (noPlayers) {
        document.getElementById("songs-table-card").remove();
      } else {
        document.getElementById("need-more-data-msg").innerText = "";
        initializeSongTable(resJson);
      }

      // THIS IS A TEMPORARY CHANGE TO HELP WITH DEVELOPMENT
      // add a list of players and player codes to the top of the screen
      document.querySelector(".content").prepend(
        newElement(
          "div",
          [],
          {
            style: "text-align: left; max-width: 90%",
          },
          resJson.players.map((player) =>
            newElement("p", [], {
              innerText: player.player_name + " - " + player.player_code,
              style:
                "color: red; white-space: nowrap; overflow: hidden; " +
                "text-overflow: ellipsis;",
            })
          )
        )
      );

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
