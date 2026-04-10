const test = require("node:test");
const assert = require("node:assert/strict");

const { extractUplinkBytes } = require("../src/uplink-envelope");

test("extractUplinkBytes: json envelope string payload -> octets (latin1 par défaut)", () => {
  const inner = `${String.fromCharCode(2)}866846064773608${String.fromCharCode(3)}620010465786520`;
  const envelope = JSON.stringify({ topic: "ts/6447F39968210005/uplink", payload: inner });

  const { bytes, wrapper } = extractUplinkBytes(Buffer.from(envelope, "utf8"), "hex");
  assert.equal(wrapper, "json_envelope");
  assert.deepEqual(bytes.slice(0, 3), [0x02, 0x38, 0x36]);
});

test("extractUplinkBytes: json envelope avec \\u0002 (échappements JSON)", () => {
  const envelope = '{"topic":"t","payload":"\\u0002AB"}';

  const { bytes, wrapper } = extractUplinkBytes(Buffer.from(envelope, "utf8"), "hex");
  assert.equal(wrapper, "json_envelope");
  assert.deepEqual(bytes, [0x02, 0x41, 0x42]);
});

test("extractUplinkBytes: json envelope payload_b64 (recommandé)", () => {
  // bytes: 02 41 42 ff
  const envelope = '{"topic":"t","payload_b64":"AkFC/w=="}';
  const { bytes, wrapper } = extractUplinkBytes(Buffer.from(envelope, "utf8"), "hex");
  assert.equal(wrapper, "json_envelope_b64");
  assert.deepEqual(bytes, [0x02, 0x41, 0x42, 0xff]);
});

test("extractUplinkBytes: json envelope payload_hex", () => {
  const envelope = '{"topic":"t","payload_hex":"02 41 42 FF"}';
  const { bytes, wrapper } = extractUplinkBytes(Buffer.from(envelope, "utf8"), "hex");
  assert.equal(wrapper, "json_envelope_hex");
  assert.deepEqual(bytes, [0x02, 0x41, 0x42, 0xff]);
});

test("extractUplinkBytes: json envelope payload array", () => {
  const envelope = '{"topic":"t","payload":[2,65,66,255]}';
  const { bytes, wrapper } = extractUplinkBytes(Buffer.from(envelope, "utf8"), "hex");
  assert.equal(wrapper, "json_envelope");
  assert.deepEqual(bytes, [0x02, 0x41, 0x42, 0xff]);
});

test("extractUplinkBytes: \\u00ff -> un seul octet 0xFF (latin1), pas UTF-8 2 octets", () => {
  const envelope = '{"topic":"t","payload":"\\u00ff"}';

  const { bytes, wrapper } = extractUplinkBytes(Buffer.from(envelope, "utf8"), "hex");
  assert.equal(wrapper, "json_envelope");
  assert.deepEqual(bytes, [0xff]);
});

test("extractUplinkBytes: payload corrompu avec � -> erreur explicite", () => {
  const envelope = '{"topic":"t","payload":"�"}';
  assert.throws(() => extractUplinkBytes(Buffer.from(envelope, "utf8"), "hex"), /payload corrompu/i);
});

test("extractUplinkBytes: BOM UTF-8 avant {", () => {
  const inner = `${String.fromCharCode(2)}AB`;
  const envelope = JSON.stringify({ topic: "t", payload: inner });
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const buf = Buffer.concat([bom, Buffer.from(envelope, "utf8")]);

  const { bytes, wrapper } = extractUplinkBytes(buf, "hex");
  assert.equal(wrapper, "json_envelope");
  assert.deepEqual(bytes, [0x02, 0x41, 0x42]);
});

test("extractUplinkBytes: non-envelope falls back to CODEC_INPUT_FORMAT", () => {
  const { bytes, wrapper } = extractUplinkBytes(Buffer.from("010203", "utf8"), "hex");
  assert.equal(wrapper, "none");
  assert.deepEqual(bytes, [1, 2, 3]);
});
