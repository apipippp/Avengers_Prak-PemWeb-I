const movieImage = document.getElementById("movieImage");
const previewMovie = document.getElementById("previewMovie");
const form = document.querySelector(".movie-form");

let editId = null;

async function initAddMovie() {
    const user = await AWV.requireAuth("admin");
    if (user) {
        AWV.hydrateShell(user);
        AWV.ensureAdminTopbar(user);
    }

    const params = new URLSearchParams(window.location.search);
    editId = params.get("id");

    if (editId) {
        document.querySelector(".page-header h1").textContent = "Edit Movie Archive";
        const descNode = document.querySelector(".page-header p");
        if (descNode) {
            descNode.style.display = "block";
            descNode.style.fontSize = "16px";
            descNode.style.color = "#98a4c0";
            descNode.style.background = "none";
            descNode.style.padding = "4px 0";
            descNode.textContent = "Modify existing movie details and poster";
        }
        document.querySelector(".submit-btn").textContent = "Update Movie";

        try {
            const payload = await AWV.api("movies/detail", { params: { id: editId } });
            const movie = payload.movie;
            form.querySelector("input[name='title']").value = movie.title;
            form.querySelector("input[name='releaseDate']").value = movie.releaseDate;
            form.querySelector("input[name='duration']").value = movie.duration;
            form.querySelector("input[name='director']").value = movie.director;
            form.querySelector("textarea[name='castMembers']").value = movie.castMembers;
            form.querySelector("textarea[name='synopsis']").value = movie.synopsis;
            previewMovie.src = AWV.resolveMedia(movie.posterUrl, "assets/images/placeholders/movie.svg");
        } catch (error) {
            AWV.notify("Failed to load movie details: " + error.message, "error");
        }
    }
}

movieImage.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) previewMovie.src = URL.createObjectURL(file);
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    if (movieImage.files[0]) {
        formData.append("image", movieImage.files[0]);
    }

    if (editId) {
        formData.append("id", editId);
    }

    try {
        const action = editId ? "movies/update" : "movies/create";
        await AWV.api(action, { formData });
        AWV.notify(editId ? "Movie updated successfully." : "Movie added successfully.", "success");
        if (!editId) {
            form.reset();
            previewMovie.src = "../../assets/images/placeholders/movie.svg";
        }
    } catch (error) {
        AWV.notify(error.message, "error");
    }
});

initAddMovie().catch((error) => AWV.notify(error.message, "error"));
