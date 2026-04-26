const historyList = document.getElementById("historyList");
const logoutBtn = document.getElementById("logoutBtn");

const ensureAuth = async () => {
  const response = await fetch("/api/auth/me");
  if (!response.ok) {
    window.location.href = "/auth";
    return false;
  }
  return true;
};

const loadHistory = async () => {
  const response = await fetch("/api/resumes");
  if (!response.ok) return;
  const { resumes } = await response.json();

  if (!resumes.length) {
    historyList.innerHTML = `<div class="glass-card"><p>No history yet. Create your first resume.</p></div>`;
    return;
  }

  historyList.innerHTML = resumes
    .map(
      (resume) => `
      <article class="glass-card">
        <h3>${resume.name || "Untitled Resume"}</h3>
        <p>${resume.title || "No role title"}</p>
        <p>Template: ${resume.templateId}</p>
        <p>Updated: ${new Date(resume.updatedAt).toLocaleString()}</p>
        <a href="/builder?id=${resume.id}" class="btn-primary inline-btn">Continue Editing</a>
      </article>
    `
    )
    .join("");
};

logoutBtn.addEventListener("click", async () => {
  window.setButtonLoading?.(logoutBtn, "Logging out", true);
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
});

(async () => {
  historyList.innerHTML = `
    <div class="glass-card skeleton" style="height:130px"></div>
    <div class="glass-card skeleton" style="height:130px"></div>
    <div class="glass-card skeleton" style="height:130px"></div>
  `;
  const ok = await ensureAuth();
  if (!ok) return;
  await loadHistory();
  window.showToast?.("History loaded", "success");
})();
