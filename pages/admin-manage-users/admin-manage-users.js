async function initManageUsers() {
    const user = await AWV.requireAuth("admin");
    if (!user) return;

    AWV.hydrateShell(user);
    AWV.ensureAdminTopbar(user);
    const search = document.querySelector(".page-header input");
    search.addEventListener("input", debounce(loadUsers, 250));
    await loadUsers();
}

async function loadUsers() {
    try {
        const payload = await AWV.api("admin/users", {
            params: { search: document.querySelector(".page-header input").value.trim() }
        });
        renderUsers(payload.users);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
}

function renderUsers(users) {
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = users.map((user) => `
        <tr>
            <td data-label="User">
                <div class="user-cell">
                    <img src="${AWV.resolveMedia(user.avatar_url, "assets/images/user-profile/profile-default.png")}" class="user-photo" alt="Profile">
                    <div>
                        <strong>${AWV.escapeHtml(`${user.first_name} ${user.last_name}`)}</strong>
                        <small>${AWV.escapeHtml(user.email)}</small>
                    </div>
                </div>
            </td>
            <td data-label="Username">@${AWV.escapeHtml(user.agent_id)}</td>
            <td data-label="Role"><span class="role ${user.role}">${AWV.escapeHtml(user.role === "admin" ? "Admin" : "Fan User")}</span></td>
            <td data-label="Joined">${AWV.escapeHtml(user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-")}</td>
            <td data-label="Posts"><span class="posts-count">${Number(user.posts_count || user.posts || 0)}</span></td>
            <td data-label="Actions">
                <div class="action-cell">
                    ${user.role === "user" ? `<button class="${Number(user.banned) ? "unban-btn" : "ban-btn"}" data-id="${user.id}" data-banned="${Number(user.banned) ? 0 : 1}">${Number(user.banned) ? "Unban" : "Ban"}</button>` : ""}
                    <button class="delete-btn" data-id="${user.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".ban-btn, .unban-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const willBan = Number(button.dataset.banned) === 1;
            const confirmed = await AWV.confirm(
                willBan
                    ? "Ban this user? They will not be able to login until unbanned."
                    : "Unban this user and restore their login access?",
                {
                    title: willBan ? "Ban User" : "Unban User",
                    type: willBan ? "danger" : "warning",
                    confirmText: willBan ? "Ban User" : "Unban User"
                }
            );

            if (!confirmed) return;

            await AWV.api("admin/users/status", {
                body: { id: button.dataset.id, banned: Number(button.dataset.banned) }
            });
            AWV.notify(willBan ? "User has been banned." : "User has been unbanned.", "success");
            loadUsers();
        });
    });

    tbody.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const confirmed = await AWV.confirm("Delete this account?", {
                title: "Delete Account",
                type: "danger",
                confirmText: "Delete"
            });

            if (!confirmed) return;
            await AWV.api("admin/users/delete", { body: { id: button.dataset.id } });
            AWV.notify("Account deleted.", "success");
            loadUsers();
        });
    });
}

function debounce(callback, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

initManageUsers().catch((error) => AWV.notify(error.message, "error"));
