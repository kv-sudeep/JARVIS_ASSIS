/**
 * Browser fingerprint generator (web-side equivalent of hardware fingerprint).
 * Used for trusted-device detection and anomaly scoring.
 */

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateBrowserFingerprint(): Promise<{
  hash: string;
  components: Record<string, string | number>;
}> {
  if (typeof window === "undefined") {
    return { hash: "ssr", components: { ssr: 1 } };
  }

  const components: Record<string, string | number> = {
    ua: navigator.userAgent,
    lang: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cores: navigator.hardwareConcurrency ?? 0,
    mem: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0,
    touch: navigator.maxTouchPoints ?? 0,
  };

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 30;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("JARVIS-fp", 2, 15);
      ctx.strokeStyle = "rgba(102,204,0,0.7)";
      ctx.strokeText("JARVIS-fp", 4, 17);
      components.canvas = canvas.toDataURL().slice(-64);
    }
  } catch {
    components.canvas = "blocked";
  }

  const raw = JSON.stringify(components);
  const hash = await sha256(raw);
  return { hash, components };
}

export function detectDeviceType(): "desktop" | "laptop" | "phone" | "tablet" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|android.*mobile|windows phone/.test(ua)) return "phone";
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/macintosh|windows|linux/.test(ua)) return "laptop";
  return "desktop";
}

export function detectOS(): { name: string; version: string } {
  if (typeof navigator === "undefined") return { name: "Unknown", version: "" };
  const ua = navigator.userAgent;
  if (/Windows NT/.test(ua)) return { name: "Windows", version: ua.match(/Windows NT ([\d.]+)/)?.[1] ?? "" };
  if (/Mac OS X/.test(ua)) return { name: "macOS", version: (ua.match(/Mac OS X ([\d_]+)/)?.[1] ?? "").replace(/_/g, ".") };
  if (/Android/.test(ua)) return { name: "Android", version: ua.match(/Android ([\d.]+)/)?.[1] ?? "" };
  if (/iPhone|iPad/.test(ua)) return { name: "iOS", version: ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? "" };
  if (/Linux/.test(ua)) return { name: "Linux", version: "" };
  return { name: "Unknown", version: "" };
}
