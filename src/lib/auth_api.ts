/**
 * auth_api.ts — JARVIS Frontend
 * In-memory JWT token store + typed API client for the auth endpoints.
 *
 * SECURITY: Token is NEVER written to localStorage or sessionStorage.
 * It lives in a module-level variable and vanishes when the tab closes.
 */

// ── In-Memory Token Store ────────────────────────────────────────────────────

let _token: string | null = null;

export function setToken(token: string): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function clearToken(): void {
  _token = null;
}

export function isAuthenticated(): boolean {
  return _token !== null;
}


// ── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = "http://127.0.0.1:5000";

function buildHeaders(requireAuth = false): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (requireAuth && _token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as Record<string, string>).error ?? res.statusText;
    throw new Error(message);
  }
  return data as T;
}


// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthStatus {
  jarvis: string;
  setup_complete: boolean;
  failed_attempts: number;
  max_attempts: number;
}

export interface SetupResponse {
  message: string;
  fingerprint_preview: string;
}

export interface VoiceSetupResponse {
  message: string;
  voice_sample: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  voice_similarity: number;
}

export interface LoginError {
  error: string;
  remaining_attempts?: number;
  code?: string;
}


// ── API Calls ────────────────────────────────────────────────────────────────

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${BASE_URL}/api/auth/status`);
  return handleResponse<AuthStatus>(res);
}

export async function runSetup(pin: string): Promise<SetupResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/setup`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ pin }),
  });
  return handleResponse<SetupResponse>(res);
}

export async function resetSetup(): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/api/auth/setup`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  return handleResponse<{ message: string }>(res);
}

export async function enrollVoice(): Promise<VoiceSetupResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/setup/voice`, {
    method: "POST",
    headers: buildHeaders(),
  });
  return handleResponse<VoiceSetupResponse>(res);
}

export async function login(pin: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ pin }),
  });
  const data = await handleResponse<LoginResponse>(res);
  // Store token in memory
  setToken(data.token);
  return data;
}

export async function fetchProtectedProfile(): Promise<{ identity: string; status: string }> {
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: buildHeaders(true),
  });
  return handleResponse(res);
}
