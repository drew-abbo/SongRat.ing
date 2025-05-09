// fill the invite code with the last used player/admin code
document.getElementById("enter-code-input").value =
  localStorage.getItem("lastUsedCode") || "";

function setInvalidCodeReason(reason) {
  document.getElementById("invalid-code-reason").innerText = reason;
}

function disableCodeSubmitButton() {
  document.getElementById("enter-code-button").disabled = true;
}
function enableCodeSubmitButton(cooldownMs = 500) {
  setTimeout(() => {
    document.getElementById("enter-code-button").disabled = false;
  }, cooldownMs);
}

async function enterCodeSubmit() {
  disableCodeSubmitButton();
  const code = document.getElementById("enter-code-input").value;

  // validate code format
  if (!code) {
    setInvalidCodeReason("Please enter a code.");
    enableCodeSubmitButton(0);
    return;
  }
  if (!/^[IPA][a-zA-Z0-9]{15}$/.test(code)) {
    setInvalidCodeReason("The code has an invalid format.");
    enableCodeSubmitButton();
    return;
  }

  // validate code with backend
  try {
    const [status, resJson] = await sendRequest(
      "GET",
      `/api/game/check_code/${code}`
    );
    if (!resJson.is_valid) {
      setInvalidCodeReason(
        code[0] === "I"
          ? "The invite code is invalid or expired."
          : `The ${code[0] === "P" ? "player" : "admin"} code is invalid.`
      );
      return;
    }
  } catch (err) {
    setInvalidCodeReason(err.message);
    return;
  } finally {
    enableCodeSubmitButton();
  }

  setInvalidCodeReason("");

  // save last used player/admin code so it autofills next time
  if (code[0] !== "I") {
    localStorage.setItem("lastUsedCode", code);
  }

  if (code[0] === "I") {
    window.location.href = `/get_player_info?invite_code=${code}`;
  } else if (code[0] === "P") {
    window.location.href = `/player?player_code=${code}`;
  } else {
    window.location.href = `/admin?admin_code=${code}`;
  }
}

// "Enter" on "enter-code-input" is the same as pressing "Go"
document
  .getElementById("enter-code-input")
  .addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      // only works if the button isn't disabled
      if (!document.getElementById("enter-code-button").disabled) {
        enterCodeSubmit();
      }
    }
  });
