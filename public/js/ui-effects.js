(() => {
  const markReady = () => document.body.classList.add("page-ready");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markReady);
  } else {
    markReady();
  }

  const revealTargets = () => {
    const cards = [...document.querySelectorAll(".glass-card, .item-card")];
    cards.forEach((el) => el.classList.add("reveal-card"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    cards.forEach((card) => observer.observe(card));
  };

  const addTransitions = () => {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("/") || link.target === "_blank") return;
      if (href.startsWith("#")) return;
      event.preventDefault();
      document.body.classList.add("page-exit");
      setTimeout(() => {
        window.location.href = href;
      }, 180);
    });
  };

  window.setButtonLoading = (button, loadingText, on) => {
    if (!button) return;
    if (!button.dataset.defaultText) {
      button.dataset.defaultText = button.textContent;
    }
    button.disabled = on;
    button.classList.toggle("loading-inline", on);
    button.textContent = on ? loadingText : button.dataset.defaultText;
  };

  window.showToast = (message, type = "success") => {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2600);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      revealTargets();
      addTransitions();
    });
  } else {
    revealTargets();
    addTransitions();
  }
})();
