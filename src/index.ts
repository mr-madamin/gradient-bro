import {
  clamp,
  formatColor,
  hsvaToRgba,
  parseColor,
  rgbaToHsla,
  rgbaToHsva,
  type normalizeHue
} from "./color";
import { defaultGradient, formatGradient, gradientBackground, normalizeGradient, parseGradient } from "./gradient";
import { Emitter } from "./events";
import type {
  ColorFormat,
  GradientBroEvent,
  GradientBroHandler,
  GradientBroOptions,
  HsvaColor,
  LinearGradient,
  PickerMode,
  RgbaColor
} from "./types";

export { formatColor, parseColor } from "./color";
export { formatGradient, parseGradient } from "./gradient";
export type {
  ColorFormat,
  GradientBroEvent,
  GradientBroHandler,
  GradientBroOptions,
  GradientStop,
  HslaColor,
  HsvaColor,
  LinearGradient,
  PickerMode,
  RgbaColor
} from "./types";

type Elements = {
  root: HTMLDivElement;
  sv: HTMLDivElement;
  svHandle: HTMLDivElement;
  hue: HTMLInputElement;
  alpha: HTMLInputElement;
  preview: HTMLDivElement;
  hex: HTMLInputElement;
  rgb: HTMLInputElement;
  hsl: HTMLInputElement;
  css: HTMLInputElement;
  copyButtons: NodeListOf<HTMLButtonElement>;
  swatches: HTMLDivElement;
  gradientPanel: HTMLDivElement;
  gradientRail: HTMLDivElement;
  stops: HTMLDivElement;
  angle: HTMLInputElement;
  addStop: HTMLButtonElement;
  removeStop: HTMLButtonElement;
  eyedropper?: HTMLButtonElement;
};

const DEFAULT_SWATCHES = [
  "#ef4444",
  "#f97316",
  "#ffb703",
  "#84cc16",
  "#22c55e",
  "#2ec4b6",
  "#06b6d4",
  "#4d96ff",
  "#6366f1",
  "#7b2cbf",
  "#ff4d6d",
  "#111827",
  "#f8fafc"
];
const HUE_SLIDER_MAX = 359;

export class GradientBro {
  private container: HTMLElement;
  private options: Required<Omit<GradientBroOptions, "value" | "onChange" | "onCommit">> & Pick<GradientBroOptions, "onChange" | "onCommit">;
  private emitter = new Emitter();
  private color: RgbaColor;
  private gradient: LinearGradient;
  private selectedStop = 0;
  private mode: PickerMode;
  private elements: Elements;
  private cleanups: Array<() => void> = [];
  private stopDeletePreview = false;

  constructor(container: HTMLElement | string, options: GradientBroOptions = {}) {
    const target = typeof container === "string" ? document.querySelector<HTMLElement>(container) : container;
    if (!target) throw new Error("GradientBro container was not found.");
    this.container = target;
    this.options = {
      mode: options.mode ?? "color",
      format: options.format ?? "hex",
      alpha: options.alpha ?? true,
      swatches: options.swatches ?? DEFAULT_SWATCHES,
      classPrefix: options.classPrefix ?? "gb",
      inline: options.inline ?? true,
      onChange: options.onChange,
      onCommit: options.onCommit
    };
    this.mode = this.options.mode;
    this.color = parseColor("#ff4d6d");
    this.gradient = defaultGradient();
    this.applyInitialValue(options.value);
    this.elements = this.render();
    this.bind();
    this.sync();
    this.emit("open");
  }

  getValue(): string {
    return this.mode === "gradient" ? formatGradient(this.gradient) : formatColor(this.color, this.options.format);
  }

  setValue(value: string | RgbaColor | LinearGradient): void {
    if (typeof value === "string" && value.trim().toLowerCase().startsWith("linear-gradient")) {
      this.mode = "gradient";
      this.gradient = parseGradient(value);
      this.selectedStop = 0;
      this.color = this.gradient.stops[0].color;
    } else if (typeof value === "object" && "stops" in value) {
      this.mode = "gradient";
      this.gradient = normalizeGradient(value);
      this.selectedStop = 0;
      this.color = this.gradient.stops[0].color;
    } else {
      this.mode = "color";
      this.color = parseColor(value as string | RgbaColor);
    }
    this.sync();
    this.emit("change");
  }

  destroy(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.emitter.clear();
    this.elements.root.remove();
    this.emit("close");
  }

  on(event: GradientBroEvent, handler: GradientBroHandler): void {
    this.emitter.on(event, handler);
  }

  off(event: GradientBroEvent, handler: GradientBroHandler): void {
    this.emitter.off(event, handler);
  }

  private applyInitialValue(value: GradientBroOptions["value"]): void {
    if (!value) return;
    if (typeof value === "string" && value.trim().toLowerCase().startsWith("linear-gradient")) {
      this.mode = "gradient";
      this.gradient = parseGradient(value);
      this.color = this.gradient.stops[0].color;
      return;
    }
    if (typeof value === "object" && "stops" in value) {
      this.mode = "gradient";
      this.gradient = normalizeGradient(value);
      this.color = this.gradient.stops[0].color;
      return;
    }
    this.color = parseColor(value as string | RgbaColor);
  }

  private render(): Elements {
    const p = this.options.classPrefix;
    const root = el("div", `${p}-picker ${p}-picker--${this.options.inline ? "inline" : "popover"}`);
    root.innerHTML = `
      <div class="${p}-top">
        <div class="${p}-sv" role="slider" aria-label="Saturation and brightness" tabindex="0">
          <div class="${p}-sv-handle"></div>
        </div>
        <div class="${p}-preview" aria-label="Selected color preview"></div>
      </div>
      <label class="${p}-control"><span>Hue</span><input class="${p}-hue" type="range" min="0" max="${HUE_SLIDER_MAX}" value="0" aria-label="Hue"></label>
      <label class="${p}-control"><span>Alpha</span><input class="${p}-alpha" type="range" min="0" max="100" value="100" aria-label="Alpha"></label>
      <div class="${p}-inputs">
        <label><span>HEX</span><button class="${p}-copy" type="button" data-copy="hex" aria-label="Copy HEX code">${copyIcon()}</button><input class="${p}-hex" aria-label="Hex color"></label>
        <label><span>RGB</span><button class="${p}-copy" type="button" data-copy="rgb" aria-label="Copy RGB code">${copyIcon()}</button><input class="${p}-rgb" aria-label="RGB color"></label>
        <label><span>HSL</span><button class="${p}-copy" type="button" data-copy="hsl" aria-label="Copy HSL code">${copyIcon()}</button><input class="${p}-hsl" aria-label="HSL color"></label>
        <label class="${p}-css-field"><span>CSS</span><button class="${p}-copy" type="button" data-copy="css" aria-label="Copy CSS code">${copyIcon()}</button><input class="${p}-css" aria-label="CSS color or gradient"></label>
      </div>
      <div class="${p}-actions"></div>
      <div class="${p}-swatches" aria-label="Color swatches"></div>
      <div class="${p}-gradient-panel">
        <div class="${p}-gradient-rail" aria-label="Gradient rail"><div class="${p}-gradient-stops"></div></div>
        <div class="${p}-gradient-tools">
          <label><span>Angle</span><input class="${p}-angle" type="number" min="0" max="360" value="90" aria-label="Gradient angle"></label>
          <button class="${p}-add-stop" type="button">Add stop</button>
          <button class="${p}-remove-stop" type="button">Remove stop</button>
        </div>
      </div>
    `;
    this.container.append(root);

    const actions = root.querySelector<HTMLDivElement>(`.${p}-actions`)!;
    const eyedropper = this.createEyedropperButton(actions);
    return {
      root,
      sv: root.querySelector<HTMLDivElement>(`.${p}-sv`)!,
      svHandle: root.querySelector<HTMLDivElement>(`.${p}-sv-handle`)!,
      hue: root.querySelector<HTMLInputElement>(`.${p}-hue`)!,
      alpha: root.querySelector<HTMLInputElement>(`.${p}-alpha`)!,
      preview: root.querySelector<HTMLDivElement>(`.${p}-preview`)!,
      hex: root.querySelector<HTMLInputElement>(`.${p}-hex`)!,
      rgb: root.querySelector<HTMLInputElement>(`.${p}-rgb`)!,
      hsl: root.querySelector<HTMLInputElement>(`.${p}-hsl`)!,
      css: root.querySelector<HTMLInputElement>(`.${p}-css`)!,
      copyButtons: root.querySelectorAll<HTMLButtonElement>(`.${p}-copy`),
      swatches: root.querySelector<HTMLDivElement>(`.${p}-swatches`)!,
      gradientPanel: root.querySelector<HTMLDivElement>(`.${p}-gradient-panel`)!,
      gradientRail: root.querySelector<HTMLDivElement>(`.${p}-gradient-rail`)!,
      stops: root.querySelector<HTMLDivElement>(`.${p}-gradient-stops`)!,
      angle: root.querySelector<HTMLInputElement>(`.${p}-angle`)!,
      addStop: root.querySelector<HTMLButtonElement>(`.${p}-add-stop`)!,
      removeStop: root.querySelector<HTMLButtonElement>(`.${p}-remove-stop`)!,
      eyedropper
    };
  }

  private bind(): void {
    this.listen(this.elements.hue, "input", () => this.updateColor({ h: Number(this.elements.hue.value) }));
    this.listen(this.elements.alpha, "input", () => this.updateColor({ a: Number(this.elements.alpha.value) / 100 }));
    this.listen(this.elements.hue, "change", () => this.emit("commit"));
    this.listen(this.elements.alpha, "change", () => this.emit("commit"));
    this.listen(this.elements.sv, "pointerdown", (event) => this.dragSv(event as PointerEvent));
    this.listen(this.elements.sv, "keydown", (event) => this.keySv(event as KeyboardEvent));
    this.listen(this.elements.hex, "change", () => this.applyInput(this.elements.hex.value));
    this.listen(this.elements.rgb, "change", () => this.applyInput(this.elements.rgb.value));
    this.listen(this.elements.hsl, "change", () => this.applyInput(this.elements.hsl.value));
    this.listen(this.elements.css, "change", () => this.applyInput(this.elements.css.value));
    this.elements.copyButtons.forEach((button) => {
      this.listen(button, "click", () => void this.copyValue(button));
    });
    this.listen(this.elements.addStop, "click", () => this.addStop());
    this.listen(this.elements.removeStop, "click", () => this.removeStop());
    this.listen(this.elements.angle, "change", () => {
      this.mode = "gradient";
      this.gradient = normalizeGradient({ ...this.gradient, angle: Number(this.elements.angle.value) });
      this.sync();
      this.emit("change");
      this.emit("commit");
    });
    this.listen(this.elements.gradientRail, "click", (event) => this.addStopAt(event as MouseEvent));
    this.options.swatches.forEach((swatch) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `${this.options.classPrefix}-swatch`;
      button.style.background = swatch;
      button.setAttribute("aria-label", `Use ${swatch}`);
      button.addEventListener("click", () => {
        this.setActiveColor(parseColor(swatch));
        this.emit("change");
        this.emit("commit");
      });
      this.elements.swatches.append(button);
    });
  }

  private sync(): void {
    const p = this.options.classPrefix;
    const hsva = rgbaToHsva(this.color);
    const hsl = rgbaToHsla(this.color);
    this.elements.root.classList.toggle(`${p}-picker--gradient`, this.mode === "gradient");
    this.elements.gradientPanel.hidden = this.mode !== "gradient";
    this.elements.sv.style.backgroundColor = `hsl(${hsva.h}, 100%, 50%)`;
    this.elements.svHandle.style.left = `${hsva.s}%`;
    this.elements.svHandle.style.top = `${100 - hsva.v}%`;
    this.elements.hue.value = String(Math.round(hsva.h));
    this.elements.alpha.value = String(Math.round(this.color.a * 100));
    this.elements.preview.style.background = formatColor(this.color, "css");
    this.elements.hex.value = formatColor(this.color, "hex");
    this.elements.rgb.value = formatColor(this.color, "rgb");
    this.elements.hsl.value = formatColor(this.color, "hsl");
    this.elements.css.value = this.getValue();
    this.elements.angle.value = String(Math.round(this.gradient.angle));
    this.elements.hue.style.setProperty("--gb-hue", String(hsva.h));
    this.elements.alpha.style.background = `linear-gradient(90deg, rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0), rgb(${this.color.r}, ${this.color.g}, ${this.color.b}))`;
    this.elements.sv.setAttribute("aria-valuetext", `saturation ${Math.round(hsva.s)}%, brightness ${Math.round(hsva.v)}%`);
    this.elements.gradientRail.style.background = gradientBackground(this.gradient);
    this.renderStops();
    void hsl;
  }

  private renderStops(): void {
    this.elements.stops.innerHTML = "";
    this.gradient.stops.forEach((stop, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `${this.options.classPrefix}-gradient-stop`;
      button.style.left = `${stop.position}%`;
      button.style.background = formatColor(stop.color, "css");
      button.setAttribute("aria-label", `Gradient stop ${index + 1}`);
      button.setAttribute("aria-valuemin", "0");
      button.setAttribute("aria-valuemax", "100");
      button.setAttribute("aria-valuenow", String(Math.round(stop.position)));
      button.setAttribute("role", "slider");
      if (index === this.selectedStop) button.classList.add(`${this.options.classPrefix}-gradient-stop--active`);
      if (index === this.selectedStop && this.stopDeletePreview) button.classList.add(`${this.options.classPrefix}-gradient-stop--delete`);
      button.addEventListener("pointerdown", (event) => this.dragStop(event, index));
      button.addEventListener("click", () => this.selectStop(index));
      button.addEventListener("keydown", (event) => this.keyStop(event, index));
      this.elements.stops.append(button);
    });
  }

  private updateColor(partial: Partial<HsvaColor>): void {
    const current = rgbaToHsva(this.color);
    this.setActiveColor(hsvaToRgba({ ...current, ...partial }));
    this.emit("change");
  }

  private setActiveColor(color: RgbaColor): void {
    this.color = color;
    if (this.mode === "gradient") {
      const stops = [...this.gradient.stops];
      const position = stops[this.selectedStop]?.position ?? 0;
      stops[this.selectedStop] = { ...stops[this.selectedStop], color };
      this.gradient = normalizeGradient({ ...this.gradient, stops });
      this.selectedStop = this.findStopIndexByPosition(position);
    }
    this.sync();
  }

  private selectStop(index: number): void {
    this.mode = "gradient";
    this.selectedStop = clamp(index, 0, this.gradient.stops.length - 1);
    this.color = this.gradient.stops[this.selectedStop].color;
    this.sync();
  }

  private addStop(): void {
    this.mode = "gradient";
    const position = 50;
    this.gradient = normalizeGradient({
      ...this.gradient,
      stops: [...this.gradient.stops, { color: this.getGradientColorAt(position), position }]
    });
    this.selectedStop = this.findStopIndexByPosition(position);
    this.color = this.gradient.stops[this.selectedStop].color;
    this.sync();
    this.emit("change");
    this.emit("commit");
  }

  private addStopAt(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest(`.${this.options.classPrefix}-gradient-stop`)) return;
    const position = this.getGradientPosition(event);
    this.mode = "gradient";
    this.gradient = normalizeGradient({ ...this.gradient, stops: [...this.gradient.stops, { color: this.getGradientColorAt(position), position }] });
    this.selectedStop = this.findStopIndexByPosition(position);
    this.color = this.gradient.stops[this.selectedStop].color;
    this.sync();
    this.emit("change");
    this.emit("commit");
  }

  private removeStop(): void {
    if (this.gradient.stops.length <= 2) return;
    const stops = this.gradient.stops.filter((_, index) => index !== this.selectedStop);
    this.gradient = normalizeGradient({ ...this.gradient, stops });
    this.selectedStop = clamp(this.selectedStop, 0, this.gradient.stops.length - 1);
    this.color = this.gradient.stops[this.selectedStop].color;
    this.sync();
    this.emit("change");
    this.emit("commit");
  }

  private dragSv(event: PointerEvent): void {
    event.preventDefault();
    const move = (pointer: PointerEvent) => {
      const rect = this.elements.sv.getBoundingClientRect();
      const s = clamp(((pointer.clientX - rect.left) / rect.width) * 100, 0, 100);
      const v = clamp(100 - ((pointer.clientY - rect.top) / rect.height) * 100, 0, 100);
      this.updateColor({ s, v });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      this.emit("commit");
    };
    move(event);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  private dragStop(event: PointerEvent, index: number): void {
    event.preventDefault();
    this.selectStop(index);
    const move = (pointer: PointerEvent) => {
      this.stopDeletePreview = this.gradient.stops.length > 2 && this.isOutsideGradientRail(pointer);
      this.elements.root.classList.toggle(`${this.options.classPrefix}-picker--delete-stop`, this.stopDeletePreview);
      const position = this.getGradientPosition(pointer);
      const stops = [...this.gradient.stops];
      stops[this.selectedStop] = { ...stops[this.selectedStop], position };
      this.gradient = normalizeGradient({ ...this.gradient, stops });
      this.selectedStop = this.findStopIndexByPosition(position);
      this.sync();
      this.emit("change");
    };
    const up = (pointer: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      this.stopDeletePreview = false;
      this.elements.root.classList.remove(`${this.options.classPrefix}-picker--delete-stop`);
      if (this.gradient.stops.length > 2 && this.isOutsideGradientRail(pointer)) {
        this.removeStop();
        return;
      }
      this.emit("commit");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  private getGradientPosition(event: MouseEvent | PointerEvent): number {
    const rect = this.elements.stops.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  }

  private getGradientColorAt(position: number): RgbaColor {
    const stops = normalizeGradient(this.gradient).stops;
    const rightIndex = stops.findIndex((stop) => stop.position >= position);
    if (rightIndex === -1) return { ...stops[stops.length - 1].color };
    if (rightIndex === 0) return { ...stops[0].color };

    const left = stops[rightIndex - 1];
    const right = stops[rightIndex];
    const span = right.position - left.position;
    const amount = span === 0 ? 0 : (position - left.position) / span;
    return {
      r: Math.round(left.color.r + (right.color.r - left.color.r) * amount),
      g: Math.round(left.color.g + (right.color.g - left.color.g) * amount),
      b: Math.round(left.color.b + (right.color.b - left.color.b) * amount),
      a: left.color.a + (right.color.a - left.color.a) * amount
    };
  }

  private isOutsideGradientRail(event: PointerEvent): boolean {
    const rect = this.elements.gradientRail.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }

  private keySv(event: KeyboardEvent): void {
    const current = rgbaToHsva(this.color);
    const step = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowRight") this.updateColor({ s: current.s + step });
    else if (event.key === "ArrowLeft") this.updateColor({ s: current.s - step });
    else if (event.key === "ArrowUp") this.updateColor({ v: current.v + step });
    else if (event.key === "ArrowDown") this.updateColor({ v: current.v - step });
    else return;
    event.preventDefault();
    this.emit("commit");
  }

  private keyStop(event: KeyboardEvent, index: number): void {
    const step = event.shiftKey ? 10 : 1;
    if (!["ArrowLeft", "ArrowRight", "Delete", "Backspace"].includes(event.key)) return;
    event.preventDefault();
    this.selectStop(index);
    if (event.key === "Delete" || event.key === "Backspace") {
      this.removeStop();
      return;
    }
    const stops = [...this.gradient.stops];
    const delta = event.key === "ArrowRight" ? step : -step;
    stops[this.selectedStop] = { ...stops[this.selectedStop], position: stops[this.selectedStop].position + delta };
    this.gradient = normalizeGradient({ ...this.gradient, stops });
    this.sync();
    this.emit("change");
    this.emit("commit");
  }

  private applyInput(value: string): void {
    try {
      this.setValue(value);
      this.emit("commit");
    } catch {
      this.sync();
    }
  }

  private async copyValue(button: HTMLButtonElement): Promise<void> {
    const target = button.dataset.copy as "hex" | "rgb" | "hsl" | "css";
    const value = this.elements[target].value;
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          this.copyWithTextarea(value);
        }
      } else {
        this.copyWithTextarea(value);
      }
      this.showCopyFeedback(button, true);
    } catch {
      this.showCopyFeedback(button, false);
    }
  }

  private copyWithTextarea(value: string): void {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy command failed.");
  }

  private showCopyFeedback(button: HTMLButtonElement, copied: boolean): void {
    button.innerHTML = copied ? checkIcon() : copyIcon();
    button.classList.toggle(`${this.options.classPrefix}-copy--copied`, copied);
    window.setTimeout(() => {
      button.innerHTML = copyIcon();
      button.classList.remove(`${this.options.classPrefix}-copy--copied`);
    }, 1200);
  }

  private createEyedropperButton(parent: HTMLElement): HTMLButtonElement | undefined {
    if (!("EyeDropper" in window)) return undefined;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${this.options.classPrefix}-eyedropper`;
    button.textContent = "Eyedropper";
    button.title = "Pick a color from the screen";
    button.setAttribute("aria-label", "Pick a color from the screen");
    button.addEventListener("click", async () => {
      const EyeDropperCtor = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      button.disabled = true;
      button.textContent = "Picking...";
      try {
        const result = await new EyeDropperCtor().open();
        this.setActiveColor(parseColor(result.sRGBHex));
        this.emit("change");
        this.emit("commit");
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") {
          button.textContent = "Unavailable";
          window.setTimeout(() => {
            button.textContent = "Eyedropper";
          }, 1200);
        }
      } finally {
        button.disabled = false;
        if (button.textContent === "Picking...") button.textContent = "Eyedropper";
      }
    });
    parent.append(button);
    return button;
  }

  private listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener);
    this.cleanups.push(() => target.removeEventListener(type, listener));
  }

  private emit(event: GradientBroEvent): void {
    const value = this.getValue();
    this.emitter.emit(event, value, this);
    if (event === "change") this.options.onChange?.(value, this);
    if (event === "commit") this.options.onCommit?.(value, this);
  }

  private findStopIndexByPosition(position: number): number {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    this.gradient.stops.forEach((stop, index) => {
      const distance = Math.abs(stop.position - position);
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    });
    return bestIndex;
  }
}

function el<T extends keyof HTMLElementTagNameMap>(tag: T, className: string): HTMLElementTagNameMap[T] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function copyIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2"></rect>
      <path d="M5 15V6a1 1 0 0 1 1-1h9"></path>
    </svg>
  `;
}

function checkIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5"></path>
    </svg>
  `;
}
