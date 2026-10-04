// 百格板的塗色位置：格子編號 0～99（第 r 列第 c 行 = r * 10 + c）
// 每次隨機選一種好數的連續排法，格數一定剛好是 count
const randInt = (n) => Math.floor(Math.random() * n);

const ORDERS = {
  // 由左到右一列一列
  rows: (k) => k,
  // 由上到下一行一行
  cols: (k) => (k % 10) * 10 + Math.floor(k / 10),
  // 蛇行：一列往右、下一列往左
  snake: (k) => {
    const r = Math.floor(k / 10);
    const c = k % 10;
    return r * 10 + (r % 2 ? 9 - c : c);
  },
};

function along(order, count) {
  const start = randInt(100 - count + 1);
  return Array.from({ length: count }, (_, k) => ORDERS[order](start + k));
}

// 一塊寬 w 的長方形（最後一列可以不滿）
function block(count) {
  const widths = [3, 4, 5, 6].filter((w) => Math.ceil(count / w) <= 10);
  const w = widths[randInt(widths.length)];
  const h = Math.ceil(count / w);
  const r0 = randInt(10 - h + 1);
  const c0 = randInt(10 - w + 1);
  return Array.from(
    { length: count },
    (_, k) => (r0 + Math.floor(k / w)) * 10 + c0 + (k % w)
  );
}

export function hundredPattern(count) {
  const kinds = ["rows", "cols", "snake", "block"];
  const kind = kinds[randInt(kinds.length)];
  const cells = kind === "block" ? block(count) : along(kind, count);
  return [...new Set(cells)].sort((a, b) => a - b);
}
