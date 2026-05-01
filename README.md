# Gradient Bro

A zero-runtime-dependency vanilla JavaScript color picker with linear gradient support.

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
