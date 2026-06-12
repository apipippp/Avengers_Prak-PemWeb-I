async function initManageMovies() {
    const user = await AWV.requireAuth("admin");
    if (!user) return;

    AWV.hydrateShell(user);
    AWV.ensureAdminTopbar(user);

    document.querySelector(".page-header input").addEventListener("input", debounce(loadMovies, 250));
    await loadMovies();
}

async function loadMovies() {
    try {
        const payload = await AWV.api("admin/movies", {
            params: { search: document.querySelector(".page-header input").value.trim() }
        });
        renderMovies(payload.movies);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
}

function renderMovies(movies) {
    const tbody = document.querySelector("tbody");

    if (!movies.length) {
        tbody.innerHTML = `<tr><td colspan="6">No movies found.</td></tr>`;
        return;
    }

    tbody.innerHTML = movies.map((movie) => `
        <tr>
            <td data-label="Movie">
                <div class="movie-cell">
                    <img class="item-poster" src="${AWV.resolveMedia(movie.posterUrl, "assets/images/placeholders/movie.svg")}" alt="${AWV.escapeHtml(movie.title)}">
                    <strong>${AWV.escapeHtml(movie.title)}</strong>
                </div>
            </td>
            <td data-label="Phase">${AWV.escapeHtml(movie.phase)}</td>
            <td data-label="Release">${AWV.escapeHtml(movie.releaseDate)}</td>
            <td data-label="Director">${AWV.escapeHtml(movie.director)}</td>
            <td data-label="Rating">${AWV.escapeHtml(movie.rating)}</td>
            <td data-label="Actions">
                <div class="action-cell">
                    <a class="view-btn" href="../movie-detail/movie-detail.html?id=${movie.id}">View</a>
                    <a class="edit-btn" href="../admin-add-movie/admin-add-movie.html?id=${movie.id}">Edit</a>
                    <button class="delete-btn" type="button" data-id="${movie.id}" data-title="${AWV.escapeHtml(movie.title)}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const title = button.dataset.title;
            const confirmed = await AWV.confirm(`Delete movie "${title}"? This will also remove related favorites.`, {
                title: "Delete Movie",
                type: "danger",
                confirmText: "Delete"
            });

            if (!confirmed) return;

            try {
                await AWV.api("admin/movies/delete", { body: { id: button.dataset.id } });
                AWV.notify("Movie deleted.", "success");
                loadMovies();
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

initManageMovies().catch((error) => AWV.notify(error.message, "error"));
