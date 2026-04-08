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

function bytesToHex(bytes) {
  return bytes.map((b) => (b & 0xff).toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  return Buffer.from(Uint8Array.from(bytes)).toString("base64");
}

function parseBytesFromMessage(messageBuf, inputFormat) {
  const raw = messageBuf.toString("utf8");

  if (inputFormat === "hex") return hexToBytes(raw);
  if (inputFormat === "base64") return base64ToBytes(raw);
  if (inputFormat === "json_bytes") {
    const parsed = JSON.parse(raw);
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

