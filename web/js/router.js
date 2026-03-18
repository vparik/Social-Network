window.Router = (function () {
  const state = Vue.reactive({
    path: window.location.pathname,
    query: window.location.search
  });

  function push(path) {
    const pathname = path.split("?")[0];
    const currentFull = window.location.pathname + window.location.search;
    if (path === currentFull) return;
    history.pushState({}, "", path);
    state.path = pathname;
    state.query = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  }

  function replace(path) {
    history.replaceState({}, "", path);
    state.path = path.split("?")[0];
    state.query = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  }

  window.addEventListener("popstate", () => {
    state.path = window.location.pathname;
    state.query = window.location.search;
  });

  // Intercept internal links
  document.addEventListener("click", function (e) {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || !href.startsWith("/")) return;

    e.preventDefault();
    push(href);
  });

  return { state, push, replace };
})();