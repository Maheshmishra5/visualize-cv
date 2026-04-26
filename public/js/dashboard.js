const logoutBtn = document.getElementById("logoutBtn");
const welcomeText = document.getElementById("welcomeText");
const totalResumes = document.getElementById("totalResumes");
const bestScore = document.getElementById("bestScore");
const recentResumes = document.getElementById("recentResumes");

const ensureAuth = async () => {
  const me = await fetch("/api/auth/me");
  if (!me.ok) {
    window.location.href = "/auth";
    return null;
  }
  const { user } = await me.json();
  return user;
};

const fetchBestScore = async (resumes) => {
  let maxScore = 0;
  for (const resume of resumes.slice(0, 5)) {
    const response = await fetch(`/api/resumes/${resume.id}/analyze`, { method: "POST" });
    if (response.ok) {
      const { analysis } = await response.json();
      maxScore = Math.max(maxScore, analysis.score);
    }
  }
  return maxScore;
};

const renderResumes = (resumes) => {
  if (!resumes.length) {
    recentResumes.innerHTML = `<div class="item-card"><p>No resumes yet. Start building now.</p></div>`;
    return;
  }
  recentResumes.innerHTML = resumes
    .slice(0, 6)
    .map(
      (resume) => `
        <div class="item-card">
          <h4>${resume.name || "Untitled Resume"}</h4>
          <p>${resume.title || "No role title"}</p>
          <p>Updated: ${new Date(resume.updatedAt).toLocaleString()}</p>
          <a href="/builder?id=${resume.id}" class="nav-link">Edit Resume</a>
        </div>
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
  recentResumes.innerHTML = `
    <div class="item-card skeleton" style="height:120px"></div>
    <div class="item-card skeleton" style="height:120px"></div>
    <div class="item-card skeleton" style="height:120px"></div>
  `;
  const user = await ensureAuth();
  if (!user) return;
  welcomeText.textContent = `Welcome, ${user.name}`;

  const resumesResponse = await fetch("/api/resumes");
  const { resumes } = await resumesResponse.json();
  totalResumes.textContent = String(resumes.length);
  renderResumes(resumes);

  const score = await fetchBestScore(resumes);
  bestScore.textContent = `${score}/100`;
  window.showToast?.("Dashboard loaded", "success");
})();
