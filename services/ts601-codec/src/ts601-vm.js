const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadMilesightCodecFunctions({ decoderPath, encoderPath }) {
  const context = vm.createContext({
    // Réduire le bruit: certains codecs loggent en console.
    console: { log: () => {}, error: () => {}, warn: () => {}, info: () => {} },
  });

  const decoderCode = fs.readFileSync(decoderPath, "utf8");
  const encoderCode = fs.readFileSync(encoderPath, "utf8");

  new vm.Script(decoderCode, { filename: path.basename(decoderPath) }).runInContext(context);
  new vm.Script(encoderCode, { filename: path.basename(encoderPath) }).runInContext(context);

  const decode = context.milesightDeviceDecode;
  const encode = context.milesightDeviceEncode;

  if (typeof decode !== "function") {
    throw new Error("Fonction milesightDeviceDecode introuvable dans le décodeur TS601");
  }
  if (typeof encode !== "function") {
    throw new Error("Fonction milesightDeviceEncode introuvable dans l’encodeur TS601");
  }

  return { decode, encode };
}

module.exports = { loadMilesightCodecFunctions };

