const sharp = require("sharp");
const fs = require("fs");
const OUT = process.argv[2];
const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fbfb1"/><stop offset="0.55" stop-color="#299d91"/><stop offset="1" stop-color="#1a6159"/></linearGradient>
<radialGradient id="shine" cx="0.25" cy="0.15" r="0.9"><stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<linearGradient id="coin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#f59f00"/></linearGradient>`;
// Glyph drawn in a 1024 box, then scaled by s around the centre.
const glyph = (s, mono = false) => {
  const t = `translate(${512 - 512 * s} ${512 - 512 * s}) scale(${s})`;
  const coin = mono ? "#fff" : "url(#coin)";
  return `<g transform="${t}">
    <path d="M300 770 L512 262 L724 770" fill="none" stroke="#fff" stroke-width="132" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="512" cy="648" r="${mono ? 88 : 92}" fill="${coin}" ${mono ? "" : 'stroke="#1f7a70" stroke-width="16"'}/>
    ${mono ? "" : '<path d="M496 596 h32 M496 648 h32" stroke="#b86e00" stroke-width="0"/>'}
  </g>`;
};
const svg = (body, size = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024"><defs>${GRAD}</defs>${body}</svg>`;
const bgFull = `<rect width="1024" height="1024" fill="url(#g)"/><rect width="1024" height="1024" fill="url(#shine)"/>`;
const tile = `<rect x="0" y="0" width="1024" height="1024" rx="230" fill="url(#g)"/><rect width="1024" height="1024" rx="230" fill="url(#shine)"/>`;

const jobs = {
  // iOS / generic: full-bleed square (OS applies its own mask). Glyph ~62% of canvas.
  "icon.png": [svg(bgFull + glyph(0.78)), 1024],
  // Android adaptive: 108dp canvas, safe zone = inner 66dp (61%). Keep glyph inside ~52% so launchers never crop or oversize it.
  "android-icon-foreground.png": [svg(glyph(0.62)), 1024],
  "android-icon-background.png": [svg(bgFull), 1024],
  "android-icon-monochrome.png": [svg(glyph(0.62, true)), 1024],
  // Splash: rounded tile mark, transparent background (shown at 160dp)
  "splash-icon.png": [svg(tile + glyph(0.78)), 1024],
  "favicon.png": [svg(tile + glyph(0.8)), 96],
  // In-app / store assets
  "logo-mark.png": [svg(tile + glyph(0.78)), 512],
};
(async () => {
  for (const [name, [s, size]] of Object.entries(jobs)) {
    await sharp(Buffer.from(s)).resize(size, size).png().toFile(`${OUT}/${name}`);
    console.log("wrote", name, size);
  }
  fs.writeFileSync(`${OUT}/logo.svg`, svg(tile + glyph(0.78)));
  // preview sheet
  const prev = await Promise.all(["icon.png","android-icon-foreground.png","splash-icon.png"].map(n=>sharp(`${OUT}/${n}`).resize(256,256).png().toBuffer()));
  const bg = await sharp(Buffer.from(svg(bgFull))).resize(256,256).png().toBuffer();
  const fgOnBg = await sharp(bg).composite([{input: prev[1]}]).png().toBuffer();
  const circleMask = Buffer.from('<svg width="256" height="256"><circle cx="128" cy="128" r="128"/></svg>');
  const androidCircle = await sharp(fgOnBg).composite([{input: circleMask, blend: "dest-in"}]).png().toBuffer();
  await sharp({create:{width:860,height:300,channels:4,background:"#f4f5f7"}}).composite([{input:prev[0],left:20,top:22},{input:androidCircle,left:300,top:22},{input:prev[2],left:580,top:22}]).png().toFile(`${process.argv[3]}/preview.png`);
})();
