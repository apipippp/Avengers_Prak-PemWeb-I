const AWV = (() => {
    const path = window.location.pathname.replace(/\\/g, "/");
    const root = path.includes("/pages/")
        ? path.slice(0, path.indexOf("/pages/"))
        : path.slice(0, path.lastIndexOf("/"));
    const apiUrl = `${root}/api/index.php`;
    const rootUrl = root || "";

    const page = (relativePath) => `${rootUrl}/pages/${relativePath}`;
    const asset = (relativePath) => `${rootUrl}/${relativePath.replace(/^\/+/, "")}`;
    installUi();

    async function api(action, options = {}) {
        const method = options.method || "GET";
        const init = { method, credentials: "include" };
        let url = `${apiUrl}?action=${encodeURIComponent(action)}`;

        if (options.params) {
            const query = new URLSearchParams(options.params);
            url += `&${query.toString()}`;
        }

        if (options.formData) {
            init.method = "POST";
            init.body = options.formData;
        } else if (options.body) {
            init.method = method === "GET" ? "POST" : method;
            init.headers = { "Content-Type": "application/json" };
            init.body = JSON.stringify(options.body);
        }

        let response;

        try {
            response = await fetch(url, init);
        } catch (error) {
            const apiError = new Error(`Cannot reach backend API. Open this project through http://localhost, not file://. Detail: ${error.message}`);
            apiError.status = 0;
            throw apiError;
        }

        const responseText = await response.text();
        let payload;

        try {
            payload = responseText ? JSON.parse(responseText) : {};
        } catch (_error) {
            const apiError = new Error(`Invalid server response (${response.status}). ${responseText.slice(0, 180)}`);
            apiError.status = response.status;
            throw apiError;
        }

        if (!response.ok || payload.ok === false) {
            const apiError = new Error(payload.message || `Request failed with status ${response.status}.`);
            apiError.status = response.status;
            throw apiError;
        }

        return payload;
    }

    async function me() {
        const payload = await api("auth/me");
        return payload.user;
    }

    async function requireAuth(role) {
        const user = await me();

        if (!user) {
            window.location.href = page("login/login.html");
            return null;
        }

        if (role && user.role !== role) {
            window.location.href = user.role === "admin"
                ? page("admin-dashboard/admin-dashboard.html")
                : page("dashboard/dashboard.html");
            return null;
        }

        return user;
    }

    function dashboardFor(user) {
        return user?.role === "admin"
            ? page("admin-dashboard/admin-dashboard.html")
            : page("dashboard/dashboard.html");
    }

    async function logout() {
        const confirmed = await confirmDialog("Are you sure you want to logout from Avengers WikiVerse?", {
            title: "Logout",
            type: "warning",
            confirmText: "Logout",
            cancelText: "Stay"
        });

        if (!confirmed) {
            return;
        }

        try {
            await api("auth/logout", { method: "POST" });
            notify("You have been logged out.", "success");
        } finally {
            localStorage.removeItem("currentUser");
            window.setTimeout(() => {
                window.location.href = page("login/login.html");
            }, 500);
        }
    }

    function resolveMedia(url, fallback = "assets/images/placeholders/hero.svg") {
        if (!url) {
            return asset(fallback);
        }

        if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) {
            return url;
        }

        return asset(url);
    }

    function wireLogo(user) {
        document.querySelectorAll(".sidebar-logo, .logo").forEach((logo) => {
            logo.addEventListener("click", (event) => {
                event.preventDefault();
                window.location.href = dashboardFor(user);
            });
        });
    }

    function renderNotifications(user, notifications = []) {
        document.querySelectorAll(".notification").forEach((notification) => {
            notification.classList.toggle("is-muted", Boolean(user?.muteNotifications));

            const dropdown = notification.querySelector(".notification-dropdown, .notif-dropdown, .dropdown");
            if (!dropdown) {
                return;
            }

            if (user?.muteNotifications) {
                dropdown.innerHTML = notificationPanelHtml([], "Notifications muted");
                bindNotificationToggle(notification, user);
                return;
            }

            dropdown.innerHTML = notificationPanelHtml(notifications);
            const count = notification.querySelector(".notification-count, .notif-count");
            if (count) {
                count.textContent = String(notifications.length);
                count.hidden = notifications.length === 0;
            }
            bindNotificationToggle(notification, user);
        });
    }

    function notificationPanelHtml(notifications, emptyText = "No notifications yet") {
        const items = Array.isArray(notifications) ? notifications : [];
        const body = items.length
            ? items.map((item) => `
                <div class="notif-item">
                    <span class="notif-dot"></span>
                    <div>
                        <strong>${escapeHtml(item.message)}</strong>
                        <small>${escapeHtml(item.createdAt ? relativeTime(item.createdAt) : "just now")}</small>
                    </div>
                </div>
            `).join("")
            : `<div class="notif-empty">${escapeHtml(emptyText)}</div>`;

        return `
            <div class="notif-panel-head">
                <strong>Notifications</strong>
                <small>Database synced</small>
            </div>
            <div class="notif-panel-list">${body}</div>
        `;
    }

    function bindNotificationToggle(notification, user) {
        if (notification.dataset.awvNotificationBound) {
            return;
        }

        notification.dataset.awvNotificationBound = "1";
        notification.addEventListener("click", async (event) => {
            event.stopPropagation();
            const shouldOpen = !notification.classList.contains("is-open");
            document.querySelectorAll(".notification.is-open").forEach((node) => {
                if (node !== notification) node.classList.remove("is-open");
            });

            if (!shouldOpen) {
                notification.classList.remove("is-open");
                return;
            }

            notification.classList.add("is-open");

            if (!user?.muteNotifications) {
                try {
                    const payload = await api("notifications");
                    renderNotifications(payload.user || user, payload.notifications || []);
                    notification.classList.add("is-open");
                } catch (_error) {
                    const dropdown = notification.querySelector(".notification-dropdown, .notif-dropdown, .dropdown");
                    if (dropdown) {
                        dropdown.innerHTML = notificationPanelHtml([], "Could not load notifications");
                    }
                }
            }
        });

        if (!document.body.dataset.awvNotificationCloseBound) {
            document.body.dataset.awvNotificationCloseBound = "1";
            document.addEventListener("click", () => {
                document.querySelectorAll(".notification.is-open").forEach((node) => node.classList.remove("is-open"));
            });
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    document.querySelectorAll(".notification.is-open").forEach((node) => node.classList.remove("is-open"));
                }
            });
        }
    }

    function hydrateShell(user, notifications = []) {
        if (!user) {
            return;
        }

        const hasTopbar = Boolean(document.querySelector(".topbar"));

        if (user.role === "admin") {
            syncAdminNav();
            document.documentElement.classList.add("awv-shell-root");
            document.body.classList.add("awv-admin-shell");
            document.body.classList.remove("awv-user-shell");
            document.body.classList.toggle("awv-no-topbar", !hasTopbar);
            enhanceAdminSidebar(user);
        } else {
            syncUserNav();
            enhanceUserShell(user);
            document.documentElement.classList.add("awv-shell-root");
            document.body.classList.add("awv-user-shell");
            document.body.classList.remove("awv-admin-shell");
            document.body.classList.toggle("awv-no-topbar", !hasTopbar);
        }

        wireLogo(user);
        renderNotifications(user, notifications);

        document.querySelectorAll(".profile h4").forEach((node) => {
            node.textContent = user.name;
        });
        document.querySelectorAll(".profile span, .profile > div:last-child").forEach((node) => {
            if (!node.querySelector("h4")) {
                node.textContent = user.name;
            }
        });
        document.querySelectorAll(".profile small").forEach((node) => {
            node.textContent = user.role === "admin" ? "Super Admin" : "Fan User";
        });
        document.querySelectorAll(".navbar-avatar img, .avatar img").forEach((img) => {
            img.src = resolveMedia(user.avatarUrl, "assets/images/user-profile/profile-default.png");
        });
        document.querySelectorAll(".logout-btn").forEach((button) => {
            if (!button.dataset.awvLogoutBound) {
                button.dataset.awvLogoutBound = "1";
                button.addEventListener("click", logout);
            }
        });
        document.querySelectorAll(".profile").forEach((profile) => {
            if (!profile.dataset.awvProfileBound) {
                profile.dataset.awvProfileBound = "1";
                profile.addEventListener("click", () => {
                    window.location.href = user.role === "admin"
                        ? page("admin-settings/admin-settings.html")
                        : page("my-profile/my-profile.html");
                });
            }
        });
    }

    function ensureAdminTopbar(user, notifications = []) {
        const topbar = document.querySelector(".topbar");
        if (!topbar) {
            return;
        }

        topbar.classList.add("admin-topbar");

        const input = topbar.querySelector("input[type='text'], input:not([type])");
        if (input && !input.closest(".admin-search")) {
            const wrapper = document.createElement("div");
            wrapper.className = "admin-search";
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            wrapper.insertAdjacentHTML("afterbegin", `<span>⌕</span>`);
        }

        topbar.querySelectorAll(":scope > .admin-profile").forEach((profile) => profile.remove());

        if (topbar.querySelector(".admin-actions")) {
            hydrateShell(user, notifications);
            return;
        }

        const actions = document.createElement("div");
        actions.className = "admin-actions";
        const initials = `${user.firstName?.[0] || user.name?.[0] || "A"}${user.lastName?.[0] || ""}`.toUpperCase();
        actions.innerHTML = `
            <div class="notification admin-notification" role="button" tabindex="0" aria-label="Open notifications">
                <span class="notification-icon"></span>
                <span class="notification-count">${notifications.length}</span>
                <div class="notif-dropdown"></div>
            </div>
            <div class="admin-profile" role="button" tabindex="0">
                <div class="admin-profile-avatar">${escapeHtml(initials)}</div>
                <div>
                    <h4>${escapeHtml(user.name || "Admin")}</h4>
                    <small>Admin</small>
                </div>
            </div>
            <button class="logout-btn" type="button"><span class="logout-icon">↪</span><span>Logout</span></button>
        `;
        topbar.appendChild(actions);
        hydrateShell(user, notifications);
    }

    function syncAdminNav() {
        const nav = document.querySelector(".sidebar nav");
        if (!nav || !window.location.pathname.includes("/pages/admin-")) {
            return;
        }

        const currentPath = window.location.pathname.replace(/\\/g, "/");
        const items = [
            ["Dashboard", "admin-dashboard/admin-dashboard.html", "Dash"],
            ["Manage Heroes", "admin-manage-heroes/admin-manage-heroes.html", "Heroes"],
            ["Manage Movies", "admin-manage-movies/admin-manage-movies.html", "Movies"],
            ["Manage Posts", "admin-manage-posts/admin-manage-posts.html", "Posts"],
            ["Manage Users", "admin-manage-users/admin-manage-users.html", "Users"],
            ["Settings", "admin-settings/admin-settings.html", "Settings"]
        ];

        nav.innerHTML = items.map(([label, target, shortLabel]) => {
            const href = page(target);
            const isActive = currentPath.endsWith(`/pages/${target}`)
                || (target === "admin-manage-heroes/admin-manage-heroes.html" && currentPath.includes("/pages/admin-add-hero/"))
                || (target === "admin-manage-movies/admin-manage-movies.html" && currentPath.includes("/pages/admin-add-movie/"));
            return `<a class="${isActive ? "active" : ""}" href="${href}"><span class="admin-nav-full">${label}</span><span class="admin-nav-short">${shortLabel}</span></a>`;
        }).join("");
    }

    function enhanceAdminSidebar(user) {
        const sidebar = document.querySelector(".sidebar");
        const logo = sidebar?.querySelector(".sidebar-logo");
        if (!sidebar || !logo || sidebar.querySelector(".admin-sidebar-profile")) {
            return;
        }

        const initials = `${user.firstName?.[0] || user.name?.[0] || "A"}${user.lastName?.[0] || ""}`.toUpperCase();
        const profile = document.createElement("div");
        profile.className = "admin-sidebar-profile";
        profile.innerHTML = `
            <div class="admin-sidebar-avatar">${escapeHtml(initials)}</div>
            <div>
                <strong>${escapeHtml(user.name || "Admin")}</strong>
                <span>Admin</span>
            </div>
        `;
        logo.insertAdjacentElement("afterend", profile);
    }

    function syncUserNav() {
        const nav = document.querySelector(".sidebar nav");
        if (!nav || !window.location.pathname.includes("/pages/") || window.location.pathname.includes("/pages/admin-")) {
            return;
        }

        const currentPath = window.location.pathname.replace(/\\/g, "/");
        const items = [
            ["Dashboard", "dashboard/dashboard.html", "⌂"],
            ["Heroes Wiki", "heroes-wiki/heroes-wiki.html", "◎"],
            ["Movie Archive", "movie-archive/movie-archive.html", "▦"],
            ["Community Room", "community-room/community-room.html", "◒"],
            ["My Profile", "my-profile/my-profile.html", "◉"],
            ["Settings", "user-settings/user-settings.html", "⚙"]
        ];

        nav.innerHTML = items.map(([label, target, icon]) => {
            const href = page(target);
            const isActive = currentPath.endsWith(`/pages/${target}`)
                || (target === "heroes-wiki/heroes-wiki.html" && currentPath.includes("/pages/hero-profile/"))
                || (target === "movie-archive/movie-archive.html" && currentPath.includes("/pages/movie-detail/"));
            return `
                <a class="${isActive ? "active" : ""}" href="${href}">
                    <span class="nav-icon">${icon}</span>
                    <span>${label}</span>
                </a>
            `;
        }).join("");
    }

    function enhanceUserShell(user) {
        const topbar = document.querySelector(".topbar");
        if (!topbar) {
            return;
        }

        const input = topbar.querySelector("input[type='text'], input:not([type])");
        if (input && !input.closest(".search-box")) {
            const wrapper = document.createElement("div");
            wrapper.className = "search-box";
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        }

        topbar.querySelectorAll(".search-box").forEach((box) => {
            if (!box.querySelector(".search-icon")) {
                box.insertAdjacentHTML("afterbegin", `<span class="search-icon">⌕</span>`);
            }
        });

        document.querySelectorAll(".notification").forEach((notification) => {
            if (notification.closest(".admin-actions")) {
                return;
            }

            const dropdown = notification.querySelector(".notification-dropdown, .notif-dropdown, .dropdown");
            if (!notification.querySelector(".notification-icon")) {
                notification.innerHTML = `<span class="notification-icon">!</span>`;
                if (dropdown) {
                    notification.appendChild(dropdown);
                }
            }
        });

        document.querySelectorAll(".profile").forEach((profile) => {
            if (profile.closest(".admin-actions")) {
                return;
            }

            profile.innerHTML = `
                <div class="navbar-avatar">
                    <img src="${resolveMedia(user.avatarUrl, "assets/images/user-profile/profile-default.png")}" alt="Profile">
                </div>
                <div class="profile-text">
                    <h4>${escapeHtml(user.name)}</h4>
                    <small>Fan User</small>
                </div>
            `;
        });

        document.querySelectorAll(".logout-btn").forEach((button) => {
            if (button.closest(".admin-actions")) {
                return;
            }

            button.innerHTML = `<span class="logout-icon">↪</span><span>Logout</span>`;
        });
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function relativeTime(dateValue) {
        const date = new Date(dateValue);
        const diff = Math.max(0, Date.now() - date.getTime());
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return "just now";
        if (minutes < 60) return `${minutes} minutes ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} days ago`;

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function heroStatsHtml(hero, options = {}) {
        const stats = [
            ["Power", hero.powerScore, "#ffb800"],
            ["Intelligence", hero.intelligenceScore, "#4f8cff"],
            ["Combat", hero.combatScore, "#ff4655"],
            ["Speed", hero.speedScore, "#2ee59d"]
        ];
        const compactClass = options.compact ? " is-compact" : "";

        return `
            <div class="hero-stat-panel${compactClass}">
                ${stats.map(([label, value, color]) => {
                    const score = Math.min(100, Math.max(0, Number(value) || 0));
                    return `
                        <div class="hero-stat-row">
                            <div class="hero-stat-top">
                                <span>${escapeHtml(label)}</span>
                                <strong>${score} / 100</strong>
                            </div>
                            <div class="hero-stat-track">
                                <span class="hero-stat-fill" style="--score:${score}%;--stat-color:${color}"></span>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    function installUi() {
        if (!document.querySelector(".awv-toast-zone")) {
            const zone = document.createElement("div");
            zone.className = "awv-toast-zone";
            document.body.appendChild(zone);
        }
    }

    function notify(message, type = "info", title = "") {
        installUi();

        const normalizedType = ["success", "error", "warning", "info"].includes(type) ? type : "info";
        const titles = {
            success: "Success",
            error: "Alert",
            warning: "Warning",
            info: "Notice"
        };
        const icons = {
            success: "✓",
            error: "!",
            warning: "!",
            info: "i"
        };
        const zone = document.querySelector(".awv-toast-zone");
        const toast = document.createElement("div");
        toast.className = `awv-toast ${normalizedType}`;
        toast.innerHTML = `
            <div class="awv-toast-icon">${icons[normalizedType]}</div>
            <div>
                <h3 class="awv-toast-title">${escapeHtml(title || titles[normalizedType])}</h3>
                <p class="awv-toast-message">${escapeHtml(message)}</p>
            </div>
            <button class="awv-toast-close" type="button" aria-label="Close">&times;</button>
        `;

        const close = () => {
            toast.classList.add("is-leaving");
            window.setTimeout(() => toast.remove(), 180);
        };

        toast.querySelector(".awv-toast-close").addEventListener("click", close);
        zone.appendChild(toast);
        window.setTimeout(close, normalizedType === "error" ? 6200 : 4200);
    }

    function confirmDialog(message, options = {}) {
        installUi();

        return new Promise((resolve) => {
            const backdrop = document.createElement("div");
            const type = options.type || "warning";
            const isDanger = type === "danger" || type === "error";
            backdrop.className = "awv-modal-backdrop";
            backdrop.innerHTML = `
                <div class="awv-modal" role="dialog" aria-modal="true">
                    <div class="awv-modal-head">
                        <div class="awv-modal-mark">${isDanger ? "!" : "?"}</div>
                        <h2>${escapeHtml(options.title || "Confirm Action")}</h2>
                    </div>
                    <div class="awv-modal-body">${escapeHtml(message)}</div>
                    <div class="awv-modal-actions">
                        <button class="cancel" type="button">${escapeHtml(options.cancelText || "Cancel")}</button>
                        <button class="${isDanger ? "danger" : "primary"} confirm" type="button">${escapeHtml(options.confirmText || "Confirm")}</button>
                    </div>
                </div>
            `;

            const finish = (value) => {
                backdrop.remove();
                resolve(value);
            };

            backdrop.querySelector(".cancel").addEventListener("click", () => finish(false));
            backdrop.querySelector(".confirm").addEventListener("click", () => finish(true));
            backdrop.addEventListener("click", (event) => {
                if (event.target === backdrop) finish(false);
            });
            document.addEventListener("keydown", function onKey(event) {
                if (event.key === "Escape") {
                    document.removeEventListener("keydown", onKey);
                    finish(false);
                }
            });

            document.body.appendChild(backdrop);
        });
    }

    window.alert = (message) => notify(String(message), "info");

    return {
        api,
        me,
        requireAuth,
        logout,
        page,
        asset,
        dashboardFor,
        hydrateShell,
        ensureAdminTopbar,
        notify,
        confirm: confirmDialog,
        resolveMedia,
        escapeHtml,
        relativeTime,
        heroStatsHtml
    };
})();
