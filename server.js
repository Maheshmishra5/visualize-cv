require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const mongoose = require("mongoose");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require("docx");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "data", "db.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const MONGODB_URI = process.env.MONGODB_URI || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "visualize-cv-session-secret";
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const isCloudinaryReady = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], resumes: [] }, null, 2), "utf-8");

const readDb = () => JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
const writeDb = (payload) => fs.writeFileSync(DB_PATH, JSON.stringify(payload, null, 2), "utf-8");

if (isCloudinaryReady) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
}

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

const resumeSchema = new mongoose.Schema(
  {
    rid: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    name: String,
    title: String,
    email: String,
    phone: String,
    location: String,
    summary: String,
    skills: [String],
    experience: [{ company: String, role: String, highlights: [String] }],
    education: [{ institute: String, degree: String, year: String }],
    projects: [String],
    sectionOrder: [String],
    templateId: String,
    fontFamily: String,
    photoUrl: String
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Resume = mongoose.models.Resume || mongoose.model("Resume", resumeSchema);
let storageMode = "file";

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);

app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, "public")));

const localStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const cloudStorage = isCloudinaryReady
  ? new CloudinaryStorage({
      cloudinary,
      params: async () => ({
        folder: "visualize-cv",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
      })
    })
  : null;
const upload = multer({ storage: cloudStorage || localStorage });

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const analyzeResume = (resume) => {
  let score = 0;
  const suggestions = [];
  const achievements = [];

  if (resume.summary && resume.summary.length > 80) {
    score += 15;
    achievements.push("Strong professional summary.");
  } else {
    suggestions.push("Expand your summary to at least 80 characters.");
  }

  if (Array.isArray(resume.skills) && resume.skills.length >= 6) {
    score += 15;
    achievements.push("Skills section is detailed.");
  } else {
    suggestions.push("Add at least 6 relevant skills.");
  }

  if (Array.isArray(resume.experience) && resume.experience.length >= 2) {
    score += 20;
    achievements.push("Multiple experiences improve credibility.");
  } else {
    suggestions.push("Add at least 2 work experiences.");
  }

  if (Array.isArray(resume.education) && resume.education.length >= 1) {
    score += 15;
    achievements.push("Education section included.");
  } else {
    suggestions.push("Add your education background.");
  }

  const totalBulletPoints = Array.isArray(resume.experience)
    ? resume.experience.reduce((acc, item) => acc + (item.highlights?.length || 0), 0)
    : 0;
  if (totalBulletPoints >= 4) {
    score += 15;
    achievements.push("Impact-focused bullet points found.");
  } else {
    suggestions.push("Add impact bullet points with results and metrics.");
  }

  if (resume.photoUrl) {
    score += 5;
    achievements.push("Profile photo added.");
  } else {
    suggestions.push("Add a professional profile photo.");
  }

  if (resume.templateId) {
    score += 5;
    achievements.push("Template selected.");
  }

  if (resume.fontFamily) {
    score += 5;
    achievements.push("Readable font styling configured.");
  }

  if (resume.projects && resume.projects.length >= 1) {
    score += 5;
    achievements.push("Project section showcases practical work.");
  } else {
    suggestions.push("Add at least one project to stand out.");
  }

  return {
    score: Math.min(score, 100),
    level: score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Improvement",
    suggestions,
    achievements
  };
};

const generateAiSuggestions = (resume) => {
  const messages = [];
  const name = resume.name || "Candidate";

  messages.push({
    title: "Headline Upgrade",
    message: `${name}, add a concise headline under your name (e.g., Full Stack Developer | Node.js | React).`,
    priority: "high"
  });

  if (!resume.summary || resume.summary.length < 120) {
    messages.push({
      title: "Strengthen Summary",
      message: "Write a 3-line summary with years of experience, core stack, and one measurable achievement.",
      priority: "high"
    });
  }

  messages.push({
    title: "Quantify Results",
    message: "Use numbers in experience points like: Improved API latency by 35% or Increased conversions by 18%.",
    priority: "high"
  });

  messages.push({
    title: "ATS Optimization",
    message: "Mirror keywords from your target job description inside skills and experience sections.",
    priority: "medium"
  });

  messages.push({
    title: "Project Storytelling",
    message: "For each project, add problem, action, and result in one compact bullet.",
    priority: "medium"
  });

  return messages;
};

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const emailNormalized = email.toLowerCase();
  const hash = await bcrypt.hash(password, 10);
  try {
    if (storageMode === "mongo") {
      const exists = await User.findOne({ email: emailNormalized }).lean();
      if (exists) return res.status(409).json({ error: "User already exists." });
      const user = await User.create({ uid: uuidv4(), name, email: emailNormalized, password: hash });
      req.session.user = { id: user.uid, name: user.name, email: user.email };
      return res.status(201).json({ user: req.session.user });
    }

    const db = readDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === emailNormalized);
    if (existing) return res.status(409).json({ error: "User already exists." });
    const user = { id: uuidv4(), name, email: emailNormalized, password: hash, createdAt: new Date().toISOString() };
    db.users.push(user);
    writeDb(db);
    req.session.user = { id: user.id, name: user.name, email: user.email };
    return res.status(201).json({ user: req.session.user });
  } catch {
    return res.status(500).json({ error: "Registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const emailNormalized = email.toLowerCase();
  let user = null;
  if (storageMode === "mongo") {
    user = await User.findOne({ email: emailNormalized }).lean();
  } else {
    const db = readDb();
    user = db.users.find((u) => u.email.toLowerCase() === emailNormalized);
  }
  if (!user) return res.status(401).json({ error: "Invalid credentials." });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Invalid credentials." });

  req.session.user = { id: user.uid || user.id, name: user.name, email: user.email };
  return res.json({ user: req.session.user });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  return res.json({ user: req.session.user });
});

app.post("/api/upload-photo", requireAuth, upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No photo uploaded." });
  }
  const photoUrl = isCloudinaryReady ? req.file.path : `/uploads/${req.file.filename}`;
  return res.json({ photoUrl });
});

app.post("/api/resumes", requireAuth, async (req, res) => {
  const payload = req.body;

  const resume = {
    id: payload.id || uuidv4(),
    userId: req.session.user.id,
    name: payload.name || "",
    title: payload.title || "",
    email: payload.email || "",
    phone: payload.phone || "",
    location: payload.location || "",
    summary: payload.summary || "",
    skills: payload.skills || [],
    experience: payload.experience || [],
    education: payload.education || [],
    projects: payload.projects || [],
    sectionOrder: payload.sectionOrder || ["summary", "skills", "experience", "education", "projects"],
    templateId: payload.templateId || "template-1",
    fontFamily: payload.fontFamily || "Inter",
    photoUrl: payload.photoUrl || "",
    updatedAt: new Date().toISOString()
  };
  try {
    if (storageMode === "mongo") {
      const existing = await Resume.findOne({ rid: resume.id, userId: req.session.user.id });
      if (existing) {
        Object.assign(existing, resume);
        await existing.save();
      } else {
        await Resume.create({
          rid: resume.id,
          ...resume
        });
      }
      return res.status(201).json({ resume });
    }

    const db = readDb();
    const existingIndex = db.resumes.findIndex((r) => r.id === resume.id && r.userId === req.session.user.id);
    if (existingIndex >= 0) db.resumes[existingIndex] = { ...db.resumes[existingIndex], ...resume };
    else db.resumes.push({ ...resume, createdAt: payload.createdAt || new Date().toISOString() });
    writeDb(db);
    return res.status(201).json({ resume });
  } catch {
    return res.status(500).json({ error: "Could not save resume." });
  }
});

app.get("/api/resumes", requireAuth, async (req, res) => {
  if (storageMode === "mongo") {
    const resumes = await Resume.find({ userId: req.session.user.id }).sort({ updatedAt: -1 }).lean();
    const mapped = resumes.map((r) => ({ ...r, id: r.rid }));
    return res.json({ resumes: mapped });
  }
  const db = readDb();
  const resumes = db.resumes
    .filter((r) => r.userId === req.session.user.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return res.json({ resumes });
});

app.get("/api/resumes/:id", requireAuth, async (req, res) => {
  if (storageMode === "mongo") {
    const resume = await Resume.findOne({ rid: req.params.id, userId: req.session.user.id }).lean();
    if (!resume) return res.status(404).json({ error: "Resume not found." });
    return res.json({ resume: { ...resume, id: resume.rid } });
  }
  const db = readDb();
  const resume = db.resumes.find((r) => r.id === req.params.id && r.userId === req.session.user.id);
  if (!resume) return res.status(404).json({ error: "Resume not found." });
  return res.json({ resume });
});

app.post("/api/resumes/:id/analyze", requireAuth, async (req, res) => {
  let resume = null;
  if (storageMode === "mongo") {
    resume = await Resume.findOne({ rid: req.params.id, userId: req.session.user.id }).lean();
    if (resume) resume = { ...resume, id: resume.rid };
  } else {
    const db = readDb();
    resume = db.resumes.find((r) => r.id === req.params.id && r.userId === req.session.user.id);
  }
  if (!resume) return res.status(404).json({ error: "Resume not found." });
  return res.json({ analysis: analyzeResume(resume) });
});

app.post("/api/ai-suggestions", requireAuth, (req, res) => {
  const offline = generateAiSuggestions(req.body || {});
  return res.json({ suggestions: offline, source: "local" });
});

app.post("/api/export/docx", requireAuth, async (req, res) => {
  const resume = req.body || {};
  const heading = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
  const line = (text) => new Paragraph({ children: [new TextRun({ text: text || "" })], spacing: { after: 80 } });

  const experienceParas = Array.isArray(resume.experience)
    ? resume.experience.flatMap((exp) => [
        line(`${exp.role || "Role"} - ${exp.company || "Company"}`),
        ...(Array.isArray(exp.highlights) ? exp.highlights.map((h) => line(`• ${h}`)) : [])
      ])
    : [];
  const educationParas = Array.isArray(resume.education)
    ? resume.education.map((e) => line(`${e.degree || ""} - ${e.institute || ""} (${e.year || ""})`))
    : [];
  const projectParas = Array.isArray(resume.projects) ? resume.projects.map((p) => line(`• ${p}`)) : [];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: resume.name || "Your Name", bold: true })]
          }),
          line(`${resume.title || "Professional Title"}`),
          line(`${resume.email || ""} ${resume.phone ? `| ${resume.phone}` : ""} ${resume.location ? `| ${resume.location}` : ""}`),
          heading("Summary"),
          line(resume.summary || "No summary added."),
          heading("Skills"),
          line(Array.isArray(resume.skills) && resume.skills.length ? resume.skills.join(", ") : "No skills added."),
          heading("Experience"),
          ...(experienceParas.length ? experienceParas : [line("No experience added.")]),
          heading("Education"),
          ...(educationParas.length ? educationParas : [line("No education added.")]),
          heading("Projects"),
          ...(projectParas.length ? projectParas : [line("No projects added.")])
        ]
      }
    ]
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${(resume.name || "resume").toLowerCase().replace(/\s+/g, "-")}.docx"`
    );
    return res.send(buffer);
  } catch {
    return res.status(500).json({ error: "DOCX export failed." });
  }
});

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/auth", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "auth.html"));
});

app.get("/dashboard", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "dashboard.html"));
});

app.get("/builder", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "builder.html"));
});

app.get("/history", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "history.html"));
});

const startServer = async () => {
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      storageMode = "mongo";
      console.log("Connected to MongoDB Atlas.");
    } catch {
      storageMode = "file";
      console.log("MongoDB unavailable, using local JSON fallback.");
    }
  } else {
    storageMode = "file";
    console.log("MONGODB_URI not set, using local JSON fallback.");
  }

  app.listen(PORT, () => {
    console.log(`Visualize CV running on http://localhost:${PORT}`);
  });
};

startServer();
