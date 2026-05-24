<template>
  <!-- Group wrapper so the fraction behaves like a single node -->
  <v-group :config="groupConfig">
    <!-- Numerator -->
    <v-text
      ref="numRef"
      :config="{
        text: String(numerator),
        fontSize,
        fontFamily,
        fontStyle,
        fill: color,
        x: textX('num'),
        y: 0,
        listening: listening,
      }"
      @transformend="recalc"
    />

    <!-- Fraction line -->
    <v-line
      ref="lineRef"
      :config="{
        points: linePoints,
        stroke: color,
        strokeWidth: lineThickness,
        x: 0,
        y: lineY,
        listening: false,
      }"
    />

    <!-- Denominator -->
    <v-text
      ref="denRef"
      :config="{
        text: String(denominator),
        fontSize,
        fontFamily,
        fontStyle,
        fill: color,
        x: textX('den'),
        y: denY,
        listening: listening,
      }"
      @transformend="recalc"
    />
  </v-group>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";

/**
 * FractionText.vue
 * A small Vue-Konva component to render a vertically-stacked math fraction.
 *
 * Props
 *  - numerator, denominator: string | number
 *  - x, y: position of the group
 *  - align: 'left' | 'center' | 'right' (horizontal alignment inside group)
 *  - fontSize, fontFamily, bold, italic, color
 *  - linePadding: vertical spacing between text and fraction line (px)
 *  - lineThickness: stroke width of the fraction bar
 *  - listening: pass through Konva listening flag for hit detection (default true)
 *
 * The component auto-measures text widths/heights and adjusts the fraction bar length
 * and text positions accordingly. Exposes no events, but you can wrap in a <v-group>
 * externally if you need drag/transform.
 */

const props = defineProps({
  numerator: { type: [String, Number], required: true },
  denominator: { type: [String, Number], required: true },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  align: {
    type: String,
    default: "center",
    validator: (v) => ["left", "center", "right"].includes(v),
  },
  fontSize: { type: Number, default: 28 },
  fontFamily: {
    type: String,
    default:
      'Inter, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  bold: { type: Boolean, default: false },
  italic: { type: Boolean, default: false },
  color: { type: String, default: "#111827" },
  linePadding: { type: Number, default: 4 },
  lineThickness: { type: Number, default: 2 },
  listening: { type: Boolean, default: true },
});

const numRef = ref(null);
const denRef = ref(null);
const lineRef = ref(null);

const groupConfig = computed(() => ({ x: props.x, y: props.y }));

const fontStyle = computed(() => {
  if (props.bold && props.italic) return "bold italic";
  if (props.bold) return "bold";
  if (props.italic) return "italic";
  return "normal";
});

// Measured sizes
const numBox = ref({ width: 0, height: 0 });
const denBox = ref({ width: 0, height: 0 });

const maxTextWidth = computed(() =>
  Math.max(numBox.value.width, denBox.value.width)
);

// Vertical layout
const lineY = computed(() => numBox.value.height + props.linePadding);
const denY = computed(
  () => numBox.value.height + props.linePadding * 2 + props.lineThickness
);

// Line points (0..width) at y=0 (we position via lineY)
const linePoints = computed(() => [0, 0, maxTextWidth.value, 0]);

// Horizontal text alignment inside the fraction width
function textX(which) {
  const width = maxTextWidth.value;
  const actual = which === "num" ? numBox.value.width : denBox.value.width;
  if (props.align === "left") return 0;
  if (props.align === "right") return width - actual;
  // center
  return (width - actual) / 2;
}

function measure() {
  // Read Konva node client rects to get width/height
  const n = numRef.value?.getNode?.();
  const d = denRef.value?.getNode?.();
  if (n) {
    const b = n.getClientRect({ relativeTo: n.getLayer?.() });
    numBox.value = { width: b.width, height: b.height };
  }
  if (d) {
    const b = d.getClientRect({ relativeTo: d.getLayer?.() });
    denBox.value = { width: b.width, height: b.height };
  }
}

async function recalc() {
  await nextTick();
  measure();
}

onMounted(recalc);

watch(
  () => [
    props.numerator,
    props.denominator,
    props.fontSize,
    props.fontFamily,
    props.bold,
    props.italic,
  ],
  () => recalc(),
  { immediate: false }
);
</script>

<style scoped>
/* No visual styles needed; everything is drawn on canvas. */
</style>
