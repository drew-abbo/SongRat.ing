/**
 * An object with methods for creating components.
 */
const components = Object.freeze({
  // top navigation bar
  top_nav_bar: () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="top-nav-bar">
        <a href="/">Home</a>
        <a href="https://github.com/drew-abbo/song_rating_game">GitHub</a>
      </div>`
    );
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
