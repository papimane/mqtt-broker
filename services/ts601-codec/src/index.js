const path = require("node:path");
const mqtt = require("mqtt");

const { loadMilesightCodecFunctions } = require("./ts601-vm");
const { formatBytes, bytesToHex } = require("./payload");
const { mqttTopicMatchesPrefix } = require("./topic");
const { extractUplinkBytes, asBuffer } = require("./uplink-envelope");

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined;

const UPLINK_SUBSCRIBE = process.env.UPLINK_SUBSCRIBE || "ts/+/uplink";
const DECODED_PUBLISH_PREFIX = process.env.DECODED_PUBLISH_PREFIX || "decoded/";

const CMD_SUBSCRIBE = process.env.CMD_SUBSCRIBE || "ts/+/downlink";
const DOWNLINK_PUBLISH_PREFIX = process.env.DOWNLINK_PUBLISH_PREFIX || "encoded/";

const CODEC_INPUT_FORMAT = (process.env.CODEC_INPUT_FORMAT || "hex").toLowerCase();
const CODEC_OUTPUT_BYTES_FORMAT = (process.env.CODEC_OUTPUT_BYTES_FORMAT || "hex").toLowerCase();

const vendorDir = process.env.MILESIGHT_VENDOR_DIR || path.join(__dirname, "..", "vendor", "milesight", "ts601");
const decoderPath = path.join(vendorDir, "ts601-decoder.js");
const encoderPath = path.join(vendorDir, "ts601-encoder.js");

const { decode, encode } = loadMilesightCodecFunctions({ decoderPath, encoderPath });

function topicSuffix(originalTopic) {
  // On évite les doubles "//" si l’utilisateur inclut un suffixe.
  return originalTopic.replace(/^\//, "");
}

const client = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME || undefined,
  password: MQTT_PASSWORD || undefined,
});

client.on("connect", () => {
  client.subscribe([UPLINK_SUBSCRIBE, CMD_SUBSCRIBE], { qos: 0 }, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("Erreur subscribe:", err);
      process.exitCode = 1;
    } else {
      // eslint-disable-next-line no-console
      console.log("Connecté. Subscriptions actives:", { UPLINK_SUBSCRIBE, CMD_SUBSCRIBE });
    }
  });
});

client.on("message", (topic, message) => {
  try {
    if (mqttTopicMatchesPrefix(topic, UPLINK_SUBSCRIBE)) {
      const { bytes, wrapper } = extractUplinkBytes(asBuffer(message), CODEC_INPUT_FORMAT);
      if (bytes.length === 0) {
        // eslint-disable-next-line no-console
        console.error("Uplink: 0 octet après extraction", {
          topic,
          wrapper,
          mqtt_payload_bytes: asBuffer(message).length,
        });
      }
      const decoded = decode(bytes);
      const outTopic = DECODED_PUBLISH_PREFIX + topicSuffix(topic);
      const outPayload = JSON.stringify({
        topic,
        input_format: CODEC_INPUT_FORMAT,
        uplink_wrapper: wrapper,
        byte_length: bytes.length,
        raw_hex: bytesToHex(bytes),
        decoded,
      });
      client.publish(outTopic, outPayload, { qos: 0, retain: false });
      return;
    }

    if (mqttTopicMatchesPrefix(topic, CMD_SUBSCRIBE)) {
      const cmd = JSON.parse(asBuffer(message).toString("utf8"));

      // Support "raw downlink" formats for operational simplicity:
      // - { "hex": "be" } or { "hex": "60 01 a0 05" }
      // - { "base64": "..." }
      // - { "bytes": [1,2,3] }
      // Otherwise, treat as Milesight encoder command object.
      let bytes;
      if (cmd && typeof cmd === "object" && typeof cmd.hex === "string") {
        // Reuse uplink parser to normalize hex -> bytes
        // (parseBytesFromMessage supports hex ASCII).
        // eslint-disable-next-line global-require
        const { parseBytesFromMessage } = require("./payload");
        bytes = parseBytesFromMessage(Buffer.from(cmd.hex, "ascii"), "hex");
      } else if (cmd && typeof cmd === "object" && typeof cmd.base64 === "string") {
        // eslint-disable-next-line global-require
        const { parseBytesFromMessage } = require("./payload");
        bytes = parseBytesFromMessage(Buffer.from(cmd.base64, "ascii"), "base64");
      } else if (cmd && typeof cmd === "object" && Array.isArray(cmd.bytes)) {
        bytes = cmd.bytes.map((x) => Number(x));
      } else {
        bytes = encode(cmd);
      }

      const outTopic = DOWNLINK_PUBLISH_PREFIX + topicSuffix(topic);
      const outPayload = formatBytes(bytes, CODEC_OUTPUT_BYTES_FORMAT);
      client.publish(outTopic, outPayload, { qos: 0, retain: false });
      return;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Erreur traitement message", { topic, error: String(e && e.message ? e.message : e) });
  }
});

client.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("MQTT error:", err);
});

