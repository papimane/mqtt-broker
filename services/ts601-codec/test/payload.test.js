const test = require("node:test");
const assert = require("node:assert/strict");

const { parseBytesFromMessage, formatBytes } = require("../src/payload");

test("parseBytesFromMessage: hex", () => {
  const buf = Buffer.from("0101", "utf8");
  assert.deepEqual(parseBytesFromMessage(buf, "hex"), [1, 1]);
});

test("parseBytesFromMessage: hex ignores spaces and 0x", () => {
  const buf = Buffer.from("0x01 01", "utf8");
  assert.deepEqual(parseBytesFromMessage(buf, "hex"), [1, 1]);
});

test("parseBytesFromMessage: base64", () => {
  const buf = Buffer.from(Buffer.from([1, 2, 3]).toString("base64"), "utf8");
  assert.deepEqual(parseBytesFromMessage(buf, "base64"), [1, 2, 3]);
});

test("parseBytesFromMessage: json_bytes", () => {
  const buf = Buffer.from(JSON.stringify({ bytes: [9, 8, 7] }), "utf8");
  assert.deepEqual(parseBytesFromMessage(buf, "json_bytes"), [9, 8, 7]);
});

test("formatBytes: hex", () => {
  assert.equal(formatBytes([1, 255], "hex"), "01ff");
});

test("formatBytes: base64", () => {
  assert.equal(formatBytes([1, 2, 3], "base64"), Buffer.from([1, 2, 3]).toString("base64"));
});

test("formatBytes: json_bytes", () => {
  assert.equal(formatBytes([1, 2], "json_bytes"), JSON.stringify({ bytes: [1, 2] }));
});

