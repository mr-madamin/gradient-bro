# Gradient Bro

A zero-runtime-dependency vanilla JavaScript color picker with linear gradient support.

## Features

- Pick solid colors or edit CSS linear gradients.
- Edit HEX, RGB, HSL, and CSS values directly.
- Copy any output format with per-field copy buttons.
- Use alpha, hue, saturation, and brightness controls.
- Choose from built-in tone-ordered swatches or pass your own.
- Add, drag, reorder, and remove gradient stops.
- Use the browser EyeDropper API when supported.

## Install

```sh
npm install gradient-bro
```

## Usage

```html
<link rel="stylesheet" href="node_modules/gradient-bro/dist/gradient-bro.css">
<div id="picker"></div>
<script type="module">
  import { GradientBro } from "gradient-bro";

  const picker = new GradientBro("#picker", {
    mode: "gradient",
    value: "linear-gradient(90deg, #ff4d6d 0%, #4d96ff 100%)",
    onChange(value) {
      document.body.style.background = value;
    }
  });
</script>
```

## Gradient Editing

In gradient mode, click an empty spot on the gradient rail to add a stop at that position. New stops are created with the interpolated color from the gradient at the click point.

Drag a stop horizontally to move it. Drag a stop outside the rail and release to remove it. Click outside a stop to clear the active stop selection.

The `Add stop` button inserts an interpolated stop at 50%. `Remove stop` removes the selected stop, while preserving the minimum two stops needed for a valid gradient.

## API

```ts
new GradientBro(container, {
  value,
  mode: "color" | "gradient",
  format: "hex" | "rgb" | "hsl" | "css",
  alpha: true,
  swatches: ["#ff4d6d", "#4d96ff"],
  classPrefix: "gb",
  inline: true,
  onChange(value, instance) {},
  onCommit(value, instance) {}
});
```

Exports include `GradientBro`, `parseColor`, `parseGradient`, `formatColor`, and `formatGradient`.

## Controls

- `HEX`, `RGB`, `HSL`, and `CSS` fields each include a copy icon.
- The `CSS` field contains the full current value, including `linear-gradient(...)` in gradient mode.
- The `Eyedropper` button appears only when the current browser supports `window.EyeDropper`.

## Examples

Run `npm run preview` and open `/examples/` to browse focused examples for basic colors, gradient editing, form integration, theming, programmatic control, and compact trigger UIs.

## Styling

Gradient Bro ships plain CSS and does not use Shadow DOM. Override stable classes such as `.gb-picker`, `.gb-sv`, `.gb-hue`, `.gb-alpha`, and `.gb-gradient-stop`, or theme with CSS variables:

```css
.gb-picker {
  --gb-bg: #101828;
  --gb-text: #f8fafc;
  --gb-border: #344054;
  --gb-accent: #38bdf8;
  --gb-radius: 6px;
}
```

## Build

```sh
npm install
npm test
```
