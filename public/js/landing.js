const ctas = [...document.querySelectorAll('a[href^="/auth"]')];

(async () => {
  const me = await fetch("/api/auth/me");
  if (!me.ok) return;

  ctas.forEach((link) => {
    if (link.href.includes("next=/builder")) {
      link.href = "/builder";
    }
    if (link.textContent.toLowerCase().includes("login")) {
      link.href = "/dashboard";
      link.textContent = "Dashboard";
    }
    if (link.textContent.toLowerCase().includes("register")) {
      link.classList.add("hidden");
    }
  });
})();
