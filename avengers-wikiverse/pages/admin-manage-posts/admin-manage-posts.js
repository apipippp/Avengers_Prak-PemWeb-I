async function initManagePosts() {
    const user = await AWV.requireAuth("admin");
    if (!user) return;

    AWV.hydrateShell(user);
    AWV.ensureAdminTopbar(user);
    document.querySelector(".page-header input").addEventListener("input", debounce(loadPosts, 250));
    await loadPosts();
}

async function loadPosts() {
    try {
        const payload = await AWV.api("admin/posts", {
            params: { search: document.querySelector(".page-header input").value.trim() }
        });
        renderPosts(payload.posts);
    } catch (error) {
        AWV.notify(error.message, "error");
    }
}

function renderPosts(posts) {
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = posts.map((post) => `
        <tr>
            <td data-label="Author">${AWV.escapeHtml(post.author)}</td>
            <td data-label="Title">${AWV.escapeHtml(post.title)}</td>
            <td data-label="Category">${AWV.escapeHtml(post.category)}</td>
            <td data-label="Date">${AWV.relativeTime(post.createdAt)}</td>
            <td data-label="Actions">
                <div class="action-cell">
                    <button class="view-btn" data-body="${AWV.escapeHtml(post.body)}">View</button>
                    <button class="delete-btn" data-id="${post.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".view-btn").forEach((button) => {
        button.addEventListener("click", () => {
            AWV.confirm(button.dataset.body, {
                title: "Post Detail",
                type: "info",
                confirmText: "Close",
                cancelText: "Back"
            });
        });
    });

    tbody.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const confirmed = await AWV.confirm("Delete this post?", {
                title: "Delete Post",
                type: "danger",
                confirmText: "Delete"
            });

            if (!confirmed) return;
            await AWV.api("admin/posts/delete", { body: { id: button.dataset.id } });
            AWV.notify("Post deleted.", "success");
            loadPosts();
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

initManagePosts().catch((error) => AWV.notify(error.message, "error"));
