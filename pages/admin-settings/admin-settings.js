const deleteBtn = document.getElementById("deleteBtn");
const deleteModal = document.getElementById("deleteModal");
const cancelBtn = document.getElementById("cancelBtn");
const confirmBtn = document.getElementById("confirmBtn");
const muteNotifications = document.getElementById("muteNotifications");

async function initAdminSettings() {
    const user = await AWV.requireAuth("admin");
    if (!user) return;

    AWV.hydrateShell(user);
    AWV.ensureAdminTopbar(user);
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
    const confirmed = await AWV.confirm("This action cannot be undone. Continue?", {
        title: "Delete Admin Account",
        type: "danger",
        confirmText: "Delete"
    });

    if (!confirmed) return;

    try {
        await AWV.api("settings/delete-account", { method: "POST" });
        AWV.notify("Admin account deleted.", "success");
        window.setTimeout(() => {
            window.location.href = "../login/login.html";
        }, 700);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
});

initAdminSettings().catch((error) => AWV.notify(error.message, "error"));
