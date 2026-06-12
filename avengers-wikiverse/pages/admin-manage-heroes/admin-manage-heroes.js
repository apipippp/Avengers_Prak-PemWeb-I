async function initManageHeroes() {
    const user = await AWV.requireAuth("admin");
    if (!user) return;

    AWV.hydrateShell(user);
    AWV.ensureAdminTopbar(user);

    document.querySelector(".page-header input").addEventListener("input", debounce(loadHeroes, 250));
    await loadHeroes();
}

async function loadHeroes() {
    try {
        const payload = await AWV.api("admin/heroes", {
            params: { search: document.querySelector(".page-header input").value.trim() }
        });
        renderHeroes(payload.heroes);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
}

function renderHeroes(heroes) {
    const tbody = document.querySelector("tbody");

    if (!heroes.length) {
        tbody.innerHTML = `<tr><td colspan="6">No heroes found.</td></tr>`;
        return;
    }

    tbody.innerHTML = heroes.map((hero) => `
        <tr>
            <td data-label="Hero">
                <div class="hero-cell">
                    <img class="item-photo" src="${AWV.resolveMedia(hero.imageUrl)}" alt="${AWV.escapeHtml(hero.name)}">
                    <strong>${AWV.escapeHtml(hero.name)}</strong>
                </div>
            </td>
            <td data-label="Real Name">${AWV.escapeHtml(hero.realName)}</td>
            <td data-label="Team">${AWV.escapeHtml(hero.team)}</td>
            <td data-label="Category">${AWV.escapeHtml(hero.category)}</td>
            <td data-label="Updated">${AWV.relativeTime(hero.updatedAt)}</td>
            <td data-label="Actions">
                <div class="action-cell">
                    <a class="view-btn" href="../hero-profile/hero-profile.html?id=${hero.id}">View</a>
                    <a class="edit-btn" href="../admin-add-hero/admin-add-hero.html?id=${hero.id}">Edit</a>
                    <button class="delete-btn" type="button" data-id="${hero.id}" data-name="${AWV.escapeHtml(hero.name)}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const name = button.dataset.name;
            const confirmed = await AWV.confirm(`Delete hero profile "${name}"? This will also remove related favorites.`, {
                title: "Delete Hero",
                type: "danger",
                confirmText: "Delete"
            });

            if (!confirmed) return;

            try {
                await AWV.api("admin/heroes/delete", { body: { id: button.dataset.id } });
                AWV.notify("Hero deleted.", "success");
                loadHeroes();
            } catch (error) {
                AWV.notify(error.message, "error");
            }
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

initManageHeroes().catch((error) => AWV.notify(error.message, "error"));
