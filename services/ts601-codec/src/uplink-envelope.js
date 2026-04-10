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

function hexToBytesLoose(hex) {
  const clean = String(hex)
    .trim()
    .toLowerCase()
    .replace(/^0x/, "")
    .replace(/[^0-9a-f]/g, "");
  if (clean.length === 0) return [];
  const even = clean.length % 2 === 0 ? clean : clean.slice(0, -1);
  const out = [];
  for (let i = 0; i < even.length; i += 2) {
    const b = Number.parseInt(even.slice(i, i + 2), 16);
    if (Number.isNaN(b)) throw new Error("Envelope JSON: payload_hex invalide");
    out.push(b);
  }
  return out;
}

function base64ToBytesLoose(b64) {
  const s = String(b64).trim();
  if (s.length === 0) return [];
  return Array.from(Buffer.from(s, "base64").values());
}

function bytesFromEnvelopePayload(payload) {
  if (payload == null) {
    throw new Error("Envelope JSON: champ payload manquant");
  }

  if (typeof payload === "string") {
    // Après JSON.parse, chaque caractère U+0000..U+00FF représente souvent 1 octet brut (\u00xx dans le JSON).
    // "latin1" mappe 1 code unit -> 1 octet (0x00-0xFF). "utf8" casse les octets >= 0x80 (ex. U+00FF -> C3 BF).
    const enc = envelopeStringEncoding();
    // Si la string contient U+FFFD (�), les octets d'origine ont été perdus par une conversion UTF-8.
    if (payload.includes("\uFFFD")) {
      throw new Error("Envelope JSON: payload corrompu (contient \\uFFFD / '�'). Utiliser payload_b64/payload_hex.");
    }
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
 * - enveloppe JSON:
 *   - {"payload_b64":"..."} (recommandé, sans perte)
 *   - {"payload_hex":"..."} (sans perte)
 *   - {"payload":[...]}     (sans perte)
 *   - {"payload":"..."}     (string binaire via \u00xx / latin1)
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

    if (parsed && typeof parsed === "object") {
      if ("payload_b64" in parsed) {
        return { bytes: base64ToBytesLoose(parsed.payload_b64), wrapper: "json_envelope_b64" };
      }
      if ("payload_hex" in parsed) {
        return { bytes: hexToBytesLoose(parsed.payload_hex), wrapper: "json_envelope_hex" };
      }
      if ("payload" in parsed) {
        return { bytes: bytesFromEnvelopePayload(parsed.payload), wrapper: "json_envelope" };
      }
    }
  }

  return { bytes: parseBytesFromMessage(buf, inputFormat), wrapper: "none" };
}

module.exports = { extractUplinkBytes, asBuffer, stripBomUtf8 };
