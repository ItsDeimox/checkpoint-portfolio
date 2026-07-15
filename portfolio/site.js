const defaultContentUrl = "./content.json";

const el = (id) => document.getElementById(id);

function renderMedia(target, media = []) {
  target.innerHTML = "";
  media.forEach((item) => {
    const wrap = document.createElement(item.type === "video" ? "video" : "div");
    if (item.type === "video") {
      wrap.controls = true;
      wrap.playsInline = true;
      wrap.src = item.src;
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.alt || "";
      img.loading = "lazy";
      wrap.appendChild(img);
    }
    target.appendChild(wrap);
  });
}

function renderLinks(target, links = []) {
  target.innerHTML = "";
  links.forEach((link) => {
    const a = document.createElement("a");
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = link.label;
    target.appendChild(a);
  });
}

async function loadContent() {
  const response = await fetch(defaultContentUrl, { cache: "no-store" });
  return response.json();
}

function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value ?? "";
}

function render(content) {
  const profile = content.profile || {};
  setText("nameTitle", profile.name);
  setText("headline", profile.headline);
  setText("summary", profile.summary);
  setText("aboutText", profile.about);
  setText("projectCount", String(content.projects?.length || 0));
  setText("mediaCount", String((content.projects || []).reduce((sum, project) => sum + (project.media?.length || 0), 0)));
  setText("mainLinkLabel", profile.mainLinkLabel || "Link principal");

  const skills = el("skills");
  skills.innerHTML = "";
  (profile.skills || []).forEach((skill) => {
    const span = document.createElement("span");
    span.textContent = skill;
    skills.appendChild(span);
  });

  renderLinks(el("profileLinks"), content.links || []);

  const grid = el("projectGrid");
  const template = el("projectTemplate");
  grid.innerHTML = "";

  (content.projects || []).forEach((project) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".project-year").textContent = project.year || "";
    card.querySelector(".project-role").textContent = project.role || "";
    card.querySelector(".project-title").textContent = project.title || "";
    card.querySelector(".project-description").textContent = project.description || "";
    const tagWrap = card.querySelector(".project-tags");
    (project.tags || []).forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      tagWrap.appendChild(span);
    });
    renderLinks(card.querySelector(".project-links"), project.links || []);
    renderMedia(card.querySelector(".project-media"), project.media || []);
    grid.appendChild(card);
  });
}

loadContent().then(render).catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML("beforeend", "<p style='padding:2rem;color:#fff'>Não foi possível carregar content.json.</p>");
});
