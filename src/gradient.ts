import { clamp, formatColor, parseColor, round } from "./color";
import type { LinearGradient } from "./types";

const LINEAR_RE = /^linear-gradient\((.*)\)$/i;

export function defaultGradient(): LinearGradient {
  return {
    type: "linear",
    angle: 90,
    stops: [
      { color: parseColor("#ff4d6d"), position: 0 },
      { color: parseColor("#4d96ff"), position: 100 }
    ]
  };
}

export function parseGradient(value: string | LinearGradient): LinearGradient {
  if (typeof value !== "string") return normalizeGradient(value);
  const match = value.trim().match(LINEAR_RE);
  if (!match) throw new Error(`Only linear-gradient values are supported: ${value}`);
  const parts = splitTopLevel(match[1]);
  let angle = 180;
  if (parts[0] && /deg$/i.test(parts[0].trim())) {
    angle = parseFloat(parts.shift() ?? "180");
  } else if (parts[0] && /^to\s+/i.test(parts[0].trim())) {
    angle = directionToAngle(parts.shift() ?? "");
  }
  const stops = parts.map((part, index) => parseStop(part, index, parts.length));
  return normalizeGradient({ type: "linear", angle, stops });
}

export function formatGradient(gradient: LinearGradient): string {
  const normalized = normalizeGradient(gradient);
  const stops = normalized.stops
    .map((stop) => `${formatColor(stop.color, "css")} ${round(stop.position, 2)}%`)
    .join(", ");
  return `linear-gradient(${round(normalized.angle, 2)}deg, ${stops})`;
}

export function normalizeGradient(gradient: LinearGradient): LinearGradient {
  const stops = [...gradient.stops]
    .map((stop) => ({
      color: parseColor(stop.color),
      position: clamp(stop.position, 0, 100)
    }))
    .sort((a, b) => a.position - b.position);
  while (stops.length < 2) {
    stops.push({ color: parseColor(stops[0]?.color ?? "#000"), position: stops.length ? 100 : 0 });
  }
  return { type: "linear", angle: clamp(gradient.angle, 0, 360), stops };
}

export function gradientBackground(gradient: LinearGradient): string {
  return formatGradient(gradient);
}

function parseStop(part: string, index: number, total: number) {
  const trimmed = part.trim();
  const match = trimmed.match(/^(.*?)(?:\s+(-?\d*\.?\d+)%)?$/);
  if (!match) throw new Error(`Invalid gradient stop: ${part}`);
  const color = parseColor(match[1].trim());
  const fallback = total <= 1 ? 0 : (index / (total - 1)) * 100;
  return {
    color,
    position: match[2] === undefined ? fallback : parseFloat(match[2])
  };
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(input.slice(start).trim());
  return parts.filter(Boolean);
}

function directionToAngle(direction: string): number {
  const text = direction.toLowerCase().replace(/\s+/g, " ").trim();
  const map: Record<string, number> = {
    "to top": 0,
    "to top right": 45,
    "to right top": 45,
    "to right": 90,
    "to right bottom": 135,
    "to bottom right": 135,
    "to bottom": 180,
    "to bottom left": 225,
    "to left bottom": 225,
    "to left": 270,
    "to left top": 315,
    "to top left": 315
  };
  return map[text] ?? 180;
}
