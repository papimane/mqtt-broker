const test = require("node:test");
const assert = require("node:assert/strict");

const { mqttTopicMatchesPrefix } = require("../src/topic");

test("mqttTopicMatchesPrefix: exact", () => {
  assert.equal(mqttTopicMatchesPrefix("a/b", "a/b"), true);
  assert.equal(mqttTopicMatchesPrefix("a/b/c", "a/b"), false);
});

test("mqttTopicMatchesPrefix: hash wildcard", () => {
  assert.equal(mqttTopicMatchesPrefix("ts601/uplink", "ts601/uplink/#"), true);
  assert.equal(mqttTopicMatchesPrefix("ts601/uplink/x", "ts601/uplink/#"), true);
  assert.equal(mqttTopicMatchesPrefix("ts601/uplink/x/y", "ts601/uplink/#"), true);
  assert.equal(mqttTopicMatchesPrefix("ts601/uplink2/x", "ts601/uplink/#"), false);
});

test("mqttTopicMatchesPrefix: plus wildcard", () => {
  assert.equal(mqttTopicMatchesPrefix("a/b", "a/+"), true);
  assert.equal(mqttTopicMatchesPrefix("a/b/c", "a/+"), false);
  assert.equal(mqttTopicMatchesPrefix("a/b/c", "a/+/c"), true);
  assert.equal(mqttTopicMatchesPrefix("a/x/c", "a/+/c"), true);
  assert.equal(mqttTopicMatchesPrefix("a/x/d", "a/+/c"), false);
});

