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
        document.getElementById("invite-code-label").remove();
        document.getElementById("invite-code").remove();
      }

      document.getElementById("game-status").innerText =
        "this game is " + resJson.game_status.replace(/_/g, " ");

      components.game_info(document.getElementById("game-info"), resJson);

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
