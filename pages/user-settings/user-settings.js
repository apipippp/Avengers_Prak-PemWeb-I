const deleteBtn = document.getElementById("deleteBtn");
const deleteModal = document.getElementById("deleteModal");
const cancelBtn = document.getElementById("cancelBtn");
const confirmBtn = document.getElementById("confirmBtn");
const muteNotifications = document.getElementById("muteNotifications");

async function initUserSettings() {
    const user = await AWV.requireAuth("user");
    if (!user) return;

    AWV.hydrateShell(user);
    muteNotifications.checked = user.muteNotifications;
}

muteNotifications.addEventListener("change", async () => {
    try {
        await AWV.api("settings/update", {
            body: { muteNotifications: muteNotifications.checked }
        });
    } catch (error) {
        AWV.notify(error.message, "error");
    }
});

deleteBtn.addEventListener("click", async () => {
    const confirmed = await AWV.confirm("This action cannot be undone. Are you sure?", {
        title: "Delete Account",
        type: "danger",
        confirmText: "Delete"
    });

    if (!confirmed) return;

    try {
        await AWV.api("settings/delete-account", { method: "POST" });
        AWV.notify("Account deleted.", "success");
        window.setTimeout(() => {
            window.location.href = "../login/login.html";
        }, 700);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
});

initUserSettings().catch((error) => AWV.notify(error.message, "error"));
