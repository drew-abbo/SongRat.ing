/**
 * A shortcut for creating complex HTML elements.
 *
 * @param {string} tag The HTML tag name e.g. `"div"`.
 * @param {string[]} [classes=[]] The classes this element belongs to.
 * @param {Object.<string, *>} [attributes={}] A map of attributes to apply to
 *  this element.
 * @param {HTMLElement[]} [innerElements=[]] Elements to be appended as children
 *  to this one.
 * @returns {HTMLElement} The newly created element.
 *
 * @example
 * someDiv.appendChild(
 *   newElement("a", ["important-link"], {
 *     href: "https://google.com",
 *     target: "_blank",
 *     rel: "noopener noreferrer",
 *     innerText: "Link 🗗",
 *   })
 * );
 */
function newElement(tag, classes = [], attributes = {}, innerElements = []) {
  const element = document.createElement(tag);
  for (let className of classes) {
    element.classList.add(className);
  }
  for (let [attribute, value] of Object.entries(attributes)) {
    element[attribute] = value;
  }
  for (let innerElement of innerElements) {
    element.appendChild(innerElement);
  }
  return element;
}

/**
 * An object with methods for creating components.
 */
const components = Object.freeze({
  // top navigation bar
  top_nav_bar: () => {
    const logo = newElement("img", [], {
      src: "assets/song_rat_small.png",
      alt: "logo",
    });
    logo.addEventListener("click", () => {
      if (logo.classList.contains("do-a-spin")) {
        return;
      }
      logo.classList.add("do-a-spin");
      setTimeout(() => {
        logo.classList.remove("do-a-spin");
      }, 500);
    });

    document.body.appendChild(
      newElement("div", ["top-nav-bar"], {}, [
        logo,
        newElement("a", [], { href: "/", innerText: "Home" }),
        newElement("a", [], {
          href: "https://github.com/drew-abbo/SongRat.ing",
          target: "_blank",
          rel: "noopener noreferrer",
          innerText: "GitHub",
        }),
      ])
    );
  },

  // a card with info about a game, sourced from `gameInfo` json data
  game_info: (rootElement, gameInfo) => {
    const gameName = gameInfo.game_name;
    const minSongs = gameInfo.min_songs_per_playlist;
    const maxSongs = gameInfo.max_songs_per_playlist;
    const gameDescription = gameInfo.game_description;

    const gameInfoElements = [
      // game name
      newElement("h2", [], {
        innerText: gameName,
      }),

      // songs per playlist
      newElement("h4", [], {
        innerText:
          (minSongs === maxSongs ? minSongs : `${minSongs}-${maxSongs}`) +
          " song" +
          (minSongs === 1 && maxSongs === 1 ? "" : "s") +
          " per playlist",
      }),
    ];

    // game description and a horizontal rule (if description provided)
    if (gameDescription) {
      gameInfoElements.push(
        newElement("hr"),
        newElement("pre", [], {
          innerText: gameDescription,
        })
      );
    }

    rootElement.replaceChildren(...gameInfoElements);
  },
});

/**
 * Send an HTTP request with some optional JSON to a server and get the server's
 * JSON response.
 *
 * @param {"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} method The HTTP method to use.
 * @param {string} url The url to make the post request to.
 * @param {Object} [jsonBody] The JSON body to stringify and send. Can be
 *  omitted if there's no data to send.
 * @param {number[]} [allowedBadCodes=[]] An array of codes that are acceptable
 *  beyond the ones that are generally "ok" (you'd want to set this if something
 *  like a 409 isn't an unexpected response).
 *
 * @returns {Promise<[number, any]>} A promise that resolves to the server's
 *  response status code and the parsed JSON response.
 *
 * @throws An error if the response JSON can't be parsed, if the status isn't
 *  "ok" or in `allowedBadCodes`, or if the connection fails.
 *
 * @example
 * sendRequest("POST", "/api/new_user", userData, [409])
 *   .then(([status, resJson]) => {
 *     if (status === 409) {
 *       console.error("User with that username already exists!");
 *       return;
 *     }
 *     console.log("User created!");
 *   })
 *   .catch((err) => {
 *     console.error("Request failed!");
 *   });
 */
async function sendRequest(method, url, jsonBody, allowedBadCodes = []) {
  let res;
  try {
    res = await fetch(url, {
      method: method,

      // conditionally attach a JSON body
      ...(jsonBody !== undefined && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonBody),
      }),
    });
  } catch (err) {
    throw new Error("Failed to reach the server.");
  }

  let resJson;
  try {
    resJson = await res.json();
  } catch (err) {
    // if the server responds with something other than JSON
    throw new Error(
      `Server returned status ${res.status} (response JSON unparsable).`
    );
  }

  if (!res.ok && !allowedBadCodes.includes(res.status)) {
    throw new Error(
      `Server returned status ${res.status}: ${
        resJson.message || "No message provided"
      }.`
    );
  }

  return [res.status, resJson];
}

function stringRepresentsFloat(s) {
  return /^\s*(-?)((\d+(\.(\d+)?)?)|(\.?\d+))\s*$/.test(s);
}

/**
 * Get a background color based on an input string that represents a number.
 *
 * @param {string} valueStr A string that may or may not represent a float.
 * @param {string} badColor The color to return if the string is bad.
 * @returns {string} The CSS color string to be applied based on the value.
 */
function colorFromRatingStr(valueStr, badColor = "#d6d6d6") {
  const red = { r: 255, g: 216, b: 214 };
  const yellow = { r: 255, g: 241, b: 227 };
  const green = { r: 227, g: 255, b: 227 };

  if (!stringRepresentsFloat(valueStr)) {
    return badColor;
  }
  const val =
    Math.round(Math.max(0, Math.min(parseFloat(valueStr), 10)) * 4) / 4;

  // get color inbetween 2 colors given a ratio
  function lerpColor(colorA, colorB, ratio) {
    return {
      r: Math.round(colorA.r + (colorB.r - colorA.r) * ratio),
      g: Math.round(colorA.g + (colorB.g - colorA.g) * ratio),
      b: Math.round(colorA.b + (colorB.b - colorA.b) * ratio),
    };
  }

  const ret = lerpColor(
    lerpColor(red, yellow, val / 10),
    lerpColor(yellow, green, val / 10),
    val / 10
  );
  return `rgb(${ret.r}, ${ret.g}, ${ret.b})`;
}
