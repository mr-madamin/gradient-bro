import type { ColorFormat, HslaColor, HsvaColor, RgbaColor } from "./types";

const HEX_RE = /^#?([0-9a-f]{3,8})$/i;
const RGB_RE = /^rgba?\((.+)\)$/i;
const HSL_RE = /^hsla?\((.+)\)$/i;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, places = 3): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function normalizeColor(color: Partial<RgbaColor>): RgbaColor {
  return {
    r: clamp(Math.round(color.r ?? 0), 0, 255),
    g: clamp(Math.round(color.g ?? 0), 0, 255),
    b: clamp(Math.round(color.b ?? 0), 0, 255),
    a: clamp(color.a ?? 1, 0, 1)
  };
}

export function parseColor(value: string | RgbaColor): RgbaColor {
  if (typeof value !== "string") return normalizeColor(value);
  const input = value.trim();
  const hex = input.match(HEX_RE);
  if (hex) return parseHex(hex[1]);
  const rgb = input.match(RGB_RE);
  if (rgb) return parseRgb(rgb[1]);
  const hsl = input.match(HSL_RE);
  if (hsl) return hslaToRgba(parseHsl(hsl[1]));
  throw new Error(`Unsupported color value: ${value}`);
}

function parseHex(hex: string): RgbaColor {
  const expanded = hex.length <= 4
    ? hex.split("").map((part) => part + part).join("")
    : hex;
  const hasAlpha = expanded.length === 8;
  if (![6, 8].includes(expanded.length)) throw new Error(`Invalid hex color: #${hex}`);
  return normalizeColor({
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
    a: hasAlpha ? round(parseInt(expanded.slice(6, 8), 16) / 255) : 1
  });
}

function parseRgb(body: string): RgbaColor {
  const parts = splitChannels(body);
  if (parts.length < 3) throw new Error(`Invalid rgb color: ${body}`);
  return normalizeColor({
    r: parseRgbChannel(parts[0]),
    g: parseRgbChannel(parts[1]),
    b: parseRgbChannel(parts[2]),
    a: parts[3] === undefined ? 1 : parseAlpha(parts[3])
  });
}

function parseHsl(body: string): HslaColor {
  const parts = splitChannels(body);
  if (parts.length < 3) throw new Error(`Invalid hsl color: ${body}`);
  return {
    h: normalizeHue(parseFloat(parts[0])),
    s: parsePercent(parts[1]),
    l: parsePercent(parts[2]),
    a: parts[3] === undefined ? 1 : parseAlpha(parts[3])
  };
}

function splitChannels(body: string): string[] {
  return body
    .replace(/\s*\/\s*/g, ",")
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseRgbChannel(part: string): number {
  if (part.endsWith("%")) return clamp((parseFloat(part) / 100) * 255, 0, 255);
  return clamp(parseFloat(part), 0, 255);
}

function parseAlpha(part: string): number {
  if (part.endsWith("%")) return clamp(parseFloat(part) / 100, 0, 1);
  return clamp(parseFloat(part), 0, 1);
}

function parsePercent(part: string): number {
  return clamp(parseFloat(part), 0, 100);
}

export function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

export function rgbaToHsla(color: RgbaColor): HslaColor {
  const { r, g, b, a } = normalizeColor(color);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  return { h: normalizeHue(h), s: round(s * 100), l: round(l * 100), a };
}

export function hslaToRgba(color: HslaColor): RgbaColor {
  const h = normalizeHue(color.h);
  const s = clamp(color.s, 0, 100) / 100;
  const l = clamp(color.l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return normalizeColor({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a: color.a });
}

export function rgbaToHsva(color: RgbaColor): HsvaColor {
  const { r, g, b, a } = normalizeColor(color);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  return { h: normalizeHue(h), s: max === 0 ? 0 : round((d / max) * 100), v: round(max * 100), a };
}

export function hsvaToRgba(color: HsvaColor): RgbaColor {
  const h = normalizeHue(color.h);
  const s = clamp(color.s, 0, 100) / 100;
  const v = clamp(color.v, 0, 100) / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return normalizeColor({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a: color.a });
}

export function formatColor(color: RgbaColor, format: ColorFormat = "hex"): string {
  const rgba = normalizeColor(color);
  if (format === "rgb" || (format === "css" && rgba.a < 1)) {
    return rgba.a < 1
      ? `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${round(rgba.a)})`
      : `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  }
  if (format === "hsl") {
    const hsl = rgbaToHsla(rgba);
    return hsl.a < 1
      ? `hsla(${Math.round(hsl.h)}, ${round(hsl.s)}%, ${round(hsl.l)}%, ${round(hsl.a)})`
      : `hsl(${Math.round(hsl.h)}, ${round(hsl.s)}%, ${round(hsl.l)}%)`;
  }
  return formatHex(rgba);
}

export function formatHex(color: RgbaColor): string {
  const rgba = normalizeColor(color);
  const hex = [rgba.r, rgba.g, rgba.b].map((channel) => channel.toString(16).padStart(2, "0")).join("");
  if (rgba.a >= 1) return `#${hex}`;
  return `#${hex}${Math.round(rgba.a * 255).toString(16).padStart(2, "0")}`;
}
