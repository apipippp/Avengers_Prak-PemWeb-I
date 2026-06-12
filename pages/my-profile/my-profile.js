const profileImage = document.getElementById("profileImage");
const previewImage = document.getElementById("previewImage");
const profileForm = document.querySelector(".profile-form");

async function initProfile() {
    const user = await AWV.requireAuth("user");
    if (!user) return;

    AWV.hydrateShell(user);
    fillProfile(user);
}

function fillProfile(user) {
    previewImage.src = AWV.resolveMedia(user.avatarUrl, "assets/images/user-profile/profile-default.png");
    document.querySelector(".avatar-section h2").textContent = user.name;
    document.querySelector(".avatar-section span").textContent = user.role === "admin" ? "Super Admin" : "Fan User";

    const inputs = profileForm.querySelectorAll("input");
    inputs[0].value = user.firstName;
    inputs[1].value = user.lastName;
    inputs[2].value = user.agentId;
    inputs[3].value = user.email;
    inputs[4].value = "";
    inputs[5].value = "";
}

profileImage.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) previewImage.src = URL.createObjectURL(file);
});

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const inputs = profileForm.querySelectorAll("input");
    const formData = new FormData();
    formData.append("firstName", inputs[0].value.trim());
    formData.append("lastName", inputs[1].value.trim());
    formData.append("email", inputs[3].value.trim());
    formData.append("password", inputs[4].value);
    formData.append("confirmPassword", inputs[5].value);

    if (profileImage.files[0]) {
        formData.append("avatar", profileImage.files[0]);
    }

    try {
        await AWV.api("profile/update", { formData });
        AWV.notify("Profile updated.", "success");
        const user = await AWV.me();
        fillProfile(user);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
});

initProfile().catch((error) => AWV.notify(error.message, "error"));
