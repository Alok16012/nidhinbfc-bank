// Renders the app icons (web + Android) from resources/mark.svg.
// Usage: node resources/make-icons.mjs [androidResDir]
import sharp from "sharp";
import { readFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const mark = readFileSync(new URL("./mark.svg", import.meta.url));
const NAVY = "#04246b";

const bg = (size, radius = 0) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
     <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0847c7"/><stop offset="1" stop-color="${NAVY}"/></linearGradient></defs>
     <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
   </svg>`);

async function icon(size, { scale = 0.64, radius = 0, round = false, transparent = false } = {}) {
  const inner = Math.round(size * scale);
  const markPng = await sharp(mark, { density: 1200 }).resize(inner, inner).png().toBuffer();
  const base = transparent
    ? sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    : sharp(bg(size, round ? size / 2 : radius));
  return base.composite([{ input: markPng, gravity: "centre" }]).png().toBuffer();
}

async function write(path, buf) { await sharp(buf).toFile(path); console.log("wrote", path); }

// Web
await write(join(root, "public/icon-192.png"), await icon(192, { radius: 0 }));
await write(join(root, "public/icon-512.png"), await icon(512, { radius: 0 }));
await write(join(root, "public/icon-maskable-512.png"), await icon(512, { scale: 0.5 }));
await write(join(root, "app/apple-icon.png"), await icon(180));
await write(join(root, "app/icon.png"), await icon(64, { scale: 0.92, transparent: true }));

// Android launcher icons
const res = process.argv[2] && resolve(process.argv[2]);
if (res) {
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const dir = join(res, `mipmap-${d}`);
    mkdirSync(dir, { recursive: true });
    await write(join(dir, "ic_launcher.png"), await icon(Math.round(48 * k), { radius: Math.round(48 * k * 0.2) }));
    await write(join(dir, "ic_launcher_round.png"), await icon(Math.round(48 * k), { round: true }));
    // Adaptive foreground: 108dp canvas, artwork inside the 66dp safe zone
    await write(join(dir, "ic_launcher_foreground.png"), await icon(Math.round(108 * k), { scale: 0.5, transparent: true }));
  }
  // Splash: brand mark on the navy canvas, at every size the template ships
  for (const dir of readdirSync(res).filter((d) => d.startsWith("drawable"))) {
    const file = join(res, dir, "splash.png");
    if (!existsSync(file)) continue;
    const { width: w, height: h } = await sharp(file).metadata();
    const m = await sharp(mark, { density: 1200 }).resize(Math.round(Math.min(w, h) * 0.32)).png().toBuffer();
    const splash = await sharp({ create: { width: w, height: h, channels: 4, background: NAVY } })
      .composite([{ input: m, gravity: "centre" }]).png().toBuffer();
    await write(file, splash);
  }
}
