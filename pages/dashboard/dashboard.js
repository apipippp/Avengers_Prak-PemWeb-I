async function initDashboard() {
    try {
        const payload = await AWV.api("dashboard");
        const { user, stats, heroOfWeek, heroes, movies, posts, notifications } = payload;

        AWV.hydrateShell(user, notifications);

        document.querySelector(".welcome-card h1").textContent = `Welcome back, ${user.name}`;
        document.querySelector(".welcome-card p").textContent = `Login Time : ${new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })}`;

        const statCards = document.querySelectorAll(".stat-card");
        const values = [
            [stats.heroes, "Heroes Indexed", `+ ${stats.heroes} total profiles`],
            [stats.movies, "Movies / Missions", `+ ${stats.movies} archive entries`],
            [stats.posts, "Community Post", `+ ${stats.posts} room posts`],
            [stats.users, "Active Agents", `+ ${stats.users} registered agents`]
        ];
        statCards.forEach((card, index) => {
            card.querySelector("h3").textContent = formatStatNumber(values[index][0]);
            card.querySelector("p").textContent = values[index][1];
            card.querySelector("small").textContent = values[index][2];
        });

        renderHeroOfWeek(heroOfWeek);
        renderHeroes(heroes);
        renderCommunityPreview(posts);
        renderMovies(movies);
        wireSearch();
    } catch (error) {
        const isAuthError = error.status === 401
            || error.status === 403
            || /login first|account is not available|forbidden/i.test(error.message);

        if (isAuthError) {
            if (sessionStorage.getItem("awv_just_logged_in")) {
                sessionStorage.removeItem("awv_just_logged_in");
                window.setTimeout(initDashboard, 500);
                return;
            }

            window.location.href = AWV.page("login/login.html");
            return;
        }

        sessionStorage.setItem("awv_dashboard_error", error.message);
        showDashboardError(error.message);
    }
}

function formatStatNumber(value) {
    const number = Number(value) || 0;

    if (number >= 10000) {
        return `${(number / 1000).toFixed(1).replace(".", ",")}K`;
    }

    return number.toLocaleString("id-ID");
}

function showDashboardError(message) {
    const main = document.querySelector(".main-content");
    const box = document.createElement("section");
    box.className = "empty-state";
    box.style.marginBottom = "20px";
    box.textContent = `Dashboard data failed to load: ${message}`;
    main.prepend(box);
}

function renderHeroOfWeek(hero) {
    if (!hero) return;

    const section = document.querySelector(".hero-week");
    const powerLevel = Math.min(100, Math.max(0, Number(hero.powerScore) || 0));
    const updatedAt = hero.updatedAt ? AWV.relativeTime(hero.updatedAt) : "recently";
    section.innerHTML = `
        <div class="hero-image hero-feature-image">
            <img class="media-img" src="${AWV.resolveMedia(hero.imageUrl)}" alt="${AWV.escapeHtml(hero.name)}">
        </div>

        <div class="hero-info hero-feature-info">
            <div class="hero-feature-top">
                <div class="hero-feature-badges">
                    <span class="badge">Hero Of The Week</span>
                    <span class="update-chip">Updated ${AWV.escapeHtml(updatedAt)}</span>
                </div>
                <span class="active-record">Active Record</span>
            </div>

            <h2>${AWV.escapeHtml(hero.name).toUpperCase()}</h2>
            <div class="hero-identity">
                <span>${AWV.escapeHtml(hero.realName)}</span>
                <strong>${AWV.escapeHtml(hero.category)}</strong>
            </div>
            <p class="hero-affiliation">Affiliation: ${AWV.escapeHtml(hero.team)} / ${AWV.escapeHtml(hero.category)}</p>

            <div class="power-level">
                <div class="power-level-head">
                    <span>Power Level</span>
                    <strong>${powerLevel} / 100</strong>
                </div>
                <div class="power-level-track">
                    <span style="--power-level:${powerLevel}%"></span>
                </div>
            </div>

            <div class="hero-type-row">
                ${heroStatChips(hero)}
            </div>

            <div class="hero-tag-row">
                ${heroTypeChips(hero)}
            </div>

            <blockquote>"${AWV.escapeHtml(shortHeroQuote(hero))}"</blockquote>

            <div class="buttons">
                <a href="../hero-profile/hero-profile.html?id=${hero.id}" class="primary-btn">View Full Profile</a>
                <button class="secondary-btn" type="button">${hero.favorite ? "Favorited" : "Add To Favorites"}</button>
            </div>
        </div>
    `;

    const favoriteButton = section.querySelector(".secondary-btn");
    favoriteButton.classList.toggle("is-active", hero.favorite);
    favoriteButton.addEventListener("click", () => toggleFavorite("hero", hero.id, favoriteButton));
}

function heroStatChips(hero) {
    const chips = [
        ["Combat", hero.combatScore, "stat-red"],
        ["Intelligence", hero.intelligenceScore, "stat-blue"],
        ["Power", hero.powerScore, "stat-gold"],
        ["Speed", hero.speedScore, "stat-green"]
    ];

    return chips.map(([label, score, tone]) => (
        `<span class="metric-chip ${tone}">${AWV.escapeHtml(label)} ${Math.min(100, Math.max(0, Number(score) || 0))}</span>`
    )).join("");
}

function heroTypeChips(hero) {
    return (hero.powerTags || []).slice(0, 4).map((tag, index) => (
        `<span class="type-chip type-${index % 4}">${AWV.escapeHtml(tag)}</span>`
    )).join("");
}

function shortHeroQuote(hero) {
    const firstSentence = String(hero.biography || hero.powers || "").split(".")[0].trim();
    return firstSentence || `I am ${hero.name}.`;
}

function renderHeroes(heroes) {
    ensureDashboardMiddle();
    const grid = document.querySelector(".hero-grid");
    grid.innerHTML = heroes.slice(0, 4).map((hero) => `
        <div class="hero-card">
            <div class="hero-photo">
                <img class="media-img" src="${AWV.resolveMedia(hero.imageUrl)}" alt="${AWV.escapeHtml(hero.name)}">
                <span class="card-type">${AWV.escapeHtml(hero.category)}</span>
            </div>
            <h3>${AWV.escapeHtml(hero.name)}</h3>
            <small>${AWV.escapeHtml(hero.realName)} · ${AWV.escapeHtml(hero.team)}</small>
            <div class="card-tags">
                ${heroTypeChips(hero)}
            </div>
            <div class="card-metrics">
                ${heroStatChips(hero)}
            </div>
            <button class="fav-btn ${hero.favorite ? "is-active" : ""}" data-type="hero" data-id="${hero.id}">
                ${hero.favorite ? "Favorited" : "Favorite"}
            </button>
            <a href="../hero-profile/hero-profile.html?id=${hero.id}">View Profile</a>
        </div>
    `).join("");

    grid.querySelectorAll(".fav-btn").forEach((button) => {
        button.addEventListener("click", () => toggleFavorite(button.dataset.type, button.dataset.id, button));
    });
}

function renderMovies(movies) {
    const grid = document.querySelector(".movie-grid");
    grid.innerHTML = movies.slice(0, 3).map((movie) => `
        <article class="movie-card">
            <div class="movie-poster">
                <img class="media-img" src="${AWV.resolveMedia(movie.posterUrl, "assets/images/placeholders/movie.svg")}" alt="${AWV.escapeHtml(movie.title)}">
            </div>
            <div class="movie-info-card">
                <div class="movie-meta">
                    <span class="phase-pill">${AWV.escapeHtml(movie.phase)}</span>
                    <span>${movie.year}</span>
                </div>
                <h3>${AWV.escapeHtml(movie.title)}</h3>
                <p>${AWV.escapeHtml(shortText(movie.synopsis, 92))}</p>
                <div class="movie-foot">
                    <span class="rating-star">★</span>
                    <strong>${AWV.escapeHtml(movie.rating || "N/A")}</strong>
                    <button class="movie-fav-btn ${movie.favorite ? "is-active" : ""}" data-type="movie" data-id="${movie.id}" type="button">
                        ${movie.favorite ? "Favorited" : "Favorite"}
                    </button>
                    <a href="../movie-detail/movie-detail.html?id=${movie.id}">Detail</a>
                </div>
            </div>
        </article>
    `).join("");

    grid.querySelectorAll(".movie-fav-btn").forEach((button) => {
        button.addEventListener("click", () => toggleFavorite(button.dataset.type, button.dataset.id, button));
    });
}

function renderCommunityPreview(posts) {
    ensureDashboardMiddle();
    const feed = document.querySelector(".community-feed");
    feed.innerHTML = `
        <div class="feed-header">
            <h2>🔥 Community Feed</h2>
            <span></span>
        </div>
        <div class="feed-list">
            ${posts.slice(0, 5).map((post, index) => `
                <article class="feed-card">
                    <div class="feed-avatar">${AWV.escapeHtml((post.author || post.agentId || "A").slice(0, 1).toUpperCase())}</div>
                    <div class="feed-body">
                        <div class="feed-top">
                            <strong>${AWV.escapeHtml(post.agentId || post.author)}</strong>
                            <small>${index + 2}h ago</small>
                        </div>
                        <p>${AWV.escapeHtml(shortText(post.body, 96))}</p>
                        <div class="feed-actions">
                            <span>♥ ${formatCompact(post.likes)}</span>
                            <span>☁ ${formatCompact(post.comments)}</span>
                            <span>↗</span>
                        </div>
                    </div>
                </article>
            `).join("") || `<div class="empty-state">No popular posts yet.</div>`}
        </div>
        <a class="feed-link" href="../community-room/community-room.html">View All Community Posts →</a>
    `;
}

function ensureDashboardMiddle() {
    const heroSection = document.querySelector(".hero-grid")?.closest(".section");
    if (!heroSection || heroSection.closest(".dashboard-middle")) {
        return;
    }

    heroSection.classList.add("recent-heroes-section");
    const wrapper = document.createElement("section");
    wrapper.className = "dashboard-middle";
    heroSection.parentNode.insertBefore(wrapper, heroSection);
    wrapper.appendChild(heroSection);

    const feed = document.createElement("aside");
    feed.className = "community-feed";
    wrapper.appendChild(feed);
}

function wireSearch() {
    const input = document.querySelector(".search-box input");
    input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        const query = encodeURIComponent(input.value.trim());
        window.location.href = `../heroes-wiki/heroes-wiki.html?search=${query}`;
    });
}

function goProfile() {
    window.location.href = "../my-profile/my-profile.html";
}

function shortText(value, limit) {
    const text = String(value || "").trim();
    return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function formatCompact(value) {
    const number = Number(value) || 0;
    if (number >= 1000) return `${(number / 1000).toFixed(1).replace(".", ",")}K`;
    return number.toLocaleString("id-ID");
}

async function toggleFavorite(type, id, button) {
    try {
        const payload = await AWV.api("favorites/toggle", { body: { type, id } });
        button.textContent = payload.favorite ? "Favorited" : (type === "hero" && button.classList.contains("secondary-btn") ? "Add To Favorites" : "Favorite");
        button.classList.toggle("is-active", payload.favorite);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
}

initDashboard();
