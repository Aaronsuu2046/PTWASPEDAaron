// 小數字串換成「幾個 0.01」（整數），格式不對回傳 null；0.1 和 0.10 都是 10
export function toHundredths(text) {
  const m = /^(\d+)\.?(\d*)$/.exec(text);
  if (!m) return null;
  const frac = m[2].replace(/0+$/, "");
  if (frac.length > 2) return null;
  return Number(m[1]) * 100 + Number(frac.padEnd(2, "0"));
}
