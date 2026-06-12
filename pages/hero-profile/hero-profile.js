async function initHeroProfile() {
    const user = await AWV.requireAuth();
    if (!user) return;

    AWV.hydrateShell(user);

    const id = new URLSearchParams(window.location.search).get("id") || 1;
    const payload = await AWV.api("heroes/detail", { params: { id } });
    renderHero(payload.hero);
}

function renderHero(hero) {
    const powerLevel = Math.min(100, Math.max(0, Number(hero.powerScore) || 0));
    const section = document.querySelector(".hero-header");
    section.innerHTML = `
        <div class="hero-image hero-feature-image">
            <img class="media-img" src="${AWV.resolveMedia(hero.imageUrl)}" alt="${AWV.escapeHtml(hero.name)}">
        </div>

        <div class="hero-info hero-feature-info">
            <div class="hero-feature-top">
                <div class="hero-feature-badges">
                    <span class="hero-tag">${AWV.escapeHtml(hero.category)}</span>
                    <span class="update-chip">Hero File</span>
                </div>
                <span class="active-record">Active Record</span>
            </div>

            <h1>${AWV.escapeHtml(hero.name)}</h1>
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
        </div>
    `;

    document.querySelector(".stats-section")?.remove();

    document.querySelector(".profile-card p").textContent = hero.biography;
    const infoList = document.querySelector(".details-grid .profile-card ul");
    infoList.innerHTML = `
        <li><strong>Real Name:</strong> ${AWV.escapeHtml(hero.realName)}</li>
        <li><strong>Status:</strong> Active</li>
        <li><strong>Affiliation:</strong> ${AWV.escapeHtml(hero.team)}</li>
        <li><strong>Category:</strong> ${AWV.escapeHtml(hero.category)}</li>
    `;
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

initHeroProfile().catch((error) => AWV.notify(error.message, "error"));
