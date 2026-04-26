const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const authForm = document.getElementById("authForm");
const nameField = document.getElementById("nameField");
const authMessage = document.getElementById("authMessage");
const submitBtn = authForm.querySelector('button[type="submit"]');

let mode = "login";
const params = new URLSearchParams(window.location.search);
const nextPath = params.get("next") || "/dashboard";

const toggleMode = (nextMode) => {
  mode = nextMode;
  const register = mode === "register";
  nameField.classList.toggle("hidden", !register);
  loginTab.classList.toggle("active", mode === "login");
  registerTab.classList.toggle("active", mode === "register");
};

loginTab.addEventListener("click", () => toggleMode("login"));
registerTab.addEventListener("click", () => toggleMode("register"));
if (params.get("mode") === "register") toggleMode("register");

const setMessage = (text, error = false) => {
  authMessage.textContent = text;
  authMessage.style.color = error ? "#fecdd3" : "#bbf7d0";
};

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  };

  const url = mode === "register" ? "/api/auth/register" : "/api/auth/login";
  try {
    window.setButtonLoading?.(submitBtn, "Please wait", true);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Authentication failed");
    setMessage("Success! Redirecting...");
    window.showToast?.("Authentication successful", "success");
    setTimeout(() => {
      window.location.href = nextPath;
    }, 500);
  } catch (err) {
    setMessage(err.message, true);
    window.showToast?.(err.message, "error");
  } finally {
    window.setButtonLoading?.(submitBtn, "Please wait", false);
  }
});

(async () => {
  const response = await fetch("/api/auth/me");
  if (response.ok) {
    window.location.href = nextPath;
  }
})();
