window.toast = (function () {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  return function toast(message, type) {
    const c = getContainer();
    const el = document.createElement("div");
    el.className = "toast toast--" + (type || "info");
    el.textContent = message;

    c.appendChild(el);

    // Trigger enter animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add("toast--visible"));
    });

    const remove = () => {
      el.classList.remove("toast--visible");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
    };

    const timer = setTimeout(remove, 3500);
    el.addEventListener("click", () => { clearTimeout(timer); remove(); });
  };
})();
