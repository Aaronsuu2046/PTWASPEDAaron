// 格點四邊形判分：把所有線段（題目給的＋學生畫的）拆成最小格點線段，
// 確認剛好圍成一個不自我交叉的四邊形，再依圖形定義檢查。
// 點座標為格點 [x, y]；線段為 [[x1, y1], [x2, y2]]

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const key = ([x, y]) => `${x},${y}`;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len2 = (v) => dot(v, v);

// 把線段拆成相鄰格點間的最小線段（方便處理分段畫、重疊畫）
function unitEdges([a, b]) {
  const [dx, dy] = sub(b, a);
  const g = gcd(dx, dy);
  if (g === 0) return [];
  const step = [dx / g, dy / g];
  const edges = [];
  for (let i = 0; i < g; i += 1) {
    const p = [a[0] + step[0] * i, a[1] + step[1] * i];
    const q = [p[0] + step[0], p[1] + step[1]];
    edges.push([p, q]);
  }
  return edges;
}

// 兩線段是否相交（含端點接觸）
function segmentsTouch(p1, p2, p3, p4) {
  const d1 = cross(sub(p4, p3), sub(p1, p3));
  const d2 = cross(sub(p4, p3), sub(p2, p3));
  const d3 = cross(sub(p2, p1), sub(p3, p1));
  const d4 = cross(sub(p2, p1), sub(p4, p1));
  const onSeg = (a, b, c) =>
    Math.min(a[0], b[0]) <= c[0] &&
    c[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= c[1] &&
    c[1] <= Math.max(a[1], b[1]);
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  if (d1 === 0 && onSeg(p3, p4, p1)) return true;
  if (d2 === 0 && onSeg(p3, p4, p2)) return true;
  if (d3 === 0 && onSeg(p1, p2, p3)) return true;
  if (d4 === 0 && onSeg(p1, p2, p4)) return true;
  return false;
}

// 回傳 { ok: true, corners } 或 { ok: false, reason }
// reason：empty / open / extra / cross / notQuad
export function findPolygon(segments) {
  const edgeMap = new Map();
  segments.flatMap(unitEdges).forEach(([p, q]) => {
    const k = [key(p), key(q)].sort().join("|");
    edgeMap.set(k, [p, q]);
  });
  if (edgeMap.size === 0) return { ok: false, reason: "empty" };

  const points = new Map();
  const adj = new Map();
  edgeMap.forEach(([p, q]) => {
    [p, q].forEach((pt) => {
      points.set(key(pt), pt);
      if (!adj.has(key(pt))) adj.set(key(pt), []);
    });
    adj.get(key(p)).push(key(q));
    adj.get(key(q)).push(key(p));
  });
  const degrees = [...adj.values()].map((list) => list.length);
  if (degrees.some((d) => d > 2)) return { ok: false, reason: "extra" };
  if (degrees.some((d) => d < 2)) return { ok: false, reason: "open" };

  // 沿著線走一圈
  const start = adj.keys().next().value;
  const order = [start];
  let prev = null;
  let cur = start;
  for (;;) {
    const next = adj.get(cur).find((n) => n !== prev);
    if (next === start) break;
    order.push(next);
    prev = cur;
    cur = next;
  }
  if (order.length !== points.size) return { ok: false, reason: "extra" };

  // 去掉直線中途的點，只留轉角
  const pts = order.map((k) => points.get(k));
  const corners = pts.filter((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length];
    const b = pts[(i + 1) % pts.length];
    return cross(sub(p, a), sub(b, p)) !== 0;
  });
  if (corners.length !== 4) {
    return { ok: false, reason: "notQuad", sides: corners.length };
  }
  const [a, b, c, d] = corners;
  if (segmentsTouch(a, b, c, d) || segmentsTouch(b, c, d, a)) {
    return { ok: false, reason: "cross" };
  }
  return { ok: true, corners };
}

// 依圖形定義檢查；shape：square / rectangle / rhombus / parallelogram / trapezoid
export function checkShape(corners, shape) {
  const v = corners.map((p, i) => sub(corners[(i + 1) % 4], p));
  const lens = v.map(len2);
  const allEqual = lens.every((l) => l === lens[0]);
  const allRight = v.every((s, i) => dot(s, v[(i + 1) % 4]) === 0);
  const para02 = cross(v[0], v[2]) === 0;
  const para13 = cross(v[1], v[3]) === 0;
  switch (shape) {
    case "square":
      return allEqual && allRight;
    case "rectangle":
      return allRight;
    case "rhombus":
      return allEqual;
    case "parallelogram":
      return para02 && para13;
    case "trapezoid":
      return para02 !== para13;
    default:
      return false;
  }
}

// 題目給的線段兩端都要是四邊形的頂點（線段要剛好當作一條邊）
export function usesGiven(corners, given) {
  const cornerKeys = corners.map(key);
  return given.every(([p, q]) => {
    const i = cornerKeys.indexOf(key(p));
    const j = cornerKeys.indexOf(key(q));
    return i >= 0 && j >= 0 && (Math.abs(i - j) === 1 || Math.abs(i - j) === 3);
  });
}

// 完整判分，回傳 { ok, reason, corners }
// reason 另含 given（沒用題目線段當邊）、shape（不符合圖形定義）
export function judge(segments, given, shape) {
  const found = findPolygon([...given, ...segments]);
  if (!found.ok) return found;
  if (!usesGiven(found.corners, given)) {
    return { ok: false, reason: "given", corners: found.corners };
  }
  if (!checkShape(found.corners, shape)) {
    return { ok: false, reason: "shape", corners: found.corners };
  }
  return { ok: true, reason: "", corners: found.corners };
}
