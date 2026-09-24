/**
 * 天气：只需要城市，不需要定位权限，也不需要住址。
 * 用城市坐标向 Open-Meteo 查询当天天气（免费、无需 key），每天每个城市只查一次并缓存在本机。
 * 查询失败时不影响其他功能。
 */
import { dayKey } from "@/lib/mood";

export type City = { name: string; lat: number; lon: number };

export const CITIES: City[] = [
  { name: "北京", lat: 39.9, lon: 116.41 },
  { name: "上海", lat: 31.23, lon: 121.47 },
  { name: "广州", lat: 23.13, lon: 113.26 },
  { name: "深圳", lat: 22.54, lon: 114.06 },
  { name: "杭州", lat: 30.27, lon: 120.16 },
  { name: "南京", lat: 32.06, lon: 118.8 },
  { name: "苏州", lat: 31.3, lon: 120.58 },
  { name: "成都", lat: 30.57, lon: 104.07 },
  { name: "重庆", lat: 29.56, lon: 106.55 },
  { name: "武汉", lat: 30.59, lon: 114.31 },
  { name: "西安", lat: 34.34, lon: 108.94 },
  { name: "天津", lat: 39.13, lon: 117.2 },
  { name: "长沙", lat: 28.23, lon: 112.94 },
  { name: "郑州", lat: 34.75, lon: 113.63 },
  { name: "青岛", lat: 36.07, lon: 120.38 },
  { name: "厦门", lat: 24.48, lon: 118.09 },
  { name: "福州", lat: 26.07, lon: 119.3 },
  { name: "昆明", lat: 25.04, lon: 102.71 },
  { name: "合肥", lat: 31.82, lon: 117.23 },
  { name: "济南", lat: 36.65, lon: 117.12 },
  { name: "宁波", lat: 29.87, lon: 121.54 },
  { name: "沈阳", lat: 41.81, lon: 123.43 },
  { name: "大连", lat: 38.91, lon: 121.61 },
  { name: "哈尔滨", lat: 45.8, lon: 126.53 },
  { name: "香港", lat: 22.32, lon: 114.17 },
  { name: "台北", lat: 25.03, lon: 121.56 },
];

export const cityOf = (name: string | undefined) => CITIES.find((c) => c.name === name);

export type Weather = {
  code: number;
  max: number;
  min: number;
  /** 当天最大降水概率（%） */
  rain?: number;
};

export type Sky = { label: string; emoji: string; wet: "rain" | "snow" | null };

/** WMO 天气代码 → 中文描述 */
export function describeSky(code: number): Sky {
  if (code === 0) return { label: "晴", emoji: "☀️", wet: null };
  if (code <= 2) return { label: "多云", emoji: "⛅", wet: null };
  if (code === 3) return { label: "阴", emoji: "☁️", wet: null };
  if (code === 45 || code === 48) return { label: "有雾", emoji: "🌫️", wet: null };
  if (code >= 51 && code <= 57) return { label: "毛毛雨", emoji: "🌦️", wet: "rain" };
  if (code >= 61 && code <= 67) return { label: "有雨", emoji: "🌧️", wet: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "有雪", emoji: "🌨️", wet: "snow" };
  if (code >= 80 && code <= 82) return { label: "阵雨", emoji: "🌧️", wet: "rain" };
  if (code >= 95) return { label: "雷雨", emoji: "⛈️", wet: "rain" };
  return { label: "多云", emoji: "⛅", wet: null };
}

/** 适合户外活动：没有雨雪、降水概率不高、气温不极端 */
export const goodForOutdoors = (w: Weather) =>
  !describeSky(w.code).wet && (w.rain ?? 0) < 50 && w.max <= 32 && w.max >= 5;

/** 根据气温和雨雪给出穿衣建议 */
export function clothesFor(w: Weather): string[] {
  const out: string[] = [];
  if (w.max >= 28) out.push("短袖和透气的面料，记得防晒");
  else if (w.max >= 20) out.push("短袖或薄长袖，带一件薄外套");
  else if (w.max >= 12) out.push("长袖加一件外套");
  else if (w.max >= 5) out.push("毛衣或卫衣，外面加一件厚外套");
  else out.push("羽绒服或厚大衣，帽子手套别忘了");
  if (w.max - w.min >= 10) out.push("早晚温差大，方便穿脱的叠穿更合适");
  const sky = describeSky(w.code);
  if (sky.wet === "snow") out.push("有雪，注意保暖和防滑");
  else if (sky.wet === "rain" || (w.rain ?? 0) >= 50) out.push("可能下雨，带把伞，鞋子选防水一点的");
  return out;
}

/* ---------------- 获取与缓存 ---------------- */

const CACHE_KEY = "mindcare.weather.v1";

export function weatherUrl(c: City) {
  const q = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "1",
  });
  return `https://api.open-meteo.com/v1/forecast?${q.toString()}`;
}

/** 解析 Open-Meteo 的返回；格式不对时返回 null */
export function parseWeather(json: unknown): Weather | null {
  const d = (json as { daily?: Record<string, unknown[]> } | null)?.daily;
  const n = (k: string) => {
    const v = d?.[k]?.[0];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  const code = n("weather_code");
  const max = n("temperature_2m_max");
  const min = n("temperature_2m_min");
  if (code === undefined || max === undefined || min === undefined) return null;
  const rain = n("precipitation_probability_max");
  return { code, max: Math.round(max), min: Math.round(min), ...(rain !== undefined ? { rain } : {}) };
}

export async function getWeather(city: City, fetchImpl: typeof fetch = fetch): Promise<Weather | null> {
  const today = dayKey();
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "null") as
      | { date: string; city: string; weather: Weather }
      | null;
    if (cached && cached.date === today && cached.city === city.name) return cached.weather;
  } catch {
    /* 缓存损坏就重新查 */
  }
  try {
    const res = await fetchImpl(weatherUrl(city));
    if (!res.ok) return null;
    const weather = parseWeather(await res.json());
    if (weather) {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, city: city.name, weather }));
    }
    return weather;
  } catch {
    return null;
  }
}

export const clearWeatherCache = () => {
  if (typeof window !== "undefined") window.localStorage.removeItem(CACHE_KEY);
};
