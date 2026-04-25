export type ColorFormat = "hex" | "rgb" | "hsl" | "css";
export type PickerMode = "color" | "gradient";
export type GradientBroEvent = "change" | "commit" | "open" | "close";

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HslaColor {
  h: number;
  s: number;
  l: number;
  a: number;
}

export interface HsvaColor {
  h: number;
  s: number;
  v: number;
  a: number;
}

export interface GradientStop {
  color: RgbaColor;
  position: number;
}

export interface LinearGradient {
  type: "linear";
  angle: number;
  stops: GradientStop[];
}

export interface GradientBroOptions {
  value?: string | RgbaColor | LinearGradient;
  mode?: PickerMode;
  format?: ColorFormat;
  alpha?: boolean;
  swatches?: string[];
  classPrefix?: string;
  inline?: boolean;
  onChange?: (value: string, instance: unknown) => void;
  onCommit?: (value: string, instance: unknown) => void;
}

export type GradientBroHandler = (value: string, instance: unknown) => void;
