import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { GradientBro, formatColor, formatGradient, parseColor, parseGradient } from "../dist/index.js";

assert.equal(formatColor(parseColor("#abc"), "hex"), "#aabbcc");
assert.equal(formatColor(parseColor("rgba(255, 0, 128, 0.5)"), "rgb"), "rgba(255, 0, 128, 0.5)");
assert.equal(formatColor(parseColor("hsl(210, 100%, 50%)"), "hex"), "#0080ff");

const gradient = parseGradient("linear-gradient(90deg, #000 0%, rgba(255, 255, 255, 0.5) 100%)");
assert.equal(gradient.type, "linear");
assert.equal(gradient.angle, 90);
assert.equal(gradient.stops.length, 2);
assert.equal(formatGradient(gradient), "linear-gradient(90deg, #000000 0%, rgba(255, 255, 255, 0.5) 100%)");

assert.equal(typeof GradientBro, "function");
assert.equal(existsSync("dist/index.js"), true);
assert.equal(existsSync("dist/gradient-bro.umd.js"), true);
assert.equal(existsSync("dist/index.d.ts"), true);
assert.equal(existsSync("dist/gradient-bro.css"), true);

console.log("All tests passed.");
