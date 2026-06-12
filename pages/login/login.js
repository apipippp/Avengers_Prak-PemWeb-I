const loginForm = document.getElementById("loginForm");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");

function showLoginMessage(message) {
    loginMessage.textContent = message;
    loginMessage.classList.add("is-visible");
}

togglePassword.addEventListener("click", () => {
    const icon = togglePassword.querySelector("i");
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";

    if (icon) {
        icon.classList.toggle("fa-eye", passwordInput.type === "password");
        icon.classList.toggle("fa-eye-slash", passwordInput.type !== "password");
    }
});

window.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const dashboardError = sessionStorage.getItem("awv_dashboard_error");

    if (error) {
        showLoginMessage(error);
        return;
    }

    if (dashboardError) {
        sessionStorage.removeItem("awv_dashboard_error");
        showLoginMessage(`Dashboard error: ${dashboardError}`);
        return;
    }

    const rememberedIdentifier = localStorage.getItem("rememberedIdentifier");

    if (rememberedIdentifier) {
        document.getElementById("identifier").value = rememberedIdentifier;
        document.getElementById("rememberMe").checked = true;
    }

    // Do not auto-redirect from login. It prevents dashboard/login loops when
    // another page has a non-auth runtime error.
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector(".login-btn");

    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("rememberMe").checked;

    if (!identifier || !password) {
        showLoginMessage("Please fill all fields.");
        return;
    }

    try {
        loginMessage.classList.remove("is-visible");
        submitButton.disabled = true;
        submitButton.textContent = "SIGNING IN...";

        const payload = await AWV.api("auth/login", {
            body: { identifier, password, rememberMe }
        });

        if (rememberMe) {
            localStorage.setItem("rememberedIdentifier", identifier);
        } else {
            localStorage.removeItem("rememberedIdentifier");
        }

        localStorage.setItem("currentUser", JSON.stringify(payload.user));
        sessionStorage.setItem("awv_just_logged_in", "1");
        window.location.href = AWV.dashboardFor(payload.user);
    } catch (error) {
        const shouldTryClassic = error.status === 0
            || /Cannot reach backend API|Invalid server response/i.test(error.message);

        if (shouldTryClassic) {
            showLoginMessage(`${error.message} Trying classic PHP login...`);
            window.setTimeout(() => {
                loginForm.submit();
            }, 500);
            return;
        }

        showLoginMessage(error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "SIGN IN";
    }
});
