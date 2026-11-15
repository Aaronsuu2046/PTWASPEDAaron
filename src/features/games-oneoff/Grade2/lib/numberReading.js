// 二年級數的讀法（國小教材）：100＝一百、101＝一百零一、110＝一百一十、115＝一百一十五、200＝二百
const DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function readNumber(n) {
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new Error(`不支援 ${n}`);
  if (n < 10) return DIGITS[n];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (h === 0) {
    // 10～99：十、十五、二十、二十五
    const tens = t === 1 ? "十" : `${DIGITS[t]}十`;
    return o ? `${tens}${DIGITS[o]}` : tens;
  }
  let text = `${DIGITS[h]}百`;
  if (t === 0 && o === 0) return text;
  // 百位後面的十位是 0：要讀「零」，例如一百零五
  if (t === 0) return `${text}零${DIGITS[o]}`;
  // 百位後面的十位是 1：讀「一十」，例如一百一十
  text += `${DIGITS[t]}十`;
  return o ? `${text}${DIGITS[o]}` : text;
}

// 從 list 隨機抽 count 個不重複的數
export function pickDistinct(list, count) {
  const pool = [...list];
  const result = [];
  while (result.length < count && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(i, 1)[0]);
  }
  return result;
}

export function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
