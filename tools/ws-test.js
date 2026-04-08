const WebSocket = require("ws");

async function test(url) {
  await new Promise((resolve) => {
    const ws = new WebSocket(url);
    let done = false;

    ws.on("open", () => {
      done = true;
      console.log("WS_OK", url);
      ws.terminate();
      resolve();
    });

    ws.on("error", (e) => {
      if (!done) {
        done = true;
        console.log("WS_ERR", url, e && e.message ? e.message : String(e));
      }
      resolve();
    });

    setTimeout(() => {
      if (!done) {
        done = true;
        console.log("WS_TIMEOUT", url);
        try {
          ws.terminate();
        } catch {}
      }
      resolve();
    }, 2000);
  });
}

(async () => {
  await test("ws://mosquitto:9001/");
  await test("ws://mosquitto:9001/mqtt");
})();

