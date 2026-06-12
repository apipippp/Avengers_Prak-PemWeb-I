let activeCategory = "All Posts";

async function initCommunityRoom() {
    const user = await AWV.requireAuth();
    if (!user) return;

    AWV.hydrateShell(user);
    setupCreatePost();
    setupFilters();
    document.querySelector(".topbar input").addEventListener("input", debounce(loadPosts, 250));
    await loadPosts();
}

function setupCreatePost() {
    const createButton = document.querySelector(".create-post-btn");
    const form = document.querySelector(".create-post");

    createButton.addEventListener("click", () => {
        form.classList.toggle("is-hidden");
        createButton.textContent = form.classList.contains("is-hidden") ? "+ Create Post" : "Close";
    });

    form.querySelector("button").addEventListener("click", async () => {
        const title = document.getElementById("postTitle").value.trim();
        const body = document.getElementById("postBody").value.trim();
        const category = document.getElementById("postCategory").value;

        if (!title || !body) {
            AWV.notify("Please fill title and post body.", "warning");
            return;
        }

        try {
            await AWV.api("posts/create", { body: { title, body, category } });
            document.getElementById("postTitle").value = "";
            document.getElementById("postBody").value = "";
            form.classList.add("is-hidden");
            createButton.textContent = "+ Create Post";
            await loadPosts();
        } catch (error) {
            AWV.notify(error.message, "error");
        }
    });
}

function setupFilters() {
    document.querySelectorAll(".filters button").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".filters button").forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            activeCategory = button.textContent.trim();
            loadPosts();
        });
    });
}

async function loadPosts() {
    try {
        const payload = await AWV.api("posts", {
            params: {
                search: document.querySelector(".topbar input").value.trim(),
                category: activeCategory,
                sort: activeCategory === "All Posts" ? "popular" : "latest"
            }
        });
        renderPosts(payload.posts);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
}

function renderPosts(posts) {
    const container = document.querySelector(".posts");

    if (!posts.length) {
        container.innerHTML = `<div class="empty-state">No community posts yet.</div>`;
        return;
    }

    container.innerHTML = posts.map((post) => `
        <article class="post-card">
            <div class="post-header">
                <div class="user-info">
                    <div class="navbar-avatar">
                        <img src="${AWV.resolveMedia(post.avatarUrl, "assets/images/user-profile/profile-default.png")}" alt="Profile">
                    </div>
                    <div>
                        <h4>${AWV.escapeHtml(post.author)}</h4>
                        <small>${AWV.relativeTime(post.createdAt)} · ${AWV.escapeHtml(post.category)}</small>
                    </div>
                </div>
            </div>
            <h3>${AWV.escapeHtml(post.title)}</h3>
            <p>${AWV.escapeHtml(post.body)}</p>
            <div class="post-actions">
                <button class="like-btn ${post.liked ? "is-active" : ""}" data-id="${post.id}">👍 ${post.likes}</button>
                <button type="button">💬 ${post.comments}</button>
            </div>
        </article>
    `).join("");

    container.querySelectorAll(".like-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const payload = await AWV.api("posts/like", {
                body: { id: button.dataset.id }
            });
            button.textContent = `👍 ${payload.likes}`;
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

function goProfile() {
    window.location.href = "../my-profile/my-profile.html";
}

initCommunityRoom().catch((error) => AWV.notify(error.message, "error"));
