async function initMovieDetail() {
    const user = await AWV.requireAuth();
    if (!user) return;

    AWV.hydrateShell(user);

    const id = new URLSearchParams(window.location.search).get("id") || 1;
    const payload = await AWV.api("movies/detail", { params: { id } });
    renderMovie(payload.movie);
}

function renderMovie(movie) {
    document.querySelector(".poster").innerHTML = `<img class="media-img" src="${AWV.resolveMedia(movie.posterUrl, "assets/images/placeholders/movie.svg")}" alt="${AWV.escapeHtml(movie.title)}">`;
    document.querySelector(".phase").textContent = movie.phase.toUpperCase();
    document.querySelector(".movie-info h1").textContent = movie.title;

    const detailNodes = document.querySelectorAll(".movie-info p");
    detailNodes[0].textContent = `Release Year : ${movie.year}`;
    detailNodes[1].textContent = `Duration : ${movie.duration}`;
    detailNodes[2].textContent = `IMDb Rating : ${movie.rating} / 10`;
    detailNodes[3].textContent = `Director : ${movie.director}`;

    document.querySelector(".detail-card p").textContent = movie.synopsis;
    document.querySelector(".heroes").innerHTML = movie.castMembers
        .split(",")
        .map((name) => `<span>${AWV.escapeHtml(name.trim())}</span>`)
        .join("");
}

initMovieDetail().catch((error) => AWV.notify(error.message, "error"));
