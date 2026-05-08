import { useEffect, useState } from "react";

export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("en-US", { hour12: true });
  const date = now.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  return { time, date, now };
}

export function useLiveMetric(min: number, max: number, step = 1, intervalMs = 1500) {
  const [v, setV] = useState((min + max) / 2);
  useEffect(() => {
    const id = setInterval(() => {
      setV((prev) => {
        const delta = (Math.random() - 0.5) * step * 2;
        return Math.max(min, Math.min(max, prev + delta));
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [min, max, step, intervalMs]);
  return v;
}
