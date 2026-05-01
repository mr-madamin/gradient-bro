import { mkdir, copyFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await copyFile("src/gradient-bro.css", "dist/gradient-bro.css");
