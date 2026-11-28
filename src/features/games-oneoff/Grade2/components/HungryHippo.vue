<template>
  <!-- 張大嘴的河馬：頭上的牌子顯示目前吃了多少；嘴巴（data-zone="mouth"）是放食物的地方 -->
  <div class="hippo" :class="{ 'hippo--over': over, 'hippo--chomp': chomp }">
    <div class="hippo__count" :class="{ 'hippo__count--pop': pop }">
      <span>{{ count }}</span>
    </div>
    <svg viewBox="0 0 220 190" class="hippo__svg" role="img" aria-label="河馬">
      <!-- 耳朵 -->
      <ellipse cx="62" cy="26" rx="14" ry="12" fill="#8e7cc3" />
      <ellipse cx="158" cy="26" rx="14" ry="12" fill="#8e7cc3" />
      <ellipse cx="62" cy="27" rx="7" ry="6" fill="#f8bbd0" />
      <ellipse cx="158" cy="27" rx="7" ry="6" fill="#f8bbd0" />
      <!-- 頭 -->
      <ellipse cx="110" cy="62" rx="70" ry="46" fill="#a593d6" />
      <!-- 眼睛 -->
      <circle cx="82" cy="46" r="13" fill="#ffffff" />
      <circle cx="138" cy="46" r="13" fill="#ffffff" />
      <circle cx="85" cy="48" r="6" fill="#263238" />
      <circle cx="135" cy="48" r="6" fill="#263238" />
      <circle cx="87" cy="45" r="2" fill="#ffffff" />
      <circle cx="137" cy="45" r="2" fill="#ffffff" />
      <!-- 上顎 -->
      <path
        d="M26 86 Q110 58 194 86 Q196 104 182 108 L38 108 Q24 104 26 86 Z"
        fill="#a593d6"
      />
      <ellipse cx="88" cy="84" rx="5" ry="3.5" fill="#6a5a9e" />
      <ellipse cx="132" cy="84" rx="5" ry="3.5" fill="#6a5a9e" />
      <!-- 張開的嘴（放食物的地方） -->
      <g data-zone="mouth" class="hippo__mouth">
        <rect x="20" y="96" width="180" height="94" fill="transparent" />
        <path
          d="M36 106 L184 106 Q190 150 160 172 Q110 196 60 172 Q30 150 36 106 Z"
          fill="#c2185b"
        />
        <path
          d="M60 160 Q110 182 160 160 Q150 176 110 180 Q70 176 60 160 Z"
          fill="#f06292"
        />
        <rect x="54" y="106" width="14" height="16" rx="3" fill="#ffffff" />
        <rect x="152" y="106" width="14" height="16" rx="3" fill="#ffffff" />
        <path
          d="M36 106 L184 106"
          stroke="#7e57c2"
          stroke-width="6"
          stroke-linecap="round"
        />
      </g>
    </svg>
    <p class="hippo__label">把食物放進嘴巴</p>
  </div>
</template>

<script>
export default {
  name: "HungryHippo",
  props: {
    count: { type: Number, default: 0 },
    // 拖到嘴巴上方時亮起來
    over: { type: Boolean, default: false },
  },
  data() {
    return { pop: false, chomp: false };
  },
  watch: {
    count(value, old) {
      if (value <= old) return;
      this.pop = false;
      this.chomp = false;
      requestAnimationFrame(() => {
        this.pop = true;
        this.chomp = true;
      });
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.pop = false;
        this.chomp = false;
      }, 500);
    },
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
};
</script>

<style scoped>
.hippo {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
}

.hippo__count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 4.6rem;
  padding: 0.1rem 0.9rem;
  font-size: 2.4rem;
  font-weight: 700;
  line-height: 1.2;
  color: #ffffff;
  background-color: #ef6c00;
  border: 4px solid #ffffff;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.15);
}

.hippo__count--pop {
  animation: pop 0.45s ease-out;
}

.hippo__svg {
  flex: 1;
  min-height: 0;
  width: 100%;
  margin-top: -0.4rem;
}

.hippo__mouth {
  transition: filter 0.15s;
}

.hippo--over .hippo__mouth {
  filter: drop-shadow(0 0 8px #ffeb3b) brightness(1.15);
}

.hippo--chomp .hippo__svg {
  animation: chomp 0.45s ease-out;
}

.hippo__label {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #6d4c41;
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes chomp {
  0% {
    transform: scaleY(1);
  }
  40% {
    transform: scaleY(0.92);
  }
  100% {
    transform: scaleY(1);
  }
}
</style>
