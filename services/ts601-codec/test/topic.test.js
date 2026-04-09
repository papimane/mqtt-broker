const test = require("node:test");
const assert = require("node:assert/strict");

const { mqttTopicMatchesPrefix } = require("../src/topic");

test("mqttTopicMatchesPrefix: exact", () => {
  assert.equal(mqttTopicMatchesPrefix("a/b", "a/b"), true);
  assert.equal(mqttTopicMatchesPrefix("a/b/c", "a/b"), false);
});

test("mqttTopicMatchesPrefix: hash wildcard", () => {
  assert.equal(mqttTopicMatchesPrefix("ts/ABC123/uplink", "ts/+/uplink"), true);
  assert.equal(mqttTopicMatchesPrefix("ts/ABC123/uplink/x", "ts/+/uplink"), false);
  // NB: l'implémentation supporte seulement les patterns qui FINISSENT par "/#"
  // (pas des patterns mixtes "ts/+/uplink/#").
  assert.equal(mqttTopicMatchesPrefix("ts/ABC123/uplink", "ts/#"), true);
  assert.equal(mqttTopicMatchesPrefix("ts/ABC123/uplink/x", "ts/#"), true);
  assert.equal(mqttTopicMatchesPrefix("ts/ABC123/uplink/x/y", "ts/#"), true);
  assert.equal(mqttTopicMatchesPrefix("ts/ABC123/uplink2/x", "ts/+/uplink"), false);
});

test("mqttTopicMatchesPrefix: plus wildcard", () => {
  assert.equal(mqttTopicMatchesPrefix("a/b", "a/+"), true);
  assert.equal(mqttTopicMatchesPrefix("a/b/c", "a/+"), false);
  assert.equal(mqttTopicMatchesPrefix("a/b/c", "a/+/c"), true);
  assert.equal(mqttTopicMatchesPrefix("a/x/c", "a/+/c"), true);
  assert.equal(mqttTopicMatchesPrefix("a/x/d", "a/+/c"), false);
});

