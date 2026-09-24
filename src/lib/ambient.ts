/**
 * 放松背景声：全部由浏览器 Web Audio 实时生成，不依赖音频文件，也没有版权问题。
 * 全局只播放一段，页面切换时继续播放，到时间自动淡出。
 */

export type AmbientId = "rain" | "waves" | "piano" | "morning";

export type AmbientTrack = {
  id: AmbientId;
  title: string;
  desc: string;
  emoji: string;
  minutes: number;
};

export const AMBIENT_TRACKS: Record<AmbientId, AmbientTrack> = {
  rain: {
    id: "rain",
    title: "林间雨声",
    desc: "细密的雨声，盖住脑子里杂乱的声音",
    emoji: "🌧️",
    minutes: 25,
  },
  waves: {
    id: "waves",
    title: "海浪起伏",
    desc: "缓慢起伏的低频海浪，适合跟着放慢呼吸",
    emoji: "🌊",
    minutes: 20,
  },
  piano: {
    id: "piano",
    title: "轻柔琴音",
    desc: "稀疏、缓慢的琴音，陪着你，不催你",
    emoji: "🎹",
    minutes: 18,
  },
  morning: {
    id: "morning",
    title: "清晨和弦",
    desc: "明亮舒缓的和弦铺底，适合继续手边的事",
    emoji: "🌤️",
    minutes: 12,
  },
};

export const AMBIENT_ORDER: AmbientId[] = ["rain", "waves", "piano", "morning"];

/* ---------------- 播放状态（供 React 订阅） ---------------- */

export type AmbientState = { playing: AmbientId | null; endsAt: number | null };

const IDLE: AmbientState = { playing: null, endsAt: null };
let state: AmbientState = IDLE;
const listeners = new Set<() => void>();

function setState(next: AmbientState) {
  state = next;
  listeners.forEach((l) => l());
}

export const ambientStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  getServerSnapshot: () => IDLE,
};

/* ---------------- 音频引擎 ---------------- */

export type AmbientSession = {
  bus: GainNode;
  sources: AudioScheduledSourceNode[];
  timers: number[];
};
type Session = AmbientSession;

let ctx: AudioContext | null = null;
let current: Session | null = null;
let autoStopTimer: number | null = null;

export function isAmbientSupported() {
  if (typeof window === "undefined") return false;
  return (
    "AudioContext" in window ||
    "webkitAudioContext" in (window as unknown as Record<string, unknown>)
  );
}

function getContext(): AudioContext | null {
  if (!isAmbientSupported()) return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

function noiseBuffer(ac: BaseAudioContext, kind: "white" | "pink" | "brown", seconds = 6) {
  const length = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0,
      last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === "white") {
        data[i] = white * 0.5;
      } else if (kind === "pink") {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
    }
  }
  return buffer;
}

function loopNoise(ac: BaseAudioContext, s: Session, kind: "white" | "pink" | "brown") {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, kind);
  src.loop = true;
  s.sources.push(src);
  return src;
}

/** 简单的反馈延迟，给琴音和和弦一点空间感 */
function makeSpace(ac: BaseAudioContext, into: AudioNode) {
  const input = ac.createGain();
  const delay = ac.createDelay(1);
  delay.delayTime.value = 0.34;
  const feedback = ac.createGain();
  feedback.gain.value = 0.32;
  const tone = ac.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2200;
  const wet = ac.createGain();
  wet.gain.value = 0.35;
  input.connect(into);
  input.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(wet);
  wet.connect(into);
  return input;
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function buildRain(ac: BaseAudioContext, s: Session) {
  const bed = loopNoise(ac, s, "pink");
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 350;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 5200;
  const g = ac.createGain();
  g.gain.value = 0.55;
  bed.connect(hp).connect(lp).connect(g).connect(s.bus);
  bed.start();

  // 零星的雨滴
  const dropBuffer = noiseBuffer(ac, "white", 0.2);
  const timer = window.setInterval(() => {
    if (Math.random() > 0.55) return;
    const t = ac.currentTime + Math.random() * 0.1;
    const src = ac.createBufferSource();
    src.buffer = dropBuffer;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800 + Math.random() * 2600;
    bp.Q.value = 1.4;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.06 + Math.random() * 0.08, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(bp).connect(env).connect(s.bus);
    src.start(t, Math.random() * 0.1, 0.09);
  }, 90);
  s.timers.push(timer);
}

function buildWaves(ac: BaseAudioContext, s: Session) {
  const src = loopNoise(ac, s, "brown");
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const swell = ac.createGain();
  swell.gain.value = 0.2;
  src.connect(lp).connect(swell).connect(s.bus);

  // 两个频率略不同的慢速起伏，听起来不那么机械
  for (const [freq, depth] of [
    [0.085, 0.13],
    [0.13, 0.06],
  ] as const) {
    const lfo = ac.createOscillator();
    lfo.frequency.value = freq;
    const amt = ac.createGain();
    amt.gain.value = depth;
    lfo.connect(amt).connect(swell.gain);
    lfo.start();
    s.sources.push(lfo);
  }
  src.start();
}

function pluck(ac: BaseAudioContext, into: AudioNode, freq: number, t: number, level: number) {
  const body = ac.createOscillator();
  body.type = "sine";
  body.frequency.value = freq;
  const shimmer = ac.createOscillator();
  shimmer.type = "triangle";
  shimmer.frequency.value = freq * 2;
  const shimmerGain = ac.createGain();
  shimmerGain.gain.value = 0.18;
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(level, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  body.connect(env);
  shimmer.connect(shimmerGain).connect(env);
  env.connect(into);
  body.start(t);
  shimmer.start(t);
  body.stop(t + 3.3);
  shimmer.stop(t + 3.3);
}

function buildPiano(ac: BaseAudioContext, s: Session) {
  const soft = ac.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 2600;
  soft.connect(s.bus);
  const space = makeSpace(ac, soft);

  const scale = [60, 62, 64, 67, 69, 72, 74, 76]; // C 大调五声音阶
  const bass = [48, 45, 41, 43];
  let idx = 3;
  let count = 0;
  let next = ac.currentTime + 0.2;

  const schedule = () => {
    while (next < ac.currentTime + 1.5) {
      idx = Math.max(0, Math.min(scale.length - 1, idx + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]!));
      pluck(ac, space, midi(scale[idx]!), next, 0.24);
      if (count % 4 === 0) pluck(ac, space, midi(bass[(count / 4) % bass.length]!), next, 0.15);
      count++;
      next += 0.9 + Math.random() * 0.9;
    }
  };
  schedule();
  s.timers.push(window.setInterval(schedule, 400));
}

function buildMorning(ac: BaseAudioContext, s: Session) {
  const soft = ac.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 1900;
  soft.connect(s.bus);
  const space = makeSpace(ac, soft);

  const air = loopNoise(ac, s, "pink");
  const airHp = ac.createBiquadFilter();
  airHp.type = "highpass";
  airHp.frequency.value = 2500;
  const airGain = ac.createGain();
  airGain.gain.value = 0.04;
  air.connect(airHp).connect(airGain).connect(s.bus);
  air.start();

  const chords = [
    [60, 64, 67, 71],
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [55, 59, 62, 69],
  ];
  const len = 8;
  let i = 0;
  let next = ac.currentTime + 0.1;

  const playChord = (notes: number[], t: number) => {
    for (const n of notes) {
      for (const detune of [-4, 4]) {
        const osc = ac.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = midi(n);
        osc.detune.value = detune;
        const env = ac.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(0.038, t + 2.4);
        env.gain.setValueAtTime(0.038, t + len - 1.5);
        env.gain.linearRampToValueAtTime(0.0001, t + len + 1.5);
        osc.connect(env).connect(space);
        osc.start(t);
        osc.stop(t + len + 1.6);
      }
    }
  };

  const schedule = () => {
    while (next < ac.currentTime + 2) {
      playChord(chords[i % chords.length]!, next);
      i++;
      next += len;
    }
  };
  schedule();
  s.timers.push(window.setInterval(schedule, 1000));
}

export const AMBIENT_BUILDERS: Record<AmbientId, (ac: BaseAudioContext, s: Session) => void> = {
  rain: buildRain,
  waves: buildWaves,
  piano: buildPiano,
  morning: buildMorning,
};

function teardown(s: Session, ac: AudioContext) {
  const now = ac.currentTime;
  s.bus.gain.cancelScheduledValues(now);
  s.bus.gain.setValueAtTime(s.bus.gain.value, now);
  s.bus.gain.linearRampToValueAtTime(0.0001, now + 1.2);
  s.timers.forEach((t) => window.clearInterval(t));
  window.setTimeout(() => {
    s.sources.forEach((src) => {
      try {
        src.stop();
      } catch {
        /* 已经停止 */
      }
    });
    s.bus.disconnect();
  }, 1300);
}

export function stopAmbient() {
  if (autoStopTimer !== null) {
    window.clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
  if (current && ctx) teardown(current, ctx);
  current = null;
  setState(IDLE);
}

/** 返回是否成功开始播放；minutes 不填时用这段声音的默认时长 */
export function playAmbient(id: AmbientId, minutes: number = AMBIENT_TRACKS[id].minutes): boolean {
  const ac = getContext();
  if (!ac) return false;
  void ac.resume();
  if (current) teardown(current, ac);
  if (autoStopTimer !== null) window.clearTimeout(autoStopTimer);

  const bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, ac.currentTime);
  bus.gain.linearRampToValueAtTime(0.8, ac.currentTime + 1.5);
  bus.connect(ac.destination);
  const session: Session = { bus, sources: [], timers: [] };
  AMBIENT_BUILDERS[id](ac, session);
  current = session;

  autoStopTimer = window.setTimeout(stopAmbient, minutes * 60_000);
  setState({ playing: id, endsAt: Date.now() + minutes * 60_000 });
  return true;
}

export function toggleAmbient(id: AmbientId): boolean {
  if (state.playing === id) {
    stopAmbient();
    return false;
  }
  return playAmbient(id);
}
