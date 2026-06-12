const heroImage = document.getElementById("heroImage");
const previewHero = document.getElementById("previewHero");
const form = document.querySelector(".hero-form");

let editId = null;

async function initAddHero() {
    const user = await AWV.requireAuth("admin");
    if (user) {
        AWV.hydrateShell(user);
        AWV.ensureAdminTopbar(user);
    }

    const params = new URLSearchParams(window.location.search);
    editId = params.get("id");

    if (editId) {
        document.querySelector(".page-header h1").textContent = "Edit Hero Profile";
        const descNode = document.querySelector(".page-header p");
        if (descNode) {
            descNode.style.display = "block";
            descNode.style.fontSize = "16px";
            descNode.style.color = "#98a4c0";
            descNode.style.background = "none";
            descNode.style.padding = "4px 0";
            descNode.textContent = "Modify existing hero details and profile image";
        }
        document.querySelector(".submit-btn").textContent = "Update Hero";

        try {
            const payload = await AWV.api("heroes/detail", { params: { id: editId } });
            const hero = payload.hero;
            form.querySelector("input[name='name']").value = hero.name;
            form.querySelector("input[name='realName']").value = hero.realName;
            form.querySelector("input[name='team']").value = hero.team;
            form.querySelector("textarea[name='powers']").value = hero.powers;
            form.querySelector("textarea[name='biography']").value = hero.biography;
            previewHero.src = AWV.resolveMedia(hero.imageUrl);
        } catch (error) {
            AWV.notify("Failed to load hero details: " + error.message, "error");
        }
    }
}

heroImage.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) previewHero.src = URL.createObjectURL(file);
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    if (heroImage.files[0]) {
        formData.append("image", heroImage.files[0]);
    }
    formData.append("category", formData.get("team") || "Avengers");
    formData.append("powerTags", formData.get("powers") || "");

    if (editId) {
        formData.append("id", editId);
    }

    try {
        const action = editId ? "heroes/update" : "heroes/create";
        await AWV.api(action, { formData });
        AWV.notify(editId ? "Hero updated successfully." : "Hero added successfully.", "success");
        if (!editId) {
            form.reset();
            previewHero.src = "../../assets/images/placeholders/hero.svg";
        }
    } catch (error) {
        AWV.notify(error.message, "error");
    }
});

initAddHero().catch((error) => AWV.notify(error.message, "error"));
