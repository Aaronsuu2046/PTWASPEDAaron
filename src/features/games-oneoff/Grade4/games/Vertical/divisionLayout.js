// 除法直式排版：算出商的每一位在哪一欄，以及直式每一列（乘積、相減後放下下一位）
// 欄位用被除數由左到右的索引（0 起算）；每一列記錄數值與最後一位對齊的欄。
// 例：3618 ÷ 134
//        27        商：2 在索引 2（十位）、7 在索引 3（個位）
//   134)3618
//       268        product，對齊索引 2
//        938       diff（93 放下 8），對齊索引 3
//        938       product
//          0       diff（最後的餘數）
export function divisionLayout(dividend, divisor) {
  const digits = [...String(dividend)].map(Number);
  const d = Number(divisor);
  let end = 0;
  let cur = digits[0];
  while (cur < d && end < digits.length - 1) {
    end += 1;
    cur = cur * 10 + digits[end];
  }
  const quotient = {};
  const rows = [];
  for (let col = end; col < digits.length; col += 1) {
    if (col > end) {
      // 放下下一位：接在上一列相減後的差後面
      cur = cur * 10 + digits[col];
      const last = rows[rows.length - 1];
      last.value = cur;
      last.end = col;
    }
    const q = Math.floor(cur / d);
    quotient[col] = q;
    if (q > 0) {
      rows.push({ kind: "product", value: q * d, end: col });
      cur -= q * d;
      rows.push({ kind: "diff", value: cur, end: col });
    } else if (col === end) {
      // 被除數比除數小：商 0，餘數就是被除數
      rows.push({ kind: "diff", value: cur, end: col });
    }
  }
  // 每一列展開成 { 欄: 數字 }
  const cells = rows.map((row) => {
    const s = String(row.value);
    return {
      ...row,
      digits: Object.fromEntries(
        [...s].map((ch, i) => [row.end - (s.length - 1 - i), Number(ch)])
      ),
    };
  });
  const q = Number(
    Object.keys(quotient)
      .sort((a, b) => a - b)
      .map((k) => quotient[k])
      .join("")
  );
  return {
    quotient,
    rows: cells,
    q,
    r: rows.length ? rows[rows.length - 1].value : Number(dividend),
  };
}
