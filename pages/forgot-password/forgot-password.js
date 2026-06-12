const form = document.getElementById("forgotForm");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        AWV.notify("Password confirmation does not match.", "warning");
        return;
    }

    try {
        await AWV.api("auth/forgot-password", {
            body: { email, password, confirmPassword }
        });
        AWV.notify("Password has been reset. Please login with your new password.", "success");
        window.setTimeout(() => {
            window.location.href = "../login/login.html";
        }, 900);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
});
