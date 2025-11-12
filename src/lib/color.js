// --- FILE: src/lib/color.js
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export function parseColor(input) {
  if (!input) return null;
  let s = String(input).trim();

  // #rgb / #rrggbb
  if (s[0] === "#") {
    const hex = s.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
  }

  // rgb/rgba(...)
  if (s.startsWith("rgb")) {
    const nums = s
      .replace(/rgba?\(/, "")
      .replace(")", "")
      .split(",")
      .map((x) => x.trim());
    const r = parseFloat(nums[0]);
    const g = parseFloat(nums[1]);
    const b = parseFloat(nums[2]);
    const a = nums[3] != null ? parseFloat(nums[3]) : 1;
    return { r, g, b, a };
  }

  return null;
}

export function toRgbaString({ r, g, b, a = 1 }) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp01(
    a
  )})`;
}

// Luminancia relativa WCAG
export function luminance({ r, g, b }) {
  const srgb = [r / 255, g / 255, b / 255].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

// Texto negro o blanco según contraste
export function contrastText(color) {
  const c = parseColor(color);
  if (!c) return "#111";
  const L = luminance(c);
  return L > 0.5 ? "#111" : "#fff";
}

// Aclara oscurece (t=0.85 → 85% hacia blanco)
export function mixWithWhite(color, t = 0.85) {
  const c = parseColor(color);
  if (!c) return "rgba(0,0,0,0.05)";
  const r = c.r + (255 - c.r) * clamp01(t);
  const g = c.g + (255 - c.g) * clamp01(t);
  const b = c.b + (255 - c.b) * clamp01(t);
  return toRgbaString({ r, g, b, a: c.a });
}
