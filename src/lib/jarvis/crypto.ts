/**
 * Browser-side crypto helpers (PBKDF2 PIN hashing, secure random).
 */

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateSalt(byteLength = 16): string {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

export async function hashPin(pin: string, salt: string, fingerprint: string): Promise<string> {
  // PIN + hardware/browser fingerprint as additional salt — Module 1 spec
  const combined = `${salt}:${pin}:${fingerprint}`;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(combined),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function sha512Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-512", buf);
  return bytesToHex(new Uint8Array(hash));
}

export function generateBackupPassphrase(): string {
  // 12-word passphrase from a small wordlist — easy to write down
  const words = [
    "stark","jarvis","reactor","arc","mark","iron","tower","helmet","circuit","gauntlet",
    "shield","laser","pulse","quantum","vector","orbit","nova","fusion","plasma","binary",
    "cipher","matrix","sentinel","beacon","forge","titan","atlas","vortex","nebula","cosmic",
    "prism","crystal","photon","neon","echo","pulse","sigma","omega","delta","gamma",
    "phoenix","raven","cobalt","azure","crimson","obsidian","silver","golden","sapphire","ember",
  ];
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((n) => words[n % words.length]).join(" ");
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const arr = new Uint8Array(5);
    crypto.getRandomValues(arr);
    codes.push(bytesToHex(arr).toUpperCase().match(/.{1,4}/g)!.join("-"));
  }
  return codes;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
