import { h } from "vue";

// 二年級量長度用的物件圖形（SVG）：寬 w＝公分數 × cm、高 40；MA2032、MA2033 共用
const OH = 40;

// 要量的東西（寬 w＝公分數 × CM，高 40）
const ObjectShape = {
  name: "ObjectShape",
  props: { shape: String, w: Number, color: String, cm: Number },
  render() {
    const { shape, w, color, cm } = this;
    const rect = (attrs) =>
      h("rect", {
        x: 0,
        y: 6,
        width: w,
        height: OH - 12,
        rx: 6,
        fill: color,
        stroke: "#37474f",
        "stroke-width": 2,
        ...attrs,
      });
    switch (shape) {
      case "stickers":
        // 一張 1 公分的貼紙排成一排
        return h(
          "g",
          Array.from({ length: Math.round(w / cm) }, (_, k) =>
            h("g", [
              h("rect", {
                x: k * cm + 1,
                y: 2,
                width: cm - 2,
                height: OH - 4,
                rx: 6,
                fill: color,
                stroke: "#37474f",
                "stroke-width": 2,
              }),
              h("path", {
                d: `M${k * cm + cm / 2} 9 l5 10 l11 1 l-8 7 l3 11 l-11 -6 l-11 6 l3 -11 l-8 -7 l11 -1 Z`,
                fill: "#ffffff",
                opacity: 0.85,
              }),
            ])
          )
        );
      case "ant":
        return h("g", [
          h("ellipse", {
            cx: w * 0.18,
            cy: OH / 2,
            rx: w * 0.16,
            ry: 9,
            fill: color,
          }),
          h("ellipse", {
            cx: w * 0.5,
            cy: OH / 2,
            rx: w * 0.14,
            ry: 7,
            fill: color,
          }),
          h("ellipse", {
            cx: w * 0.8,
            cy: OH / 2,
            rx: w * 0.2,
            ry: 11,
            fill: color,
          }),
        ]);
      case "button":
        return h("g", [
          h("circle", {
            cx: w / 2,
            cy: OH / 2,
            r: w / 2 - 1,
            fill: color,
            stroke: "#1565c0",
            "stroke-width": 2,
          }),
          ...[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([dx, dy]) =>
            h("circle", {
              cx: w / 2 + dx * 6,
              cy: OH / 2 + dy * 6,
              r: 3,
              fill: "#ffffff",
            })
          ),
        ]);
      case "bean":
      case "marble":
        return h("ellipse", {
          cx: w / 2,
          cy: OH / 2,
          rx: w / 2 - 1,
          ry: shape === "bean" ? 13 : w / 2 - 1,
          fill: color,
          stroke: "#37474f",
          "stroke-width": 2,
        });
      case "stone":
        return h("path", {
          d: `M2 ${OH / 2} Q${w * 0.1} 4 ${w * 0.5} 6 Q${w - 2} 8 ${w - 1} ${OH / 2} Q${w * 0.9} ${OH - 4} ${w * 0.5} ${OH - 5} Q4 ${OH - 4} 2 ${OH / 2} Z`,
          fill: color,
          stroke: "#455a64",
          "stroke-width": 2,
        });
      case "tadpole":
        return h("g", [
          h("ellipse", {
            cx: w * 0.25,
            cy: OH / 2,
            rx: w * 0.24,
            ry: 13,
            fill: color,
          }),
          h("path", {
            d: `M${w * 0.45} ${OH / 2} Q${w * 0.75} ${OH / 2 - 10} ${w} ${OH / 2}`,
            stroke: color,
            "stroke-width": 6,
            fill: "none",
            "stroke-linecap": "round",
          }),
        ]);
      case "lollipop":
        return h("g", [
          h("rect", {
            x: 30,
            y: OH / 2 - 3,
            width: w - 30,
            height: 6,
            fill: "#eeeeee",
            stroke: "#9e9e9e",
          }),
          h("circle", {
            cx: 16,
            cy: OH / 2,
            r: 15,
            fill: color,
            stroke: "#ad1457",
            "stroke-width": 2,
          }),
        ]);
      case "gummy":
        return rect({ rx: 12 });
      case "clip":
        return h("g", [
          rect({ y: 12, height: OH - 18, rx: 3 }),
          h("path", {
            d: `M6 12 L${w / 2} 2 L${w - 6} 12`,
            stroke: "#9e9e9e",
            "stroke-width": 3,
            fill: "none",
          }),
        ]);
      case "paperclip":
        return h("rect", {
          x: 2,
          y: 10,
          width: w - 4,
          height: OH - 20,
          rx: 10,
          fill: "none",
          stroke: color,
          "stroke-width": 4,
        });
      case "stapler":
        return h("g", [
          rect({ y: 18, height: 14, rx: 4, fill: "#90a4ae" }),
          rect({ y: 6, height: 14, rx: 6 }),
        ]);
      case "choco":
        return h("g", [
          rect({ rx: 3 }),
          ...Array.from({ length: Math.round(w / cm) - 1 }, (_, k) =>
            h("line", {
              x1: (k + 1) * cm,
              y1: 6,
              x2: (k + 1) * cm,
              y2: OH - 6,
              stroke: "rgba(255,255,255,0.4)",
              "stroke-width": 2,
            })
          ),
        ]);
      case "redbean":
        return h("ellipse", {
          cx: w / 2,
          cy: OH / 2,
          rx: w / 2 - 1,
          ry: 12,
          fill: color,
          stroke: "#4e342e",
          "stroke-width": 2,
        });
      case "smile":
      case "thumb":
        return h("g", [
          h("rect", {
            x: 1,
            y: 2,
            width: w - 2,
            height: OH - 4,
            rx: 10,
            fill: color,
            stroke: "#f57f17",
            "stroke-width": 2,
          }),
          shape === "smile"
            ? h("path", {
                d: `M${w / 2 - 12} ${OH / 2 + 2} Q${w / 2} ${OH / 2 + 14} ${w / 2 + 12} ${OH / 2 + 2}`,
                stroke: "#5d4037",
                "stroke-width": 3,
                fill: "none",
              })
            : h("path", {
                d: `M${w / 2 - 10} ${OH - 10} V${OH / 2} L${w / 2 - 2} 8 Q${w / 2 + 4} 8 ${w / 2 + 2} ${OH / 2 - 4} H${w / 2 + 12} V${OH - 10} Z`,
                fill: "#ffcc80",
                stroke: "#5d4037",
                "stroke-width": 2,
              }),
        ]);
      case "spoon":
        return h("g", [
          h("ellipse", {
            cx: 26,
            cy: OH / 2,
            rx: 25,
            ry: 15,
            fill: color,
            stroke: "#757575",
            "stroke-width": 2,
          }),
          h("rect", {
            x: 50,
            y: OH / 2 - 4,
            width: w - 51,
            height: 8,
            rx: 4,
            fill: color,
            stroke: "#757575",
            "stroke-width": 2,
          }),
        ]);
      case "pencil":
        return h("g", [
          h("rect", {
            x: 1,
            y: 10,
            width: w - 30,
            height: 20,
            fill: color,
            stroke: "#5d4037",
            "stroke-width": 2,
          }),
          h("polygon", {
            points: `${w - 29},10 ${w - 1},20 ${w - 29},30`,
            fill: "#ffe0b2",
            stroke: "#5d4037",
            "stroke-width": 2,
          }),
        ]);
      case "pen":
        return h("g", [
          h("rect", {
            x: 1,
            y: 12,
            width: w - 2,
            height: 16,
            rx: 8,
            fill: color,
            stroke: "#0d47a1",
            "stroke-width": 2,
          }),
          h("rect", {
            x: 1,
            y: 12,
            width: w * 0.28,
            height: 16,
            rx: 8,
            fill: "#0d47a1",
          }),
        ]);
      // 彩虹筆：筆身是彩虹色的直條紋，左端筆蓋、右端筆尖（MA2033 第 5 關）
      case "rainbow-pen": {
        const COLORS = [
          "#e53935",
          "#fb8c00",
          "#fdd835",
          "#43a047",
          "#1e88e5",
          "#8e24aa",
        ];
        const body = w - 14;
        const band = body / COLORS.length;
        return h("g", [
          ...COLORS.map((c, k) =>
            h("rect", {
              x: 1 + k * band,
              y: 12,
              width: band + 0.5,
              height: 16,
              fill: c,
            })
          ),
          h("rect", {
            x: 1,
            y: 12,
            width: body,
            height: 16,
            rx: 4,
            fill: "none",
            stroke: "#37474f",
            "stroke-width": 2,
          }),
          h("polygon", {
            points: `${body + 1},12 ${w - 1},20 ${body + 1},28`,
            fill: "#ffe0b2",
            stroke: "#37474f",
            "stroke-width": 2,
            "stroke-linejoin": "round",
          }),
          h("rect", {
            x: 1,
            y: 8,
            width: w * 0.12,
            height: 6,
            rx: 3,
            fill: "#37474f",
          }),
        ]);
      }
      case "nail":
        return h("g", [
          h("rect", {
            x: 0,
            y: 6,
            width: 8,
            height: OH - 12,
            rx: 2,
            fill: color,
          }),
          h("polygon", {
            points: `8,16 ${w - 1},20 8,24`,
            fill: color,
            stroke: "#424242",
            "stroke-width": 1.5,
          }),
        ]);
      case "caramel":
        return h("rect", {
          x: 1,
          y: 4,
          width: w - 2,
          height: OH - 8,
          rx: 6,
          fill: color,
          stroke: "#6d4c41",
          "stroke-width": 2,
        });
      case "flag":
        return h("g", [
          h("rect", {
            x: 1,
            y: OH / 2 - 3,
            width: w - 2,
            height: 6,
            fill: "#8d6e63",
          }),
          h("polygon", {
            points: `${w - 1},${OH / 2 - 2} ${w - 50},${OH / 2 - 2} ${w - 26},2`,
            fill: color,
          }),
        ]);
      case "bubble":
      case "yakult":
        return h("g", [
          h("rect", {
            x: 1,
            y: 4,
            width: w * 0.8,
            height: OH - 8,
            rx: 10,
            fill: color,
            stroke: "#37474f",
            "stroke-width": 2,
          }),
          h("rect", {
            x: w * 0.8,
            y: 9,
            width: w * 0.2 - 1,
            height: OH - 18,
            rx: 3,
            fill: shape === "bubble" ? "#ff7043" : "#e53935",
            stroke: "#37474f",
            "stroke-width": 2,
          }),
        ]);
      case "cube":
        return h("g", [
          h("rect", {
            x: 1,
            y: 2,
            width: w - 2,
            height: OH - 4,
            rx: 4,
            fill: color,
            stroke: "#37474f",
            "stroke-width": 2,
          }),
          ...[1, 2].map((k) =>
            h("line", {
              x1: (w * k) / 3,
              y1: 2,
              x2: (w * k) / 3,
              y2: OH - 2,
              stroke: "#ffffff",
              "stroke-width": 2,
            })
          ),
        ]);
      case "straw":
        return h("g", [
          h("rect", {
            x: 1,
            y: OH / 2 - 6,
            width: w - 2,
            height: 12,
            rx: 6,
            fill: color,
            stroke: "#37474f",
            "stroke-width": 2,
          }),
          ...Array.from({ length: Math.floor(w / 24) }, (_, k) =>
            h("line", {
              x1: 12 + k * 24,
              y1: OH / 2 - 5,
              x2: 20 + k * 24,
              y2: OH / 2 + 5,
              stroke: "#ffffff",
              "stroke-width": 3,
            })
          ),
        ]);
      case "tape-stripe":
      case "tape-flower":
      case "tape-dot":
      case "tape-floral":
        return h("g", [
          h("rect", {
            x: 1,
            y: 8,
            width: w - 2,
            height: OH - 16,
            rx: 2,
            fill: color,
            stroke: "#37474f",
            "stroke-width": 2,
          }),
          ...Array.from({ length: Math.floor(w / 18) }, (_, k) =>
            shape === "tape-stripe"
              ? h("line", {
                  x1: 8 + k * 18,
                  y1: 9,
                  x2: 8 + k * 18,
                  y2: OH - 9,
                  stroke: "#ffffff",
                  "stroke-width": 4,
                })
              : h("circle", {
                  cx: 10 + k * 18,
                  cy: OH / 2,
                  r: shape === "tape-dot" ? 3.5 : 5,
                  fill: shape === "tape-flower" ? "#ffeb3b" : "#ffffff",
                })
          ),
        ]);
      case "beads":
        return h("g", [
          h("line", {
            x1: 1,
            y1: OH / 2,
            x2: w - 1,
            y2: OH / 2,
            stroke: "#5d4037",
            "stroke-width": 2,
          }),
          ...Array.from(
            { length: Math.max(1, Math.floor((w - 4) / 16)) },
            (_, k) =>
              h("circle", {
                cx: 10 + k * 16,
                cy: OH / 2,
                r: 7,
                fill: ["#ef5350", "#ffca28", "#42a5f5", "#66bb6a"][k % 4],
                stroke: "#37474f",
                "stroke-width": 1.5,
              })
          ),
        ]);
      case "charm-heart":
      case "charm-star":
        return h("g", [
          h("line", {
            x1: 1,
            y1: OH / 2,
            x2: w - 34,
            y2: OH / 2,
            stroke: "#8d6e63",
            "stroke-width": 3,
          }),
          h("circle", {
            cx: 4,
            cy: OH / 2,
            r: 4,
            fill: "none",
            stroke: "#8d6e63",
            "stroke-width": 2,
          }),
          shape === "charm-heart"
            ? h("path", {
                d: `M${w - 18} ${OH - 4} L${w - 34} ${OH / 2 - 2} A8 8 0 0 1 ${w - 18} 10 A8 8 0 0 1 ${w - 2} ${OH / 2 - 2} Z`,
                fill: color,
                stroke: "#ad1457",
                "stroke-width": 2,
              })
            : h("polygon", {
                points: `${w - 18},3 ${w - 13},14 ${w - 2},15 ${w - 10},23 ${w - 8},35 ${w - 18},29 ${w - 28},35 ${w - 26},23 ${w - 34},15 ${w - 23},14`,
                fill: color,
                stroke: "#f57f17",
                "stroke-width": 2,
              }),
        ]);
      case "train-head":
        return h("g", [
          h("rect", {
            x: 1,
            y: 6,
            width: w - 2,
            height: OH - 16,
            rx: 6,
            fill: color,
            stroke: "#37474f",
            "stroke-width": 2,
          }),
          h("rect", {
            x: w * 0.55,
            y: 1,
            width: w * 0.3,
            height: 10,
            fill: "#37474f",
          }),
          h("circle", { cx: w * 0.3, cy: OH - 6, r: 5, fill: "#37474f" }),
          h("circle", { cx: w * 0.75, cy: OH - 6, r: 5, fill: "#37474f" }),
        ]);
      case "train-cars":
        return h(
          "g",
          Array.from(
            { length: Math.max(1, Math.round(w / cm / 3)) },
            (_, k, arr) => {
              const cw = w / Math.max(1, Math.round(w / cm / 3));
              return h("g", [
                h("rect", {
                  x: k * cw + 2,
                  y: 6,
                  width: cw - 4,
                  height: OH - 16,
                  rx: 5,
                  fill: color,
                  stroke: "#37474f",
                  "stroke-width": 2,
                }),
                h("rect", {
                  x: k * cw + 8,
                  y: 10,
                  width: cw - 16,
                  height: 8,
                  fill: "#e1f5fe",
                }),
                h("circle", {
                  cx: k * cw + cw * 0.25,
                  cy: OH - 6,
                  r: 5,
                  fill: "#37474f",
                }),
                h("circle", {
                  cx: k * cw + cw * 0.75,
                  cy: OH - 6,
                  r: 5,
                  fill: "#37474f",
                }),
              ]);
            }
          )
        );
      case "bag":
        return h("g", [
          h("rect", {
            x: 1,
            y: 4,
            width: w - 2,
            height: OH - 8,
            rx: 4,
            fill: color,
            stroke: "#5d4037",
            "stroke-width": 2,
          }),
          h("line", {
            x1: 8,
            y1: 10,
            x2: w - 8,
            y2: 10,
            stroke: "#ffffff",
            "stroke-width": 2,
            "stroke-dasharray": "6 4",
          }),
        ]);
      default:
        return rect({ rx: 5 });
    }
  },
};

export default ObjectShape;
