const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const agentId = document.getElementById("agentId").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const termsAccepted = document.getElementById("agreeTerms").checked;

    if (!firstName || !lastName || !agentId || !email || !password || !confirmPassword) {
        AWV.notify("Please fill all fields.", "warning");
        return;
    }

    if (password !== confirmPassword) {
        AWV.notify("Clearance Code does not match.", "warning");
        return;
    }

    if (!termsAccepted) {
        AWV.notify("You must agree to the Terms of Service and Privacy Policy.", "warning");
        return;
    }

    try {
        await AWV.api("auth/register", {
            body: { firstName, lastName, agentId, email, password, termsAccepted }
        });
        AWV.notify("Registration successful! Please login.", "success");
        window.setTimeout(() => {
            window.location.href = "../login/login.html";
        }, 900);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
});
