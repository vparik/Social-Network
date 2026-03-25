window.WS = (function () {
  let socket = null;
  let connected = false;
  let listeners = [];
  let connectPromise = null;

  function notify(event) {
    listeners.forEach(fn => fn(event));
  }

  function getWsUrl() {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws`;
  }

  function subscribe(fn) {
    listeners.push(fn);

    return function unsubscribe() {
      listeners = listeners.filter(x => x !== fn);
    };
  }

  function isConnected() {
    return connected;
  }

  async function connect() {
    if (connected) return;
    if (connectPromise) return connectPromise;

    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      return connectPromise || Promise.resolve();
    }

    connectPromise = new Promise((resolve, reject) => {
      let settled = false;

      socket = new WebSocket(getWsUrl());

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        connectPromise = null;

        try {
          socket.close();
        } catch {}

        reject(new Error("ws_open_timeout"));
      }, 5000);

      socket.onopen = function () {
        connected = true;
        notify({ type: "ws_open" });

        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        connectPromise = null;
        resolve();
      };

      socket.onclose = function () {
        connected = false;
        socket = null;
        notify({ type: "ws_close" });

        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          connectPromise = null;
          reject(new Error("ws_closed_before_open"));
        }
      };

      socket.onerror = function () {
        notify({ type: "ws_error" });

        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          connectPromise = null;
          reject(new Error("ws_open_failed"));
        }
      };

      socket.onmessage = function (event) {
        let payload;

        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }

        if (!payload || !payload.type) return;

        notify({
          type: payload.type,
          data: payload.data
        });
      };
    });

    return connectPromise;
  }

  function disconnect() {
    connectPromise = null;

    if (!socket) {
      connected = false;
      return;
    }

    const current = socket;
    socket = null;
    connected = false;

    try {
      current.close();
    } catch {}
  }

  function send(type, data) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("ws_not_connected");
    }

    socket.send(JSON.stringify({ type, data }));
  }

  return {
    connect,
    disconnect,
    send,
    subscribe,
    isConnected
  };
})();