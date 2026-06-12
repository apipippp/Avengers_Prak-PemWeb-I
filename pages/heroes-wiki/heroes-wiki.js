let activeCategory = "All Heroes";
let favoriteOnly = false;

async function initHeroesWiki() {
    const user = await AWV.requireAuth();
    if (!user) return;

    AWV.hydrateShell(user);
    setupFilters();

    const query = new URLSearchParams(window.location.search);
    const input = document.querySelector(".topbar input");
    input.value = query.get("search") || "";
    input.addEventListener("input", debounce(loadHeroes, 250));

    await loadHeroes();
}

function setupFilters() {
    const filters = document.querySelector(".filters");
    const favoriteLabel = document.createElement("label");
    favoriteLabel.className = "inline-filter";
    favoriteLabel.innerHTML = `<input type="checkbox" id="favoriteOnly"> Favorites`;
    filters.insertAdjacentHTML("afterbegin", `<span class="filter-label">Filter:</span>`);
    filters.appendChild(favoriteLabel);

    filters.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
            filters.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            activeCategory = button.textContent.trim();
            loadHeroes();
        });
    });

    document.getElementById("favoriteOnly").addEventListener("change", (event) => {
        favoriteOnly = event.target.checked;
        loadHeroes();
    });
}

async function loadHeroes() {
    try {
        const input = document.querySelector(".topbar input");
        const payload = await AWV.api("heroes", {
            params: {
                search: input.value.trim(),
                category: activeCategory,
                favorite: favoriteOnly ? "1" : "0"
            }
        });

        renderHeroes(payload.heroes);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
}

function renderHeroes(heroes) {
    const grid = document.querySelector(".hero-grid");
    const count = document.querySelector(".hero-count");
    count.textContent = `${heroes.length} Heroes Found`;

    if (!heroes.length) {
        grid.innerHTML = `<div class="empty-state">No heroes match this filter.</div>`;
        return;
    }

    grid.innerHTML = heroes.map((hero) => `
        <div class="hero-card">
            <div class="hero-image">
                <img class="media-img" src="${AWV.resolveMedia(hero.imageUrl)}" alt="${AWV.escapeHtml(hero.name)}">
                <span class="card-type">${AWV.escapeHtml(hero.category)}</span>
                <button class="fav-btn ${hero.favorite ? "is-active" : ""}" data-id="${hero.id}" type="button" aria-label="Favorite">
                    ${hero.favorite ? "★" : "☆"}
                </button>
            </div>
            <h3>${AWV.escapeHtml(hero.name)}</h3>
            <small>${AWV.escapeHtml(hero.realName)}</small>
            <div class="card-tags">
                ${heroTypeChips(hero)}
            </div>
            <a href="../hero-profile/hero-profile.html?id=${hero.id}" class="view-btn">View Profile</a>
        </div>
    `).join("");

    grid.querySelectorAll(".fav-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const payload = await AWV.api("favorites/toggle", {
                body: { type: "hero", id: button.dataset.id }
            });
            button.classList.toggle("is-active", payload.favorite);
            button.textContent = payload.favorite ? "★" : "☆";
            if (favoriteOnly && !payload.favorite) loadHeroes();
        });
    });
}

function heroTypeChips(hero) {
    return (hero.powerTags || []).slice(0, 2).map((tag, index) => (
        `<span class="type-chip type-${index % 4}">${AWV.escapeHtml(tag)}</span>`
    )).join("");
}

function debounce(callback, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

function goProfile() {
    window.location.href = "../my-profile/my-profile.html";
}

initHeroesWiki().catch((error) => AWV.notify(error.message, "error"));
