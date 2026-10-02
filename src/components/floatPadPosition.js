// 浮動輸入板共用：依欄位（anchor）定位、不蓋住欄位、點外面收起
const GAP = 8;

// anchor：欄位在視窗中的位置 { top, left, bottom, right }
// avoid：盡量不要蓋住的區域（選填）[{ top, left, bottom, right, weight }]
// 依序試欄位下方、右側、左側、上方；選放得進視窗、且蓋住其他欄位最少的位置
export function placeNearAnchor(padWidth, padHeight, anchor, avoid = []) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x) => Math.min(Math.max(x, 0), Math.max(vw - padWidth, 0));
  const clampY = (y) => Math.min(Math.max(y, 0), Math.max(vh - padHeight, 0));
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - padHeight;
  const right = anchor.right + GAP;
  const left = anchor.left - GAP - padWidth;
  // 順序代表偏好：下方 → 右側 → 左側 → 上方（欄位上方通常是題目或算式，最後才考慮）
  const candidates = [
    { top: below, left: anchor.left },
    { top: below, left: anchor.right - padWidth },
    { top: anchor.top, left: right },
    { top: anchor.bottom - padHeight, left: right },
    { top: anchor.top, left },
    { top: anchor.bottom - padHeight, left },
    { top: above, left: anchor.left },
    { top: above, left: anchor.right - padWidth },
  ];
  // 再試所有欄位整體的右側／左側（作答格子排成好幾行時，旁邊通常有空位）
  // 只看作答欄位（有 weight 的是功能區按鈕等，不算在欄位範圍內）
  const fields = avoid.filter((r) => r.weight == null);
  if (fields.length) {
    const all = [anchor, ...fields];
    const farRight = Math.max(...all.map((r) => r.right)) + GAP;
    const farLeft = Math.min(...all.map((r) => r.left)) - GAP - padWidth;
    const midY = (anchor.top + anchor.bottom) / 2 - padHeight / 2;
    candidates.push(
      { top: midY, left: farRight },
      { top: anchor.top, left: farRight },
      { top: midY, left: farLeft },
      { top: anchor.top, left: farLeft }
    );
  }
  const overlap = (pos, r) =>
    Math.max(
      0,
      Math.min(pos.left + padWidth, r.right) - Math.max(pos.left, r.left)
    ) *
    Math.max(
      0,
      Math.min(pos.top + padHeight, r.bottom) - Math.max(pos.top, r.top)
    );
  let best = null;
  candidates.forEach((raw, order) => {
    // 夾回視窗內後再評估：不能蓋住目前欄位，其次盡量不蓋其他欄位，再其次離原本位置越近越好
    const pos = { top: clampY(raw.top), left: clampX(raw.left) };
    if (overlap(pos, anchor) > 0) return;
    // 每個要避開的區域可帶 weight（預設 10），例如功能區的送出按鈕權重更高
    const covered = avoid.reduce(
      (sum, r) => sum + overlap(pos, r) * (r.weight ?? 10),
      0
    );
    const moved = Math.abs(pos.top - raw.top) + Math.abs(pos.left - raw.left);
    const score = covered + moved + order;
    if (!best || score < best.score) best = { ...pos, score };
  });
  if (best) return { top: best.top, left: best.left };
  return { top: clampY(below), left: clampX(anchor.left) };
}

// 舊用法：給 top/left，只夾在視窗內（維持既有行為）
export function clampToViewport(padWidth, padHeight, top, left) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let t = top;
  let l = left;
  if (t + padHeight > vh) t = vh - padHeight;
  if (t < 0) t = 0;
  if (l + padWidth > vw) l = vw - padWidth;
  if (l < 0) l = 0;
  return { top: t, left: l };
}

// 點到輸入板與欄位以外的地方時呼叫 onOutside；回傳移除監聽的函式
export function listenOutside(getPad, keepOpenSelector, onOutside) {
  const handler = (event) => {
    const pad = getPad();
    if (!pad || pad.contains(event.target)) return;
    if (keepOpenSelector && event.target.closest?.(keepOpenSelector)) return;
    onOutside();
  };
  document.addEventListener("pointerdown", handler, true);
  return () => document.removeEventListener("pointerdown", handler, true);
}
