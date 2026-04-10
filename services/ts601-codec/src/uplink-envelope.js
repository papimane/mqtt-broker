const { parseBytesFromMessage } = require("./payload");

const BOM_UTF8 = Buffer.from([0xef, 0xbb, 0xbf]);

function asBuffer(message) {
  if (Buffer.isBuffer(message)) return message;
  if (message instanceof Uint8Array) return Buffer.from(message);
  if (typeof message === "string") return Buffer.from(message, "utf8");
  return Buffer.from(message);
}

function stripBomUtf8(buf) {
  if (buf.length >= 3 && buf[0] === BOM_UTF8[0] && buf[1] === BOM_UTF8[1] && buf[2] === BOM_UTF8[2]) {
    return buf.subarray(3);
  }
  return buf;
}

function looksLikeJsonObject(buf) {
  const s = buf.toString("utf8").trimStart();
  return s.length > 0 && s[0] === "{";
}

function envelopeStringEncoding() {
  const v = (process.env.CODEC_ENVELOPE_PAYLOAD_ENCODING || "latin1").toLowerCase();
  if (v === "utf8" || v === "utf-8") return "utf8";
  if (v === "latin1" || v === "binary" || v === "iso-8859-1") return "latin1";
  throw new Error(`CODEC_ENVELOPE_PAYLOAD_ENCODING inconnu: ${process.env.CODEC_ENVELOPE_PAYLOAD_ENCODING}`);
}

function bytesFromEnvelopePayload(payload) {
  if (payload == null) {
    throw new Error("Envelope JSON: champ payload manquant");
  }

  if (typeof payload === "string") {
    // Après JSON.parse, chaque caractère U+0000..U+00FF représente souvent 1 octet brut (\u00xx dans le JSON).
    // "latin1" mappe 1 code unit -> 1 octet (0x00-0xFF). "utf8" casse les octets >= 0x80 (ex. U+00FF -> C3 BF).
    const enc = envelopeStringEncoding();
    return Array.from(Buffer.from(payload, enc).values());
  }

  if (Array.isArray(payload)) {
    return payload.map((x) => Number(x));
  }

  if (typeof payload === "object") {
    throw new Error("Envelope JSON: payload doit être string ou array de bytes");
  }

  throw new Error("Envelope JSON: payload invalide");
}

/**
 * Supporte 2 formats uplink:
 * - brut: hex/base64/json_bytes (via CODEC_INPUT_FORMAT)
 * - enveloppe JSON: {"topic":"...","payload":"..."} (payload string binaire encodée en JSON UTF-8)
 */
function extractUplinkBytes(messageBuf, inputFormat) {
  const buf = stripBomUtf8(asBuffer(messageBuf));

  if (looksLikeJsonObject(buf)) {
    let parsed;
    try {
      parsed = JSON.parse(buf.toString("utf8"));
    } catch {
      parsed = null;
    }

    if (parsed && typeof parsed === "object" && "payload" in parsed) {
      return { bytes: bytesFromEnvelopePayload(parsed.payload), wrapper: "json_envelope" };
    }
  }

  return { bytes: parseBytesFromMessage(buf, inputFormat), wrapper: "none" };
}

module.exports = { extractUplinkBytes, asBuffer, stripBomUtf8 };
