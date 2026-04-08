const path = require("node:path");
const mqtt = require(path.join(process.cwd(), "node_modules", "mqtt"));

async function test(url) {
  await new Promise((resolve) => {
    const c = mqtt.connect(url, {
      clientId: "codec-ws-test-" + Math.random().toString(16).slice(2),
      connectTimeout: 4000,
      reconnectPeriod: 0,
    });

    let done = false;
    const finish = (label, extra) => {
      if (done) return;
      done = true;
      console.log(label, url, extra || "");
      try {
        c.end(true);
      } catch {}
      resolve();
    };

    c.on("connect", () => finish("MQTT_WS_OK"));
    c.on("error", (e) => finish("MQTT_WS_ERR", e && e.message ? e.message : String(e)));
    setTimeout(() => finish("MQTT_WS_TIMEOUT"), 4500);
  });
}

(async () => {
  await test("ws://host.docker.internal:9001/");
  await test("ws://host.docker.internal:9001/mqtt");
})();

