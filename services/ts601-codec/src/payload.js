function hexToBytes(hex) {
  const clean = hex.trim().toLowerCase().replace(/^0x/, "").replace(/\s+/g, "");
  if (clean.length === 0) return [];
  if (clean.length % 2 !== 0) throw new Error("Chaîne hex invalide (longueur impaire)");
  const out = [];
  for (let i = 0; i < clean.length; i += 2) {
    const b = Number.parseInt(clean.slice(i, i + 2), 16);
    if (Number.isNaN(b)) throw new Error("Chaîne hex invalide");
    out.push(b);
  }
  return out;
}

function base64ToBytes(b64) {
  const buf = Buffer.from(b64.trim(), "base64");
  return Array.from(buf.values());
}

function isAsciiBase64Byte(b) {
  // A-Z a-z 0-9 + / =
  return (
    (b >= 0x41 && b <= 0x5a) ||
    (b >= 0x61 && b <= 0x7a) ||
    (b >= 0x30 && b <= 0x39) ||
    b === 0x2b ||
    b === 0x2f ||
    b === 0x3d
  );
}

function looksLikeAsciiBase64(messageBuf) {
  const buf = Buffer.from(messageBuf);
  if (buf.length === 0) return false;

  let meaningful = 0;
  for (const b of buf.values()) {
    // whitespace
    if (b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d) continue;
    meaningful += 1;
    if (!isAsciiBase64Byte(b)) return false;
  }
  // On évite de classer une payload vide / juste whitespace comme base64
  return meaningful > 0;
}

function rawToBytes(messageBuf) {
  return Array.from(Buffer.from(messageBuf).values());
}

function isAsciiHexByte(b) {
  // 0-9 A-F a-f
  return (
    (b >= 0x30 && b <= 0x39) ||
    (b >= 0x41 && b <= 0x46) ||
    (b >= 0x61 && b <= 0x66)
  );
}

function looksLikeAsciiHex(messageBuf) {
  const buf = Buffer.from(messageBuf);
  if (buf.length === 0) return false;

  for (const b of buf.values()) {
    // whitespace
    if (b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d) continue;
    // allow 'x' for 0x prefix
    if (b === 0x78 || b === 0x58) continue;
    if (!isAsciiHexByte(b)) return false;
  }
  return true;
}

function bytesToHex(bytes) {
  return bytes.map((b) => (b & 0xff).toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  return Buffer.from(Uint8Array.from(bytes)).toString("base64");
}

function parseBytesFromMessage(messageBuf, inputFormat) {
  if (inputFormat === "raw") return rawToBytes(messageBuf);

  // Auto: si c'est de l'ASCII hex, on parse en hex; sinon, on traite comme bytes bruts.
  if (inputFormat === "auto") {
    if (looksLikeAsciiHex(messageBuf)) {
      const rawAscii = Buffer.from(messageBuf).toString("ascii");
      return hexToBytes(rawAscii);
    }
    if (looksLikeAsciiBase64(messageBuf)) {
      const rawAscii = Buffer.from(messageBuf).toString("ascii");
      return base64ToBytes(rawAscii);
    }
    return rawToBytes(messageBuf);
  }

  // IMPORTANT:
  // - hex/base64 sont des encodages ASCII -> on lit en ascii (pas utf8) pour ne pas introduire de '�'
  // - si on demande base64 mais que la payload n'est pas ASCII base64, on fallback en raw (device qui publie du binaire brut)
  const buf = Buffer.from(messageBuf);

  if (inputFormat === "hex") return hexToBytes(buf.toString("ascii"));
  if (inputFormat === "base64") {
    if (!looksLikeAsciiBase64(buf)) return rawToBytes(buf);
    const rawAscii = buf.toString("ascii");
    return base64ToBytes(rawAscii);
  }
  if (inputFormat === "json_bytes") {
    const rawUtf8 = buf.toString("utf8");
    const parsed = JSON.parse(rawUtf8);
    if (!parsed || !Array.isArray(parsed.bytes)) throw new Error("JSON attendu: {\"bytes\":[...]}");
    return parsed.bytes.map((x) => Number(x));
  }

  throw new Error(`CODEC_INPUT_FORMAT inconnu: ${inputFormat}`);
}

function formatBytes(bytes, outputFormat) {
  if (outputFormat === "hex") return bytesToHex(bytes);
  if (outputFormat === "base64") return bytesToBase64(bytes);
  if (outputFormat === "json_bytes") return JSON.stringify({ bytes });
  throw new Error(`CODEC_OUTPUT_BYTES_FORMAT inconnu: ${outputFormat}`);
}

module.exports = {
  parseBytesFromMessage,
  formatBytes,
  bytesToHex,
};

