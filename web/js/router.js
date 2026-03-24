window.Router = (function () {
  const state = Vue.reactive({
    path: window.location.pathname,
    query: window.location.search
  });

  function getParts(path) {
    const queryIndex = path.indexOf("?");

    if (queryIndex === -1) {
      return {
        path,
        query: ""
      };
    }

    return {
      path: path.slice(0, queryIndex),
      query: path.slice(queryIndex)
    };
  }

  function syncFromLocation() {
    state.path = window.location.pathname;
    state.query = window.location.search;
  }

  function notifyRouteChange(mode) {
    if (!window.Events) return;

    window.Events.route.setCurrent(state.path, state.query, mode);
  }

  function push(path) {
    const next = getParts(path);
    const currentFull = window.location.pathname + window.location.search;
    const nextFull = next.path + next.query;

    if (nextFull === currentFull) return;

    history.pushState({}, "", nextFull);
    syncFromLocation();
    notifyRouteChange("push");
  }

  function replace(path) {
    const next = getParts(path);
    const nextFull = next.path + next.query;
    const currentFull = window.location.pathname + window.location.search;

    if (nextFull === currentFull) return;

    history.replaceState({}, "", nextFull);
    syncFromLocation();
    notifyRouteChange("replace");
  }

  window.addEventListener("popstate", function () {
    syncFromLocation();
    notifyRouteChange("pop");
  });

  document.addEventListener("click", function (e) {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href) return;
    if (!href.startsWith("/")) return;
    if (a.hasAttribute("target")) return;
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    push(href);
  });

  return {
    state,
    push,
    replace
  };
})();