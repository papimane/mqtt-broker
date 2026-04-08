function mqttTopicMatchesPrefix(topic, subscribePattern) {
  if (subscribePattern.endsWith("/#")) {
    const base = subscribePattern.slice(0, -2);
    return topic === base || topic.startsWith(base + "/");
  }
  if (subscribePattern.includes("+")) {
    const sp = subscribePattern.split("/");
    const tp = topic.split("/");
    if (sp.length !== tp.length) return false;
    for (let i = 0; i < sp.length; i++) {
      if (sp[i] === "+") continue;
      if (sp[i] !== tp[i]) return false;
    }
    return true;
  }
  return topic === subscribePattern;
}

module.exports = { mqttTopicMatchesPrefix };

