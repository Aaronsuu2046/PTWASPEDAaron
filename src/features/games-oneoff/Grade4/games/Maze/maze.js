// 迷宮資料：tiles[y][x] 為 true 表示可以走；牆在奇數格之間
// 房間 rooms × roomsY，展開成 (2·rooms+1) × (2·roomsY+1) 的格子
export const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const NEIGHBORS = Object.values(DIRS);

function shuffle(list, rand) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function walkable(tiles, x, y) {
  return Boolean(tiles[y]?.[x]);
}

function openNeighbors(tiles, x, y) {
  return NEIGHBORS.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) =>
    walkable(tiles, nx, ny)
  );
}

// 從 (sx, sy) 出發，每格的步數；blocked 裡的格子不能經過
export function distances(tiles, sx, sy, blocked = []) {
  const key = (x, y) => `${x},${y}`;
  const stop = new Set(blocked.map(([x, y]) => key(x, y)));
  const dist = { [key(sx, sy)]: 0 };
  const queue = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift();
    openNeighbors(tiles, x, y).forEach(([nx, ny]) => {
      const k = key(nx, ny);
      if (dist[k] !== undefined || stop.has(k)) return;
      dist[k] = dist[key(x, y)] + 1;
      queue.push([nx, ny]);
    });
  }
  return dist;
}

// 隨機產生迷宮：先挖出一條連通的樹狀通道，再打掉一些牆做出環路，比較像 Pac-Man
export function makeMaze(rooms, roomsY, rand = Math.random) {
  const w = rooms * 2 + 1;
  const h = roomsY * 2 + 1;
  const tiles = Array.from({ length: h }, () => Array(w).fill(false));
  const visited = new Set();
  const stack = [[0, 0]];
  visited.add("0,0");
  tiles[1][1] = true;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const next = shuffle(NEIGHBORS, rand)
      .map(([dx, dy]) => [cx + dx, cy + dy])
      .find(
        ([nx, ny]) =>
          nx >= 0 &&
          ny >= 0 &&
          nx < rooms &&
          ny < roomsY &&
          !visited.has(`${nx},${ny}`)
      );
    if (!next) {
      stack.pop();
      continue;
    }
    const [nx, ny] = next;
    visited.add(`${nx},${ny}`);
    tiles[ny * 2 + 1][nx * 2 + 1] = true;
    tiles[cy + ny + 1][cx + nx + 1] = true;
    stack.push(next);
  }
  // 打掉約兩成的內牆做環路（留一些死路放答案區）
  const inner = [];
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      if (tiles[y][x] || (x % 2 === 1 && y % 2 === 1)) continue;
      if (x % 2 === 0 && y % 2 === 0) continue;
      inner.push([x, y]);
    }
  }
  shuffle(inner, rand)
    .slice(0, Math.round(inner.length * 0.18))
    .forEach(([x, y]) => {
      tiles[y][x] = true;
    });
  return tiles;
}

export function deadEnds(tiles) {
  const result = [];
  tiles.forEach((row, y) =>
    row.forEach((open, x) => {
      if (open && openNeighbors(tiles, x, y).length === 1) result.push([x, y]);
    })
  );
  return result;
}

// 放三個答案區：都在死路盡頭（經過時不會誤觸），離起點至少 minDist 步，
// 彼此相隔至少 gap 格；每一區都能不經過其他區從起點走到
export function placeZones(tiles, start, count, rand = Math.random, opts = {}) {
  const minDist = opts.minDist ?? 5;
  const gap = opts.gap ?? 4;
  const fromStart = distances(tiles, start[0], start[1]);
  const candidates = shuffle(
    deadEnds(tiles).filter(
      ([x, y]) =>
        !(x === start[0] && y === start[1]) &&
        (fromStart[`${x},${y}`] ?? -1) >= minDist
    ),
    rand
  );
  const picked = [];
  candidates.forEach((cell) => {
    if (picked.length >= count) return;
    const far = picked.every(
      ([px, py]) => Math.abs(px - cell[0]) + Math.abs(py - cell[1]) >= gap
    );
    if (far) picked.push(cell);
  });
  if (picked.length < count) return null;
  const ok = picked.every((cell, i) => {
    const others = picked.filter((_, j) => j !== i);
    const d = distances(tiles, start[0], start[1], others);
    return d[`${cell[0]},${cell[1]}`] !== undefined;
  });
  return ok ? picked : null;
}

// 產生一個放得下三個答案區的迷宮；起點固定在正中央的房間
export function makeLevel(rooms, roomsY, count, rand = Math.random) {
  const start = [Math.floor(rooms / 2) * 2 + 1, Math.floor(roomsY / 2) * 2 + 1];
  for (let tries = 0; tries < 200; tries += 1) {
    const tiles = makeMaze(rooms, roomsY, rand);
    const zones = placeZones(tiles, start, count, rand);
    if (zones) return { tiles, start, zones };
  }
  throw new Error("迷宮產生失敗");
}

// 同一個迷宮重新洗答案位置（再試一次用）
export function reshuffleZones(tiles, start, count, rand = Math.random) {
  for (let tries = 0; tries < 50; tries += 1) {
    const zones = placeZones(tiles, start, count, rand);
    if (zones) return zones;
  }
  return null;
}
