// Generates Android (legacy + adaptive) and iOS app icons from assets/brand/*.png.
// Usage: npm i sharp (anywhere) && node tool/generate_icons.js
const sharp = require("sharp");
const fs = require("fs");
const B = "assets/brand/";
const RES = "android/app/src/main/res/";
const IOS = "ios/Runner/Assets.xcassets/AppIcon.appiconset/";
(async () => {
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, s] of Object.entries(dens)) {
    const dir = `${RES}mipmap-${d}/`;
    fs.mkdirSync(dir, { recursive: true });
    // legacy (pre-Android 8) icon: rounded tile, 48dp
    await sharp(B + "splash-icon.png").resize(Math.round(48 * s), Math.round(48 * s)).png().toFile(dir + "ic_launcher.png");
    // adaptive layers: 108dp canvas; glyph already sits inside the 66dp safe zone
    const n = Math.round(108 * s);
    await sharp(B + "android-icon-background.png").resize(n, n).png().toFile(dir + "ic_launcher_background.png");
    await sharp(B + "android-icon-foreground.png").resize(n, n).png().toFile(dir + "ic_launcher_foreground.png");
    await sharp(B + "android-icon-monochrome.png").resize(n, n).png().toFile(dir + "ic_launcher_monochrome.png");
  }
  fs.mkdirSync(RES + "mipmap-anydpi-v26", { recursive: true });
  fs.writeFileSync(RES + "mipmap-anydpi-v26/ic_launcher.xml",
`<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`);
  // iOS: full-bleed square, no alpha (App Store requirement); iOS applies its own mask
  const list = JSON.parse(fs.readFileSync(IOS + "Contents.json", "utf8")).images.filter((i) => i.filename);
  for (const i of list) {
    const px = Math.round(parseFloat(i.size) * parseInt(i.scale));
    await sharp(B + "icon.png").resize(px, px).flatten({ background: "#299d91" }).removeAlpha().png().toFile(IOS + i.filename);
  }
  console.log("icons generated");
})();
