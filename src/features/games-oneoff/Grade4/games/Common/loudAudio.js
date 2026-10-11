// 播放錄好的語音檔並放大音量（瀏覽器內建朗讀的音量上限是 1，放不大）
// gain 1.5 表示 1.5 倍；同一時間只播一個，再按一次會從頭播
let ctx = null;
let current = null;
const cache = new Map();

async function load(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${url}`);
          return res.arrayBuffer();
        })
        .then((buf) => ctx.decodeAudioData(buf))
        .catch((err) => {
          cache.delete(url);
          throw err;
        })
    );
  }
  return cache.get(url);
}

export function stopLoud() {
  if (current) {
    try {
      current.stop();
    } catch {
      // 已經播完
    }
    current = null;
  }
}

// 播放成功回傳 true；檔案讀不到時回傳 false，讓呼叫端改用內建朗讀
export async function playLoud(url, gain = 1.5) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") await ctx.resume();
    const buffer = await load(url);
    stopLoud();
    const source = ctx.createBufferSource();
    const amp = ctx.createGain();
    amp.gain.value = gain;
    // 放大後少數字的峰值會略超過 1，接一個限幅器避免破音
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.1;
    source.buffer = buffer;
    source.connect(amp).connect(limiter).connect(ctx.destination);
    source.start();
    current = source;
    return true;
  } catch (err) {
    console.warn("語音檔播放失敗:", err.message);
    return false;
  }
}
