let activePhase = "All";
let favoriteOnly = false;

async function initMovieArchive() {
    const user = await AWV.requireAuth();
    if (!user) return;

    AWV.hydrateShell(user);
    setupFilters();
    document.querySelector(".topbar input").addEventListener("input", debounce(loadMovies, 250));
    await loadMovies();
}

function setupFilters() {
    const filters = document.querySelector(".filters");
    const favoriteLabel = document.createElement("label");
    favoriteLabel.className = "inline-filter";
    favoriteLabel.innerHTML = `<input type="checkbox" id="favoriteOnly"> Favorites`;
    filters.appendChild(favoriteLabel);

    filters.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
            filters.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            activePhase = button.textContent.trim();
            loadMovies();
        });
    });

    document.getElementById("favoriteOnly").addEventListener("change", (event) => {
        favoriteOnly = event.target.checked;
        loadMovies();
    });
}

async function loadMovies() {
    try {
        const payload = await AWV.api("movies", {
            params: {
                search: document.querySelector(".topbar input").value.trim(),
                phase: activePhase,
                favorite: favoriteOnly ? "1" : "0"
            }
        });
        renderMovies(payload.movies);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
}

function renderMovies(movies) {
    const grid = document.querySelector(".movie-grid");
    document.querySelector(".movie-count").textContent = `${movies.length} Movies Archived`;

    if (!movies.length) {
        grid.innerHTML = `<div class="empty-state">No movies match this filter.</div>`;
        return;
    }

    grid.innerHTML = movies.map((movie) => `
        <div class="movie-card">
            <div class="movie-poster">
                <img class="media-img" src="${AWV.resolveMedia(movie.posterUrl, "assets/images/placeholders/movie.svg")}" alt="${AWV.escapeHtml(movie.title)}">
            </div>
            <h3>${AWV.escapeHtml(movie.title)}</h3>
            <small>${movie.year}</small>
            <p>${AWV.escapeHtml(movie.phase)}</p>
            <button class="fav-btn ${movie.favorite ? "is-active" : ""}" data-id="${movie.id}">
                ${movie.favorite ? "Favorited" : "Favorite"}
            </button>
            <a href="../movie-detail/movie-detail.html?id=${movie.id}">View Detail</a>
        </div>
    `).join("");

    grid.querySelectorAll(".fav-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const payload = await AWV.api("favorites/toggle", {
                body: { type: "movie", id: button.dataset.id }
            });
            button.classList.toggle("is-active", payload.favorite);
            button.textContent = payload.favorite ? "Favorited" : "Favorite";
            if (favoriteOnly && !payload.favorite) loadMovies();
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

initMovieArchive().catch((error) => AWV.notify(error.message, "error"));
