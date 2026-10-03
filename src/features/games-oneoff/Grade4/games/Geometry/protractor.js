// 半圓量角器的幾何：Protractor.vue 與遊戲的點選判斷共用
// 半徑比例：外圈刻度帶 0.8R～R，內圈刻度帶 0.62R～0.8R
export const OUTER_IN = 0.8;
export const INNER_IN = 0.62;
// 0° 線下方的底邊高度（0 與 180 的數字下半部落在這裡）
export const BASE_STRIP = 0.085;

// 以量角器座標判斷點到哪個部位（y 向下，刻度在 y < 0 的半邊）
export function protractorPart(x, y, R) {
  const d = Math.hypot(x, y);
  if (d <= R * 0.09) return "center";
  if (y > R * BASE_STRIP || d > R * 1.04) return "none";
  if (d >= OUTER_IN * R) return "outer";
  if (d >= INNER_IN * R) return "inner";
  return "none";
}

// 極角 deg（數學方向，0° 在右、逆時針）在半徑 r 上的座標
export function polar(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.cos(rad), -r * Math.sin(rad)];
}
