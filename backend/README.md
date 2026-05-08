# JARVIS — Module 1: Owner Authentication & Security

> **Python Flask backend** powering the multi-factor security gate for JARVIS 2.0.

---

## Architecture

```
backend/
├── app.py                    # Flask entry point, JWT config, boot fingerprint check
├── requirements.txt
├── .env.example              # Copy → .env and fill in your credentials
├── config/
│   └── security.json         # Machine fingerprint + hashed PIN (auto-generated)
├── data/                     # Created automatically at runtime
│   ├── voice_samples/        # MFCC reference + raw WAV
│   ├── intruder_snapshots/   # Webcam JPEGs of intruders
│   └── incidents.log         # Timestamped intruder log
├── security/
│   ├── hardware.py           # CPU / MB / MAC / Disk → SHA-256 fingerprint
│   ├── auth.py               # PIN hashing (hardware-salted SHA-256) + verification
│   ├── voice.py              # MFCC feature extraction + cosine similarity (≥ 0.95)
│   └── intruder.py           # Lockdown: snapshot → log → Twilio → SMTP → lock → sleep
├── routes/
│   └── auth_routes.py        # Flask Blueprint: /api/auth/*
└── tests/
    ├── test_hardware.py
    ├── test_auth.py
    └── test_intruder.py
```

---

## Security Features

| Feature | Implementation |
|---|---|
| **Hardware Fingerprint** | `wmic` (CPU, MB, Disk) + MAC → SHA-256, stored in `security.json` |
| **PIN Hash** | SHA-256 with hardware fingerprint as salt — never plain text |
| **Voice Fingerprint** | MFCC extraction via `librosa`, cosine similarity ≥ 95% |
| **JWT Sessions** | 4-hour expiry, Bearer token, in-memory only on frontend |
| **Intruder Protocol** | Triggered on 3rd failed attempt |
| **Lovable Cloud Sync** | Mirrors auth_attempts / audit_log / sessions / intruder_events / hardware_fingerprints into the shared Supabase project (fail-soft) |

---

## Lovable Cloud Bridge (shared backend)

The Python backend writes every auth attempt, audit event, intruder event,
hardware fingerprint and session into the **same Supabase project** that powers
the Lovable web HUD. This means the `/security` dashboard in the browser shows
**both** browser-originated logins and local Python-backend logins.

The bridge is fail-soft: if `JARVIS_CLOUD_SYNC=false` or the service-role key
is missing, JARVIS keeps running purely on the local machine. This preserves
the air-gapped guarantee.

To enable cloud sync, edit `backend/.env`:

```env
SUPABASE_URL=https://llwkowocacvwkssrnsgg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<copy from Lovable Cloud → Backend → API keys>
SUPABASE_OWNER_ID=<owner_id UUID — visible in /security after web setup>
JARVIS_CLOUD_SYNC=true
```

The service-role key bypasses RLS and **must stay on the server**. Never
embed it in any client-side code.

---

## Quick Start

### 1. Prerequisites

```powershell
# Python 3.11+ required
python --version

# Install PyAudio (Windows — needs Microsoft C++ build tools or use wheel)
pip install pipwin
pipwin install pyaudio
```

### 2. Install Dependencies

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment

```powershell
copy .env.example .env
# Edit .env with your real Twilio/SMTP credentials
```

### 4. First-Time Setup

```powershell
# Start the server
python app.py
```

Then call the setup endpoints (or use the React frontend):

```bash
# Step 1: Register hardware fingerprint + PIN
curl -X POST http://127.0.0.1:5000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d "{\"pin\": \"YOUR_PIN\"}"

# Step 2: Enroll voice sample (speak when the server logs "Recording...")
curl -X POST http://127.0.0.1:5000/api/auth/setup/voice
```

### 5. Login

```bash
curl -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"pin\": \"YOUR_PIN\"}"
```

On success, you receive:
```json
{
  "message": "JARVIS online. Welcome, sir.",
  "token": "eyJ...",
  "voice_similarity": 0.9734
}
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/auth/status` | None | Check setup state + failed attempts + cloud-sync flag |
| `GET` | `/api/auth/cloud/status` | None | Diagnostic — confirms Supabase connectivity + owner binding |
| `POST` | `/api/auth/setup` | None | Record hardware fingerprint + PIN hash (auto-mirrors to cloud) |
| `POST` | `/api/auth/setup/voice` | None | Record voice biometric sample |
| `POST` | `/api/auth/login` | None | Multi-factor login → JWT token + cloud session |
| `POST` | `/api/auth/logout` | JWT | Close cloud session |
| `GET` | `/api/auth/me` | JWT | Verify token is valid |

---

## Intruder Protocol (3 Failed Attempts)

On the 3rd consecutive failed login:

1. 📷 **Webcam snapshot** captured → `data/intruder_snapshots/intruder_YYYYMMDD_HHMMSS.jpg`
2. 📝 **Incident logged** → `data/incidents.log`
3. 📱 **Twilio SMS/WhatsApp** alert dispatched to your number
4. 📧 **SMTP email** alert dispatched
5. 🔒 **Workstation locked** (`rundll32.exe user32.dll,LockWorkStation`)
6. 💤 **Display sleeping** (PowerShell SendMessage)

---

## Running Tests

```powershell
cd backend
python -m pytest tests/ -v
```

Expected output: all tests pass with mocked hardware, no real system calls.

---

## Notes

- **No plain-text passwords** exist anywhere on disk.
- The `config/security.json` PIN hash is salted with YOUR machine's hardware ID — it's useless on any other machine.
- The JWT token is stored **in-memory only** in React (module-level variable) — it vanishes when you close the tab.
- If JARVIS detects a hardware fingerprint mismatch at boot, it logs a critical warning. You can harden this to `sys.exit(1)` for production.
