import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets', 'images');

// The login page logo: green circle background (#E8F5E9) with
// Ionicons checkmark-done-circle (#4CAF50) — a circle containing double checkmarks.
// We recreate this as an SVG for the app icon.

function createIconSvg(size) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42; // outer circle background
  const iconR = size * 0.35;  // the checkmark-done-circle icon radius

  // Double-checkmark paths scaled to the icon
  // Front checkmark (the main visible one)
  const s = size / 512; // scale factor
  const frontCheck = `M${206*s},${261*s} L${153*s},${314*s} L${139*s},${300*s} L${206*s},${233*s} L${361*s},${388*s} L${347*s},${402*s} Z`;
  const backCheck = `M${256*s},${211*s} L${203*s},${264*s} L${189*s},${250*s} L${256*s},${183*s} L${411*s},${338*s} L${397*s},${352*s} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#E8F5E9" rx="${size * 0.18}"/>

  <!-- Main circle -->
  <circle cx="${cx}" cy="${cy}" r="${outerR}" fill="#4CAF50"/>

  <!-- Double checkmark -->
  <!-- Back checkmark (slightly offset) -->
  <polyline
    points="${cx - size*0.18},${cy + size*0.01} ${cx - size*0.07},${cy + size*0.12} ${cx + size*0.2},${cy - size*0.15}"
    fill="none" stroke="white" stroke-width="${size*0.06}" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Front checkmark (offset forward) -->
  <polyline
    points="${cx - size*0.10},${cy + size*0.01} ${cx + size*0.01},${cy + size*0.12} ${cx + size*0.28},${cy - size*0.15}"
    fill="none" stroke="white" stroke-width="${size*0.06}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function createSplashSvg(size) {
  // Splash icon: just the icon on transparent background
  return createIconSvg(size);
}

function createFaviconSvg(size) {
  return createIconSvg(size);
}

function createAndroidForegroundSvg(size) {
  // Android adaptive icon foreground: the icon centered with safe zone padding
  const padding = size * 0.25; // adaptive icons need ~25% padding
  const iconSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = iconSize * 0.42;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Transparent background for foreground layer -->
  <circle cx="${cx}" cy="${cy}" r="${outerR}" fill="#4CAF50"/>

  <!-- Double checkmark -->
  <polyline
    points="${cx - iconSize*0.18},${cy + iconSize*0.01} ${cx - iconSize*0.07},${cy + iconSize*0.12} ${cx + iconSize*0.2},${cy - iconSize*0.15}"
    fill="none" stroke="white" stroke-width="${iconSize*0.06}" stroke-linecap="round" stroke-linejoin="round"/>

  <polyline
    points="${cx - iconSize*0.10},${cy + iconSize*0.01} ${cx + iconSize*0.01},${cy + iconSize*0.12} ${cx + iconSize*0.28},${cy - iconSize*0.15}"
    fill="none" stroke="white" stroke-width="${iconSize*0.06}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function createAndroidBackgroundSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#E8F5E9"/>
</svg>`;
}

function createAndroidMonochromeSvg(size) {
  const padding = size * 0.25;
  const iconSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = iconSize * 0.42;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${cx}" cy="${cy}" r="${outerR}" fill="white"/>

  <polyline
    points="${cx - iconSize*0.18},${cy + iconSize*0.01} ${cx - iconSize*0.07},${cy + iconSize*0.12} ${cx + iconSize*0.2},${cy - iconSize*0.15}"
    fill="none" stroke="black" stroke-width="${iconSize*0.06}" stroke-linecap="round" stroke-linejoin="round"/>

  <polyline
    points="${cx - iconSize*0.10},${cy + iconSize*0.01} ${cx + iconSize*0.01},${cy + iconSize*0.12} ${cx + iconSize*0.28},${cy - iconSize*0.15}"
    fill="none" stroke="black" stroke-width="${iconSize*0.06}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

async function generate() {
  // Main icon (1024x1024)
  const iconSvg = Buffer.from(createIconSvg(1024));
  await sharp(iconSvg).resize(1024, 1024).png().toFile(join(assetsDir, 'icon.png'));
  console.log('Generated icon.png (1024x1024)');

  // Splash icon (1024x1024)
  const splashSvg = Buffer.from(createSplashSvg(1024));
  await sharp(splashSvg).resize(1024, 1024).png().toFile(join(assetsDir, 'splash-icon.png'));
  console.log('Generated splash-icon.png (1024x1024)');

  // Favicon (48x48)
  const faviconSvg = Buffer.from(createFaviconSvg(512));
  await sharp(faviconSvg).resize(48, 48).png().toFile(join(assetsDir, 'favicon.png'));
  console.log('Generated favicon.png (48x48)');

  // Android adaptive icon foreground (1024x1024)
  const fgSvg = Buffer.from(createAndroidForegroundSvg(1024));
  await sharp(fgSvg).resize(1024, 1024).png().toFile(join(assetsDir, 'android-icon-foreground.png'));
  console.log('Generated android-icon-foreground.png (1024x1024)');

  // Android adaptive icon background (1024x1024)
  const bgSvg = Buffer.from(createAndroidBackgroundSvg(1024));
  await sharp(bgSvg).resize(1024, 1024).png().toFile(join(assetsDir, 'android-icon-background.png'));
  console.log('Generated android-icon-background.png (1024x1024)');

  // Android monochrome icon (1024x1024)
  const monoSvg = Buffer.from(createAndroidMonochromeSvg(1024));
  await sharp(monoSvg).resize(1024, 1024).png().toFile(join(assetsDir, 'android-icon-monochrome.png'));
  console.log('Generated android-icon-monochrome.png (1024x1024)');

  console.log('\nAll icons generated! Update app.json android adaptive icon backgroundColor to #E8F5E9 if needed.');
}

generate().catch(console.error);
