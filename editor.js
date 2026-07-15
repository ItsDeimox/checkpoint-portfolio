const els = {
  connectForm: document.getElementById("connectForm"),
  repositoryUrl: document.getElementById("repositoryUrl"),
  connectBtn: document.getElementById("connectBtn"),
  connectionState: document.getElementById("connectionState"),
  workspace: document.getElementById("workspace"),
  workspaceActions: document.getElementById("workspaceActions"),
  name: document.getElementById("nameInput"),
  headline: document.getElementById("headlineInput"),
  summary: document.getElementById("summaryInput"),
  about: document.getElementById("aboutInput"),
  skills: document.getElementById("skillsInput"),
  mainLink: document.getElementById("mainLinkInput"),
  title: document.getElementById("projectTitle"),
  year: document.getElementById("projectYear"),
  role: document.getElementById("projectRole"),
  description: document.getElementById("projectDescription"),
  tags: document.getElementById("projectTags"),
  links: document.getElementById("projectLinks"),
  list: document.getElementById("projectList"),
  empty: document.getElementById("emptyState"),
  mediaSummary: document.getElementById("mediaSummary"),
  saveState: document.getElementById("saveState"),
  toast: document.getElementById("toast")
};

const template = document.getElementById("editorProjectTemplate");
let content;
let repository;
let pendingMedia = [];
let saveTimer;

function showToast(message, kind = "success") {
  els.toast.textContent = message;
  els.toast.dataset.kind = kind;
  els.toast.classList.add("visible");
  window.setTimeout(() => els.toast.classList.remove("visible"), 4200);
}

function errorMessage(error) {
  return error?.message || String(error || "Algo deu errado.");
}

function setBusy(button, busy, label) {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.label;
}

function fillProfile() {
  const profile = content.profile || {};
  els.name.value = profile.name || "";
  els.headline.value = profile.headline || "";
  els.summary.value = profile.summary || "";
  els.about.value = profile.about || "";
  els.skills.value = (profile.skills || []).join(", ");
  els.mainLink.value = profile.mainLinkUrl || "";
}

function readProfile() {
  content.profile = {
    ...content.profile,
    name: els.name.value.trim(),
    headline: els.headline.value.trim(),
    summary: els.summary.value.trim(),
    about: els.about.value.trim(),
    skills: els.skills.value.split(",").map((item) => item.trim()).filter(Boolean),
    mainLinkUrl: els.mainLink.value.trim()
  };
}

async function saveNow() {
  if (!content) return;
  window.clearTimeout(saveTimer);
  readProfile();
  els.saveState.textContent = "Salvando...";
  try {
    await window.portfolioApp.save(content);
    els.saveState.textContent = "Salvo localmente";
  } catch (error) {
    els.saveState.textContent = "Erro ao salvar";
    showToast(errorMessage(error), "error");
    throw error;
  }
}

function scheduleSave() {
  if (!content) return;
  els.saveState.textContent = "Alterações pendentes";
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveNow(), 500);
}

function toLinkObjects(value) {
  return value.split(",").map((url) => url.trim()).filter(Boolean).map((url, index) => ({
    label: index === 0 ? "Ver projeto" : `Link ${index + 1}`,
    url
  }));
}

function moveProject(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= content.projects.length) return;
  [content.projects[index], content.projects[target]] = [content.projects[target], content.projects[index]];
  renderList();
  saveNow();
}

function renderList() {
  els.list.innerHTML = "";
  els.empty.hidden = content.projects.length > 0;
  content.projects.forEach((project, index) => {
    const item = template.content.firstElementChild.cloneNode(true);
    item.querySelector(".item-title").textContent = project.title || `Projeto ${index + 1}`;
    item.querySelector(".item-subtitle").textContent = `${project.year || "s/d"} · ${project.role || "Sem função"}`;
    const mediaWrap = item.querySelector(".item-media");
    (project.media || []).forEach((media) => {
      const node = document.createElement(media.type === "video" ? "video" : "img");
      if (media.type === "video") node.controls = true;
      node.src = media.src;
      node.alt = media.alt || "";
      mediaWrap.appendChild(node);
    });
    const up = item.querySelector(".item-up");
    const down = item.querySelector(".item-down");
    up.disabled = index === 0;
    down.disabled = index === content.projects.length - 1;
    up.addEventListener("click", () => moveProject(index, -1));
    down.addEventListener("click", () => moveProject(index, 1));
    item.querySelector(".item-delete").addEventListener("click", async () => {
      content.projects.splice(index, 1);
      renderList();
      await saveNow();
    });
    els.list.appendChild(item);
  });
}

function clearProjectForm() {
  document.getElementById("projectForm").reset();
  pendingMedia = [];
  els.mediaSummary.textContent = "Nenhum arquivo selecionado";
}

els.connectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(els.connectBtn, true, "Conectando...");
  try {
    const result = await window.portfolioApp.connect(els.repositoryUrl.value);
    content = result.content;
    repository = result.repository;
    fillProfile();
    renderList();
    els.connectionState.textContent = `${repository.owner}/${repository.name}`;
    els.workspace.hidden = false;
    els.workspaceActions.hidden = false;
    showToast("Repositório conectado. As alterações agora são salvas localmente.");
  } catch (error) {
    showToast(errorMessage(error), "error");
  } finally {
    setBusy(els.connectBtn, false, "");
  }
});

[els.name, els.headline, els.summary, els.about, els.skills, els.mainLink].forEach((input) => input.addEventListener("input", scheduleSave));

document.getElementById("mediaBtn").addEventListener("click", async () => {
  try {
    const selected = await window.portfolioApp.importMedia();
    pendingMedia.push(...selected);
    els.mediaSummary.textContent = pendingMedia.length ? `${pendingMedia.length} arquivo(s) pronto(s)` : "Nenhum arquivo selecionado";
  } catch (error) {
    showToast(errorMessage(error), "error");
  }
});

document.getElementById("projectForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  content.projects.unshift({
    title: els.title.value.trim(), year: els.year.value.trim(), role: els.role.value.trim(),
    description: els.description.value.trim(),
    tags: els.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
    links: toLinkObjects(els.links.value), media: pendingMedia
  });
  clearProjectForm();
  renderList();
  await saveNow();
  showToast("Projeto adicionado à vitrine.");
});

document.getElementById("clearBtn").addEventListener("click", clearProjectForm);
document.getElementById("previewBtn").addEventListener("click", async () => { await saveNow(); await window.portfolioApp.preview(); });
document.getElementById("openRepoBtn").addEventListener("click", () => window.portfolioApp.openRepository());
document.getElementById("pagesBtn").addEventListener("click", async () => {
  const result = await window.portfolioApp.configurePages();
  showToast(result.automatic ? "GitHub Pages configurado para publicar pelo workflow." : "Na tela aberta, selecione GitHub Actions em Source.", result.automatic ? "success" : "info");
});
document.getElementById("publishBtn").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  setBusy(button, true, "Publicando...");
  try {
    await saveNow();
    const result = await window.portfolioApp.publish("Atualiza portfolio pelo Checkpoint");
    showToast(result.pages.automatic
      ? `Publicado. O site ficará disponível em ${repository.siteUrl}`
      : "Commit enviado. Confirme GitHub Actions na tela do Pages para concluir a primeira publicação.",
    result.pages.automatic ? "success" : "info");
  } catch (error) {
    showToast(errorMessage(error), "error");
  } finally {
    setBusy(button, false, "");
  }
});
