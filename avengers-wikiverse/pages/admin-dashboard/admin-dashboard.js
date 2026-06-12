async function initAdminDashboard() {
    try {
        const payload = await AWV.api("admin/stats");
        const { user, stats, notifications } = payload;

        AWV.hydrateShell(user, notifications);
        AWV.ensureAdminTopbar(user, notifications);

        document.querySelector(".admin-profile h4").textContent = user.name;
        document.querySelector(".admin-profile small").textContent = "Admin";

        const cards = document.querySelectorAll(".stat-card");
        const values = [
            [stats.heroes, "Total Heroes", stats.heroes_growth],
            [stats.movies, "Total Movies", stats.movies_growth],
            [stats.posts, "Total Post", stats.posts_growth],
            [stats.users, "Total Users", stats.users_growth]
        ];

        cards.forEach((card, index) => {
            card.querySelector("h2").textContent = formatCount(values[index][0]);
            card.querySelector("p").textContent = values[index][1];
            const growth = values[index][2] || 0;
            const growthEl = card.querySelector(".stat-growth");
            if (growthEl) {
                growthEl.textContent = `↑ +${growth} this week`;
            }
        });

        const heroPayload = await AWV.api("admin/heroes");
        renderHeroes(heroPayload.heroes || []);

        const search = document.querySelector(".hero-search");
        search.addEventListener("input", debounce(async () => {
            const filtered = await AWV.api("admin/heroes", {
                params: { search: search.value.trim() }
            });
            renderHeroes(filtered.heroes || []);
        }, 250));
    } catch (error) {
        const isAuthError = error.status === 401
            || error.status === 403
            || /login first|account is not available|forbidden/i.test(error.message);

        if (isAuthError) {
            window.location.href = AWV.page("login/login.html");
            return;
        }

        AWV.notify(`Admin dashboard failed to load: ${error.message}`, "error");
    }
}

function renderHeroes(heroes) {
    const tbody = document.querySelector(".admin-table tbody");

    if (!heroes.length) {
        tbody.innerHTML = `<tr><td colspan="5">No heroes found.</td></tr>`;
        return;
    }

    tbody.innerHTML = heroes.slice(0, 5).map((hero) => {
        const rawPower = hero.powerScore ?? hero.power_level ?? hero.powerLevel ?? hero.power ?? 0;
        const power = Math.min(100, Math.max(0, Number(rawPower) || 0));
        const status = hero.status || "Active";

        return `
            <tr>
                <td>
                    <div class="hero-cell">
                        <img class="item-photo" src="${AWV.resolveMedia(hero.imageUrl)}" alt="${AWV.escapeHtml(hero.name)}">
                        <div>
                            <strong>${AWV.escapeHtml(hero.name)}</strong>
                            <small>${AWV.escapeHtml(hero.realName || "")}</small>
                        </div>
                    </div>
                </td>
                <td><span class="affiliation-chip">${AWV.escapeHtml(hero.team || hero.category || "S.H.I.E.L.D.")}</span></td>
                <td>
                    <div class="power-cell">
                        <span><i style="width:${power}%"></i></span>
                        <strong>${power}</strong>
                    </div>
                </td>
                <td><span class="status-dot ${status.toLowerCase() === "inactive" ? "inactive" : ""}">${AWV.escapeHtml(status)}</span></td>
                <td>
                    <div class="action-cell">
                        <a class="edit-btn" href="../admin-add-hero/admin-add-hero.html?id=${hero.id}">Edit</a>
                        <button class="delete-btn" type="button" data-id="${hero.id}" data-name="${AWV.escapeHtml(hero.name)}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const confirmed = await AWV.confirm(`Delete hero profile "${button.dataset.name}"?`, {
                title: "Delete Hero",
                type: "danger",
                confirmText: "Delete"
            });

            if (!confirmed) return;
            await AWV.api("admin/heroes/delete", { body: { id: button.dataset.id } });
            AWV.notify("Hero deleted.", "success");
            const payload = await AWV.api("admin/heroes");
            renderHeroes(payload.heroes || []);
        });
    });
}

function formatCount(value) {
    const number = Number(value || 0);
    if (number >= 1000) {
        return `${(number / 1000).toFixed(number >= 10000 ? 1 : 0).replace(".", ",")}K`;
    }
    return String(number);
}

function debounce(callback, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

initAdminDashboard();
