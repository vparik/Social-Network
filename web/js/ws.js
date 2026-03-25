window.WS = (function () {
  let socket = null;
  let connected = false;
  let listeners = [];

  function notify(event) {
    listeners.forEach(fn => fn(event));
  }

  function getWsUrl() {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws`;
  }

  function connect() {
    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    socket = new WebSocket(getWsUrl());

    socket.onopen = function () {
      connected = true;
      notify({ type: "ws_open" });
    };

    socket.onclose = function () {
      connected = false;
      socket = null;
      notify({ type: "ws_close" });
    };

    socket.onerror = function () {
      notify({ type: "ws_error" });
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
  }

  function disconnect() {
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

  function subscribe(fn) {
    listeners.push(fn);

    return function unsubscribe() {
      listeners = listeners.filter(x => x !== fn);
    };
  }

  function isConnected() {
    return connected;
  }

  return {
    connect,
    disconnect,
    send,
    subscribe,
    isConnected
  };
})();