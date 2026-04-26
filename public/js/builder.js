const templates = [
  { id: "template-1", name: "Ocean Clean", accent: "#0284c7", bg: "#f8fafc" },
  { id: "template-2", name: "Midnight Pro", accent: "#334155", bg: "#f1f5f9" },
  { id: "template-3", name: "Sunset Bold", accent: "#ea580c", bg: "#fff7ed" },
  { id: "template-4", name: "Emerald Edge", accent: "#059669", bg: "#ecfdf5" },
  { id: "template-5", name: "Royal Purple", accent: "#7c3aed", bg: "#f5f3ff" },
  { id: "template-6", name: "Crimson Prime", accent: "#dc2626", bg: "#fef2f2" },
  { id: "template-7", name: "Amber Light", accent: "#d97706", bg: "#fffbeb" },
  { id: "template-8", name: "Steel Gray", accent: "#475569", bg: "#f8fafc" },
  { id: "template-9", name: "Neon Future", accent: "#0ea5e9", bg: "#ecfeff" }
];

const fieldIds = [
  "name",
  "title",
  "email",
  "phone",
  "location",
  "summary",
  "skills",
  "experience",
  "education",
  "projects",
  "templateId",
  "fontFamily"
];

const preview = document.getElementById("preview");
const templateSelect = document.getElementById("templateId");
const saveBtn = document.getElementById("saveBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const aiBtn = document.getElementById("aiBtn");
const pdfBtn = document.getElementById("pdfBtn");
const docxBtn = document.getElementById("docxBtn");
const analysisBox = document.getElementById("analysisBox");
const aiBox = document.getElementById("aiBox");
const logoutBtn = document.getElementById("logoutBtn");
const photoInput = document.getElementById("photo");
const templateThumbs = document.getElementById("templateThumbs");
const sectionOrderList = document.getElementById("sectionOrderList");
const wizardPanels = [...document.querySelectorAll(".wizard-panel")];
const wizardSteps = document.getElementById("wizardSteps");
const wizardProgressBar = document.getElementById("wizardProgressBar");
const prevStepBtn = document.getElementById("prevStepBtn");
const nextStepBtn = document.getElementById("nextStepBtn");
const wizardStepTitles = ["Basics", "Summary", "Experience", "Design", "Review"];

let currentPhotoUrl = "";
let currentResumeId = "";
let currentSectionOrder = ["summary", "skills", "experience", "education", "projects"];
let currentStep = 0;

const mapLines = (text, parser) =>
  text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(parser);

const getResumePayload = () => {
  const values = Object.fromEntries(fieldIds.map((id) => [id, document.getElementById(id).value.trim()]));
  return {
    id: currentResumeId || undefined,
    name: values.name,
    title: values.title,
    email: values.email,
    phone: values.phone,
    location: values.location,
    summary: values.summary,
    skills: values.skills ? values.skills.split(",").map((skill) => skill.trim()).filter(Boolean) : [],
    experience: mapLines(values.experience, (line) => {
      const [company = "", role = "", highlights = ""] = line.split("|").map((part) => part.trim());
      return {
        company,
        role,
        highlights: highlights.split(";").map((item) => item.trim()).filter(Boolean)
      };
    }),
    education: mapLines(values.education, (line) => {
      const [institute = "", degree = "", year = ""] = line.split("|").map((part) => part.trim());
      return { institute, degree, year };
    }),
    projects: mapLines(values.projects, (line) => line),
    sectionOrder: currentSectionOrder,
    templateId: values.templateId || "template-1",
    fontFamily: values.fontFamily || "Inter",
    photoUrl: currentPhotoUrl
  };
};

const renderPreview = () => {
  const resume = getResumePayload();
  const template = templates.find((item) => item.id === resume.templateId) || templates[0];
  const sectionMap = {
    summary: `<section><h4 style="color:${template.accent};">Summary</h4><p>${resume.summary || "Your professional summary appears here."}</p></section>`,
    skills: `<section><h4 style="color:${template.accent};">Skills</h4><p>${resume.skills.map((skill) => `<span class="badge">${skill}</span>`).join(" ") || "No skills added."}</p></section>`,
    experience: `<section><h4 style="color:${template.accent};">Experience</h4>${
      resume.experience
        .map(
          (exp) => `
      <article>
        <strong>${exp.role || "Role"}</strong> - ${exp.company || "Company"}
        <ul>${exp.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>
      </article>
    `
        )
        .join("") || "<p>No experience added.</p>"
    }</section>`,
    education: `<section><h4 style="color:${template.accent};">Education</h4>${
      resume.education.map((e) => `<p><strong>${e.degree}</strong> - ${e.institute} (${e.year})</p>`).join("") ||
      "<p>No education added.</p>"
    }</section>`,
    projects: `<section><h4 style="color:${template.accent};">Projects</h4><ul>${
      resume.projects.map((project) => `<li>${project}</li>`).join("") || "<li>No projects added.</li>"
    }</ul></section>`
  };
  const orderedSections = currentSectionOrder.map((key) => sectionMap[key]).join("");

  preview.style.background = template.bg;
  preview.style.fontFamily = resume.fontFamily;
  preview.innerHTML = `
    <section class="resume-header">
      <div>
        <h2 style="margin:0;color:${template.accent};">${resume.name || "Your Name"}</h2>
        <p style="margin:6px 0;">${resume.title || "Professional Title"}</p>
        <p style="margin:6px 0;">${resume.email || "email@example.com"} | ${resume.phone || "Phone"} | ${resume.location || "Location"}</p>
      </div>
      ${resume.photoUrl ? `<img src="${resume.photoUrl}" alt="Profile photo" />` : ""}
    </section>
    <hr />
    <div class="resume-stack">${orderedSections}</div>
  `;
};

const ensureAuth = async () => {
  const response = await fetch("/api/auth/me");
  if (!response.ok) {
    window.location.href = "/auth";
    return false;
  }
  return true;
};

const fillTemplateOptions = () => {
  templateSelect.innerHTML = templates.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
};

const loadResumeIfEditing = async () => {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;
  const response = await fetch(`/api/resumes/${id}`);
  if (!response.ok) return;

  const { resume } = await response.json();
  currentResumeId = resume.id;
  currentPhotoUrl = resume.photoUrl || "";

  document.getElementById("name").value = resume.name || "";
  document.getElementById("title").value = resume.title || "";
  document.getElementById("email").value = resume.email || "";
  document.getElementById("phone").value = resume.phone || "";
  document.getElementById("location").value = resume.location || "";
  document.getElementById("summary").value = resume.summary || "";
  document.getElementById("skills").value = (resume.skills || []).join(", ");
  document.getElementById("experience").value = (resume.experience || [])
    .map((exp) => `${exp.company} | ${exp.role} | ${(exp.highlights || []).join("; ")}`)
    .join("\n");
  document.getElementById("education").value = (resume.education || [])
    .map((edu) => `${edu.institute} | ${edu.degree} | ${edu.year}`)
    .join("\n");
  document.getElementById("projects").value = (resume.projects || []).join("\n");
  currentSectionOrder = resume.sectionOrder || currentSectionOrder;
  document.getElementById("templateId").value = resume.templateId || "template-1";
  document.getElementById("fontFamily").value = resume.fontFamily || "Inter";
  renderSectionOrder();
  highlightTemplate();
};

const saveResume = async () => {
  const payload = getResumePayload();
  window.setButtonLoading?.(saveBtn, "Saving", true);
  try {
    const response = await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      window.showToast?.(data.error || "Unable to save resume.", "error");
      return;
    }
    currentResumeId = data.resume.id;
    window.showToast?.("Resume saved successfully", "success");
  } finally {
    window.setButtonLoading?.(saveBtn, "Saving", false);
  }
};

const analyzeResume = async () => {
  window.setButtonLoading?.(analyzeBtn, "Analyzing", true);
  if (!currentResumeId) {
    await saveResume();
  }
  if (!currentResumeId) {
    window.setButtonLoading?.(analyzeBtn, "Analyzing", false);
    return;
  }
  try {
    const response = await fetch(`/api/resumes/${currentResumeId}/analyze`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) return;

    analysisBox.classList.remove("hidden");
    analysisBox.innerHTML = `
      <h4>Resume Analyzer</h4>
      <p><strong>Score:</strong> ${data.analysis.score}/100 (${data.analysis.level})</p>
      <p><strong>Strengths:</strong> ${(data.analysis.achievements || []).join(" ") || "None yet."}</p>
      <p><strong>Improvements:</strong> ${(data.analysis.suggestions || []).join(" ") || "Great profile overall."}</p>
    `;
    window.showToast?.("Resume analyzed", "success");
  } finally {
    window.setButtonLoading?.(analyzeBtn, "Analyzing", false);
  }
};

const fetchAiSuggestions = async () => {
  const payload = getResumePayload();
  window.setButtonLoading?.(aiBtn, "Thinking", true);
  try {
    const response = await fetch("/api/ai-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) return;
    aiBox.classList.remove("hidden");
    aiBox.innerHTML = `
      <h4>AI Suggestions (${data.source})</h4>
      ${data.suggestions
        .map(
          (item) => `
        <div class="item-card">
          <strong>${item.title}</strong> <span class="badge">${item.priority}</span>
          <p>${item.message}</p>
        </div>
      `
        )
        .join("")}
    `;
    window.showToast?.("AI suggestions generated", "success");
  } finally {
    window.setButtonLoading?.(aiBtn, "Thinking", false);
  }
};

const renderTemplateThumbs = () => {
  templateThumbs.innerHTML = templates
    .map(
      (t) => `
    <button class="template-thumb" data-id="${t.id}" style="--accent:${t.accent};--bg:${t.bg}">
      <span>${t.name}</span>
    </button>
  `
    )
    .join("");
  highlightTemplate();
};

const highlightTemplate = () => {
  const current = document.getElementById("templateId").value;
  [...document.querySelectorAll(".template-thumb")].forEach((el) => {
    el.classList.toggle("active", el.dataset.id === current);
  });
};

const renderSectionOrder = () => {
  sectionOrderList.innerHTML = currentSectionOrder
    .map((section) => `<li class="order-item" draggable="true" data-section="${section}">${section}</li>`)
    .join("");
  attachDragEvents();
};

const attachDragEvents = () => {
  let dragged = null;
  [...document.querySelectorAll(".order-item")].forEach((item) => {
    item.addEventListener("dragstart", () => {
      dragged = item;
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      dragged = null;
      currentSectionOrder = [...sectionOrderList.children].map((node) => node.dataset.section);
      renderPreview();
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!dragged || dragged === item) return;
      const rect = item.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      sectionOrderList.insertBefore(dragged, after ? item.nextSibling : item);
    });
  });
};

const exportPdf = () => {
  const filename = `${(document.getElementById("name").value || "resume").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  window.setButtonLoading?.(pdfBtn, "Exporting", true);
  window.html2pdf().set({ margin: 0.2, filename }).from(preview).save();
  setTimeout(() => window.setButtonLoading?.(pdfBtn, "Exporting", false), 1200);
};

const exportDocx = async () => {
  const payload = getResumePayload();
  window.setButtonLoading?.(docxBtn, "Exporting", true);
  try {
    const response = await fetch("/api/export/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "DOCX export failed." }));
      window.showToast?.(err.error || "DOCX export failed.", "error");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `${(document.getElementById("name").value || "resume").replace(/\s+/g, "-").toLowerCase()}.docx`;
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    window.showToast?.("DOCX exported", "success");
  } finally {
    window.setButtonLoading?.(docxBtn, "Exporting", false);
  }
};

const renderWizard = () => {
  wizardPanels.forEach((panel, idx) => panel.classList.toggle("hidden", idx !== currentStep));
  if (wizardSteps) {
    wizardSteps.innerHTML = wizardStepTitles
      .map(
        (title, idx) =>
          `<button class="wizard-step ${idx === currentStep ? "active" : ""}" data-step="${idx}">${idx + 1}. ${title}</button>`
      )
      .join("");
  }
  const progress = ((currentStep + 1) / wizardPanels.length) * 100;
  if (wizardProgressBar) wizardProgressBar.style.width = `${progress}%`;

  prevStepBtn.disabled = currentStep === 0;
  nextStepBtn.textContent = currentStep === wizardPanels.length - 1 ? "Go To First Step" : "Next Step";
};

const goToStep = (step) => {
  if (step < 0 || step >= wizardPanels.length) return;
  currentStep = step;
  renderWizard();
};

const nextStep = () => {
  if (currentStep === wizardPanels.length - 1) {
    goToStep(0);
    return;
  }
  goToStep(currentStep + 1);
};

const prevStep = () => goToStep(currentStep - 1);

photoInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const formData = new FormData();
  formData.append("photo", file);
  const response = await fetch("/api/upload-photo", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Photo upload failed.");
    return;
  }
  currentPhotoUrl = data.photoUrl;
  renderPreview();
});

saveBtn.addEventListener("click", saveResume);
analyzeBtn.addEventListener("click", analyzeResume);
aiBtn.addEventListener("click", fetchAiSuggestions);
pdfBtn.addEventListener("click", exportPdf);
docxBtn.addEventListener("click", exportDocx);
prevStepBtn.addEventListener("click", prevStep);
nextStepBtn.addEventListener("click", nextStep);

logoutBtn.addEventListener("click", async () => {
  window.setButtonLoading?.(logoutBtn, "Logging out", true);
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/auth";
});

fieldIds.forEach((id) => {
  document.getElementById(id).addEventListener("input", renderPreview);
});

templateSelect.addEventListener("change", () => {
  highlightTemplate();
  renderPreview();
});

templateThumbs.addEventListener("click", (event) => {
  const btn = event.target.closest(".template-thumb");
  if (!btn) return;
  templateSelect.value = btn.dataset.id;
  highlightTemplate();
  renderPreview();
});

wizardSteps.addEventListener("click", (event) => {
  const btn = event.target.closest(".wizard-step");
  if (!btn) return;
  goToStep(Number(btn.dataset.step));
});

(async () => {
  const ok = await ensureAuth();
  if (!ok) return;
  fillTemplateOptions();
  renderTemplateThumbs();
  renderSectionOrder();
  await loadResumeIfEditing();
  if (new URLSearchParams(window.location.search).get("analyze") === "1") {
    goToStep(wizardPanels.length - 1);
    analyzeResume();
  }
  renderWizard();
  renderPreview();
})();
