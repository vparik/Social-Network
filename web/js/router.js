window.Router = (function () {
  const state = Vue.reactive({
    path: window.location.pathname
  });

  function push(path) {
    if (path === state.path) return;
    history.pushState({}, "", path);
    state.path = path;
  }

  function replace(path) {
    history.replaceState({}, "", path);
    state.path = path;
  }

  window.addEventListener("popstate", () => {
    state.path = window.location.pathname;
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