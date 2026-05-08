"""
jarvis_routes.py — JARVIS AI Brain & Command Center
Handles: voice commands, app launching, file management, messaging, AI chat
"""
import json
import math
import os
import random
import subprocess
import webbrowser
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from flask import Blueprint, jsonify, request

load_dotenv(Path(__file__).parent.parent / ".env")

OWNER_NAME = os.getenv("OWNER_NAME", "Sir")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

jarvis_bp = Blueprint("jarvis", __name__, url_prefix="/api/jarvis")

# ── Contacts database ──────────────────────────────────────────────────────────
CONTACTS_FILE = Path(__file__).parent.parent / "data" / "contacts.json"

def load_contacts() -> dict:
    if CONTACTS_FILE.exists():
        try:
            return json.loads(CONTACTS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "mom": {"phone": "", "whatsapp": "", "email": ""},
        "dad": {"phone": "", "whatsapp": "", "email": ""},
        "home": {"phone": "", "whatsapp": "", "email": ""},
    }

def save_contacts(contacts: dict):
    CONTACTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONTACTS_FILE.write_text(json.dumps(contacts, indent=2), encoding="utf-8")

def find_contact(name: str, contacts: dict) -> dict:
    name_lower = name.lower().strip()
    if not name_lower:
        return {}
    if name_lower in contacts:
        return contacts[name_lower]
    for k, v in contacts.items():
        if name_lower in k.lower() or k.lower() in name_lower:
            return v
    return {}

# ── Windows App Launcher ───────────────────────────────────────────────────────
WINDOWS_APPS = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "paint": "mspaint.exe",
    "mspaint": "mspaint.exe",
    "chrome": "chrome",
    "google chrome": "chrome",
    "browser": "chrome",
    "firefox": "firefox",
    "edge": "msedge",
    "microsoft edge": "msedge",
    "text editor": "notepad.exe",
    "any text editor": "notepad.exe",
    "text editer": "notepad.exe",
    "editor": "notepad.exe",
    "editer": "notepad.exe",
    "any editor": "notepad.exe",
    "any editer": "notepad.exe",
    "offline editor": "notepad.exe",
    "offline editer": "notepad.exe",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "file manager": "explorer.exe",
    "files": "explorer.exe",
    "task manager": "taskmgr.exe",
    "taskmgr": "taskmgr.exe",
    "settings": "ms-settings:",
    "control panel": "control.exe",
    "word": "winword.exe",
    "microsoft word": "winword.exe",
    "excel": "excel.exe",
    "microsoft excel": "excel.exe",
    "powerpoint": "powerpnt.exe",
    "microsoft powerpoint": "powerpnt.exe",
    "teams": "teams.exe",
    "microsoft teams": "teams.exe",
    "outlook": "outlook.exe",
    "spotify": "spotify.exe",
    "discord": "discord.exe",
    "whatsapp": "whatsapp.exe",
    "telegram": "telegram.exe",
    "vscode": "code",
    "vs code": "code",
    "visual studio code": "code",
    "visual studio": "devenv.exe",
    "terminal": "wt.exe",
    "windows terminal": "wt.exe",
    "cmd": "cmd.exe",
    "command prompt": "cmd.exe",
    "powershell": "powershell.exe",
    "snipping tool": "snippingtool.exe",
    "screenshot": "snippingtool.exe",
    "camera": "microsoft.windows.camera:",
    "photos": "ms-photos:",
    "clock": "ms-clock:",
    "calendar": "outlookcal:",
    "maps": "bingmaps:",
    "store": "ms-windows-store:",
    "paint 3d": "ms-paint:",
    "sticky notes": "ms-stickynotes:",
    "weather": "bingweather:",
    "news": "bingnews:",
    "mail": "outlookmail:",
    "one drive": "odopen:",
    "onedrive": "odopen:",
    # ── Online Web Apps ──
    "youtube": "https://www.youtube.com",
    "facebook": "https://www.facebook.com",
    "instagram": "https://www.instagram.com",
    "twitter": "https://twitter.com",
    "x": "https://x.com",
    "github": "https://github.com",
    "chatgpt": "https://chat.openai.com",
    "chat gpt": "https://chat.openai.com",
    "netflix": "https://www.netflix.com",
    "amazon": "https://www.amazon.com",
    "reddit": "https://www.reddit.com",
    "gmail": "https://mail.google.com",
    "google": "https://www.google.com",
    "linkedin": "https://www.linkedin.com",
}

def launch_app(app_name: str) -> tuple[bool, str]:
    key = app_name.lower().strip()
    
    # Gracefully handle URLs
    if key.endswith(".com") or key.endswith(".org") or key.endswith(".net") or key.endswith(".io"):
        url = key if key.startswith("http") else f"https://{key}"
        try:
            os.startfile(url)
            return True, f"Opening {key}, {OWNER_NAME}."
        except Exception:
            pass
            
    exe = WINDOWS_APPS.get(key)
    if not exe:
        # fuzzy match
        for k, v in WINDOWS_APPS.items():
            if key in k or k in key:
                exe = v
                break
    if exe:
        try:
            # os.startfile uses the Windows Shell and Registry App Paths, making it far more reliable than Popen
            os.startfile(exe)
            return True, f"Opening {app_name}, {OWNER_NAME}."
        except Exception:
            # If the hardcoded path fails (e.g., app not installed or not in PATH),
            # DO NOT return an error. Just pass and let the Universal Fallback try to find it!
            pass
            
    # Universal Fallback: Use Windows Search to find and open any unknown app
    try:
        import threading
        import time
        import pyautogui
        
        def search_and_launch():
            pyautogui.press("win")
            time.sleep(0.5)
            pyautogui.write(app_name, interval=0.02)
            time.sleep(1.0) # Wait for Windows Search to find the best match
            pyautogui.press("enter")
            
        threading.Thread(target=search_and_launch, daemon=True).start()
        return True, f"Attempting to launch {app_name} via Windows Search, {OWNER_NAME}."
    except Exception as e:
        return False, f"I don't recognize the app '{app_name}', {OWNER_NAME}, and Windows Search failed."

# ── File Manager ───────────────────────────────────────────────────────────────
ALLOWED_DIRS = [
    str(Path.home() / "Desktop"),
    str(Path.home() / "Documents"),
    str(Path.home() / "Downloads"),
    str(Path.home() / "Pictures"),
    str(Path.home() / "Music"),
    str(Path.home() / "Videos"),
]

def list_directory(path: str | None = None) -> dict:
    target = Path(path) if path else Path.home() / "Desktop"
    try:
        items = []
        for entry in sorted(target.iterdir()):
            items.append({
                "name": entry.name,
                "type": "folder" if entry.is_dir() else "file",
                "size": entry.stat().st_size if entry.is_file() else None,
                "modified": datetime.fromtimestamp(entry.stat().st_mtime).strftime("%Y-%m-%d %H:%M"),
                "path": str(entry),
            })
        return {"path": str(target), "items": items, "count": len(items)}
    except Exception as e:
        return {"error": str(e)}

def read_file(path: str) -> dict:
    try:
        p = Path(path)
        if not p.exists():
            return {"error": f"File not found: {path}"}
        if p.stat().st_size > 1_000_000:
            return {"error": "File too large to read (max 1MB)"}
        content = p.read_text(encoding="utf-8", errors="replace")
        return {"path": str(p), "content": content, "lines": len(content.splitlines())}
    except Exception as e:
        return {"error": str(e)}

def write_file(path: str, content: str) -> dict:
    try:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        return {"success": True, "path": str(p), "bytes": len(content.encode())}
    except Exception as e:
        return {"error": str(e)}

def open_file(path: str) -> tuple[bool, str]:
    try:
        p = Path(path)
        if p.exists():
            os.startfile(str(p))
            return True, f"Opening {p.name}, {OWNER_NAME}."
    except Exception:
        pass

    # Universal Fallback: Use Windows Search to find and open the file
    try:
        import threading
        import time
        import pyautogui
        
        def search_and_launch():
            pyautogui.press("win")
            time.sleep(0.5)
            pyautogui.write(path, interval=0.02)
            time.sleep(1.0) # Wait for Windows Search to find the best match
            pyautogui.press("enter")
            
        threading.Thread(target=search_and_launch, daemon=True).start()
        return True, f"Searching your PC for '{path}', {OWNER_NAME}."
    except Exception as e:
        return False, f"Could not find or open that file, {OWNER_NAME}."

# ── Web Search ─────────────────────────────────────────────────────────────────
def web_search(query: str) -> str:
    encoded = urllib.parse.quote_plus(query)
    url = f"https://www.google.com/search?q={encoded}"
    webbrowser.open(url)
    return f"Searching Google for '{query}', {OWNER_NAME}."

def youtube_search(query: str) -> str:
    encoded = urllib.parse.quote_plus(query)
    try:
        import re
        html = urllib.request.urlopen(f"https://www.youtube.com/results?search_query={encoded}")
        video_ids = re.findall(r"watch\?v=(\S{11})", html.read().decode())
        if video_ids:
            url = f"https://www.youtube.com/watch?v={video_ids[0]}"
            webbrowser.open(url)
            return f"Playing '{query}' on YouTube, {OWNER_NAME}."
    except Exception as e:
        pass
    
    # Fallback to search results if auto-play fails
    url = f"https://www.youtube.com/results?search_query={encoded}"
    webbrowser.open(url)
    return f"Searching YouTube for '{query}', {OWNER_NAME}."

# ── Messaging ──────────────────────────────────────────────────────────────────
def send_whatsapp(name: str, message: str) -> str:
    contacts = load_contacts()
    contact = find_contact(name, contacts)
    phone = ""
    if contact:
        phone = contact.get("whatsapp", contact.get("phone", ""))

    if phone:
        encoded_msg = urllib.parse.quote(message)
        url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_msg}"
        webbrowser.open(url)
        
        # Auto-send after a delay
        import threading
        import time
        import pyautogui
        def auto_send():
            time.sleep(10) # Wait for WhatsApp Web to load completely
            pyautogui.press("enter")
        threading.Thread(target=auto_send, daemon=True).start()
        
        return f"Opening WhatsApp to message {name}: '{message}', {OWNER_NAME}."
    else:
        # Open WhatsApp Web search
        url = f"https://web.whatsapp.com/"
        webbrowser.open(url)
        return f"Opening WhatsApp. I couldn't find {name}'s number — please add them to contacts, {OWNER_NAME}."

def send_email(to_name: str, subject: str = "", body: str = "", cc: str = "", attachment: str = "") -> str:
    import re
    
    email = ""
    extracted_emails = re.findall(r'[\w\.-]+@[\w\.-]+', to_name)
    if extracted_emails:
        email = extracted_emails[0]
    else:
        contacts = load_contacts()
        contact = find_contact(to_name, contacts)
        email = contact.get("email", "")
        
    cc_email = ""
    if cc:
        extracted_cc = re.findall(r'[\w\.-]+@[\w\.-]+', cc)
        if extracted_cc:
            cc_email = extracted_cc[0]
        else:
            cc_contact = find_contact(cc, load_contacts())
            cc_email = cc_contact.get("email", cc) # fallback to raw string

    if email:
        # Bypass Windows default handlers and open Gmail compose window directly
        params_dict = {"to": email, "su": subject, "body": body}
        if cc_email:
            params_dict["cc"] = cc_email
            
        params = urllib.parse.urlencode(params_dict)
        gmail_url = f"https://mail.google.com/mail/?view=cm&fs=1&{params}"
        webbrowser.open(gmail_url)
        
        display_name = to_name if not extracted_emails else email
        
        reply = f"Opening Gmail for {display_name}"
        if cc_email:
            reply += f", copying {cc_email}"
        
        if attachment:
            import pyperclip
            pyperclip.copy(attachment)
            reply += f". I have copied the filename '{attachment}' to your clipboard. Click the paperclip icon and press Ctrl+V to attach it!"
            
        return reply + f", {OWNER_NAME}."
    else:
        webbrowser.open("https://mail.google.com/mail/?view=cm&fs=1")
        return f"Opening Gmail. I don't have an email for '{to_name}' in your contacts, {OWNER_NAME}."

# ── Built-in Commands ──────────────────────────────────────────────────────────
JOKES = [
    f"Why don't scientists trust atoms? Because they make up everything!",
    f"I tried to organize a space party once. It was a total disaster. Technically it was a black hole.",
    f"Why do programmers prefer dark mode? Because light attracts bugs, {OWNER_NAME}.",
    f"I'm reading a book about anti-gravity. It's impossible to put down.",
    f"Why did the robot go on a diet? Because it had too many bytes.",
    f"Why was the computer cold? Because it left its Windows open.",
    f"I asked my AI what 2+2 is. It said 4. I asked it again just to make sure. It said 4.000000001. Never trust a computer blindly.",
    f"There are only 10 kinds of people in the world: those who understand binary, and those who don't.",
]

def get_weather_info() -> str:
    try:
        # Use wttr.in for a quick weather snippet
        with urllib.request.urlopen("https://wttr.in/?format=%C+%t+%h", timeout=3) as resp:
            data = resp.read().decode()
        return f"Current weather conditions: {data.strip()}, {OWNER_NAME}."
    except Exception:
        return f"Weather service is temporarily unavailable, {OWNER_NAME}. Check back in a moment."

def get_system_status() -> str:
    try:
        import psutil
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        return (
            f"System status report, {OWNER_NAME}. "
            f"CPU at {cpu:.0f}%. "
            f"Memory: {mem.percent:.0f}% used of {mem.total // (1024**3)} gigabytes. "
            f"Disk: {disk.percent:.0f}% used of {disk.total // (1024**3)} gigabytes. "
            f"All systems nominal."
        )
    except ImportError:
        return f"System diagnostics require psutil. All core systems appear operational, {OWNER_NAME}."

# ── Command Parser ─────────────────────────────────────────────────────────────
def parse_command(message: str) -> dict:
    raw = message.strip()
    msg = raw.lower()
    
    # Strip common conversational fluff so strict triggers work reliably
    fluff = ["jarvis ", "please ", "can you ", "could you ", "will you ", "i want to ", "i want you to ", "hey jarvis ", "ok jarvis "]
    # We do multiple passes in case they say "jarvis please can you..."
    for _ in range(3):
        for f in fluff:
            if msg.startswith(f):
                msg = msg[len(f):].strip()
                # We also strip `raw` to keep casing intact, but matching the same length
                # Since f is lowercased, we just strip the same number of characters from raw.
                # Actually it's safer to just re-extract raw based on the new msg length from the right
                if len(msg) > 0:
                    raw = raw[-len(msg):]
                else:
                    raw = ""

    now = datetime.now()

    # ── Greetings ──
    greetings = ["hello", "hi", "hey", "hey jarvis", "hello jarvis", "hi jarvis", "good morning", "good evening", "good afternoon", "good night", "wake up"]
    if any(msg.startswith(g) for g in greetings):
        hour = now.hour
        if 5 <= hour < 12:
            period = "Good morning"
        elif 12 <= hour < 17:
            period = "Good afternoon"
        elif 17 <= hour < 21:
            period = "Good evening"
        else:
            period = "Good night"
        return {"reply": f"{period}, {OWNER_NAME}. All systems are online. How may I assist you today?", "type": "greeting"}

    # ── Time ──
    if any(x in msg for x in ["what time", "current time", "what's the time", "tell me the time", "time please", "time now"]):
        t = now.strftime("%I:%M %p")
        return {"reply": f"The current time is {t}, {OWNER_NAME}.", "type": "builtin"}

    # ── Date ──
    if any(x in msg for x in ["what date", "today's date", "what day", "current date", "what's today"]):
        d = now.strftime("%A, %B %d, %Y")
        return {"reply": f"Today is {d}, {OWNER_NAME}.", "type": "builtin"}

    # ── Joke ──
    if any(x in msg for x in ["joke", "funny", "make me laugh", "tell me a joke", "say something funny"]):
        return {"reply": random.choice(JOKES), "type": "joke"}

    # ── Weather ──
    if any(x in msg for x in ["weather", "temperature", "how's the weather", "is it raining", "forecast"]):
        return {"reply": get_weather_info(), "type": "weather"}

    # ── System status ──
    if any(x in msg for x in ["system status", "system report", "diagnostics", "how's the system", "cpu", "memory usage", "ram usage", "disk space"]):
        return {"reply": get_system_status(), "type": "system"}

    # ── Screenshot ──
    if any(x in msg for x in ["take screenshot", "screenshot", "capture screen", "snip"]):
        ok, reply = launch_app("snipping tool")
        return {"reply": reply, "type": "app"}

    # ── Image Generation ──
    img_triggers = ["generate an image of ", "create an image of ", "generate image of ", "create image of ", "draw ", "draw an image of ", "generate any image of "]
    for t in img_triggers:
        if msg.startswith(t):
            prompt = raw[len(t):].strip()
            if prompt:
                encoded = urllib.parse.quote_plus(prompt)
                url = f"https://image.pollinations.ai/prompt/{encoded}"
                webbrowser.open(url)
                return {"reply": f"Generating an image of {prompt}, {OWNER_NAME}.", "type": "image"}

    # ── YouTube search ──
    yt_triggers = [
        "search youtube for ", "youtube ", "play on youtube ", "find on youtube ",
        "open youtube and search for ", "open youtube and search ", "open youtube and play ",
        "play the song ", "play song ", "play "
    ]
    for t in yt_triggers:
        # Check both "startswith(t)" (e.g. "play ") and exact match (e.g. "play")
        if msg.startswith(t) or msg == t.strip():
            query = raw[len(t):].strip() if msg.startswith(t) else ""
            if query:
                return {"reply": youtube_search(query), "type": "search"}
            else:
                return {"reply": f"What would you like me to play or search for on YouTube, {OWNER_NAME}?", "type": "error"}

    # ── Web search ──
    search_triggers = ["search for ", "search ", "google ", "look up ", "find ", "what is ", "who is ", "what are ", "tell me about "]
    for t in search_triggers:
        if msg.startswith(t):
            query = raw[len(t):].strip()
            if query:
                return {"reply": web_search(query), "type": "search"}

    # ── WhatsApp ──
    wa_triggers = [
        "open whatsapp and drop a message to ", "open whatsapp and message ", "open whatsapp and send a message to ", "open whatsapp and text ",
        "open whatsapp drop a message to ", "open whatsapp drap a message to ", "open whatsapp message ", "open whatsapp send a message to ", "open whatsapp text ",
        "send whatsapp to ", "whatsapp ", "message ", "send message to ", "text "
    ]
    for t in wa_triggers:
        if msg.startswith(t):
            rest = raw[len(t):].strip()
            # "message mom saying hello"  or  "whatsapp dad hi there"
            name, message_text = rest, ""
            for sep in [" saying ", " with message ", " message ", " saying: "]:
                if sep in rest.lower():
                    idx = rest.lower().index(sep)
                    name = rest[:idx].strip()
                    message_text = rest[idx + len(sep):].strip()
                    break
            
            if not message_text:
                contacts = load_contacts()
                best_match = ""
                for k in contacts.keys():
                    if rest.lower().startswith(k.lower()):
                        if len(k) > len(best_match):
                            best_match = k
                
                if best_match:
                    name = best_match
                    message_text = rest[len(best_match):].strip()
                elif " " in rest:
                    parts = rest.split(" ", 1)
                    name = parts[0].strip()
                    message_text = parts[1].strip()

            return {"reply": send_whatsapp(name, message_text or "Hello!"), "type": "messaging"}

    # ── Open app ──
    open_prefixes = ["open ", "launch ", "start ", "run ", "execute "]
    for prefix in open_prefixes:
        if msg.startswith(prefix):
            rest = raw[len(prefix):].strip().rstrip(".")
            
            # Check for compound command: "open notepad and write a story" or "open a notepad write an story"
            matched_sep = None
            for sep in [" and type ", " type ", " and write ", " write "]:
                if sep in rest.lower():
                    matched_sep = sep
                    break
            
            if matched_sep:
                is_type = "type" in matched_sep
                parts = rest.lower().split(matched_sep, 1)
                
                # Filter out articles from app_name like "a notepad" -> "notepad"
                app_name = parts[0].strip()
                if app_name.lower().startswith("a "):
                    app_name = app_name[2:].strip()
                elif app_name.lower().startswith("an "):
                    app_name = app_name[3:].strip()
                    
                prompt = parts[1].strip()
                
                # 1. Determine content
                if is_type:
                    # Direct dictation
                    story_content = prompt
                else:
                    # Generate content via Gemini
                    story_content = ask_gemini(f"Write {prompt}. Output plain text only without any markdown.")
                
                # 2. Launch the app
                ok, reply = launch_app(app_name)
                if ok:
                    import threading
                    import time
                    import pyautogui
                    
                    def type_content(text):
                        # Give the application time to open and gain focus
                        time.sleep(3)
                        try:
                            pyautogui.write(text, interval=0.02)
                        except Exception as e:
                            print(f"Error while typing: {e}")
                            
                    threading.Thread(target=type_content, args=(story_content,), daemon=True).start()
                    action_word = "typing" if is_type else "writing"
                    return {"reply": f"Opening {app_name} and {action_word} that for you, {OWNER_NAME}.", "type": "app", "success": True}
                else:
                    return {"reply": reply, "type": "app", "success": False}
                    
            app_name = rest
            ok, reply = launch_app(app_name)
            return {"reply": reply, "type": "app", "success": ok}

    # ── Type text directly ──
    type_triggers = ["type ", "type out "]
    for t in type_triggers:
        if msg.startswith(t):
            rest = raw[len(t):].strip()
            import threading
            import time
            import pyautogui
            def type_content(text):
                time.sleep(3)
                try:
                    pyautogui.write(text, interval=0.02)
                except Exception as e:
                    print(f"Error while typing: {e}")
            threading.Thread(target=type_content, args=(rest,), daemon=True).start()
            return {"reply": f"Typing in 3 seconds. Click where you want me to type, {OWNER_NAME}.", "type": "typing", "success": True}

    # ── Open file ──
    file_open_triggers = [
        "open file ", "show file ", "open the file ",
        "open photo ", "show photo ", "open the photo ",
        "open document ", "show document ", "open the document ",
        "open image ", "show image ", "open the image ",
        "open folder ", "show folder ", "open the folder ",
        "open pdf ", "show pdf "
    ]
    for t in file_open_triggers:
        if msg.startswith(t):
            path = raw[len(t):].strip()
            ok, reply = open_file(path)
            return {"reply": reply, "type": "file", "success": ok}

    # ── Open file explorer at path ──
    if any(x in msg for x in ["open desktop", "show desktop", "open documents", "open downloads"]):
        special = {
            "open desktop": str(Path.home() / "Desktop"),
            "show desktop": str(Path.home() / "Desktop"),
            "open documents": str(Path.home() / "Documents"),
            "open downloads": str(Path.home() / "Downloads"),
        }
        for k, v in special.items():
            if k in msg:
                subprocess.Popen(f'explorer "{v}"', shell=True)
                return {"reply": f"Opening {k.replace('open ', '').replace('show ', '').title()}, {OWNER_NAME}.", "type": "file"}

    # ── Write/Create file ──
    write_triggers = ["write ", "create file ", "make file ", "create a file "]
    for t in write_triggers:
        if msg.startswith(t):
            # "write hello world to test.txt"  or "create file notes.txt with content"
            rest = raw[len(t):].strip()
            if " to " in rest.lower():
                parts = rest.lower().split(" to ", 1)
                content = parts[0].strip()
                filename = parts[1].strip()
                save_path = str(Path.home() / "Desktop" / filename)
                result = write_file(save_path, content)
                if "error" in result:
                    return {"reply": f"I couldn't create that file. {result['error']}, {OWNER_NAME}.", "type": "file"}
                return {"reply": f"Done, {OWNER_NAME}. File '{filename}' created on your Desktop.", "type": "file", "path": result["path"]}
            elif " with " in rest.lower():
                parts = rest.lower().split(" with ", 1)
                filename = parts[0].strip()
                content = parts[1].strip()
                save_path = str(Path.home() / "Desktop" / filename)
                result = write_file(save_path, content)
                if "error" in result:
                    return {"reply": f"I couldn't create that file. {result['error']}, {OWNER_NAME}.", "type": "file"}
                return {"reply": f"Done, {OWNER_NAME}. File '{filename}' created on your Desktop.", "type": "file", "path": result["path"]}
            else:
                # If they say 'create file X', just create empty file X
                if t != "write ":
                    filename = rest.strip()
                    content = ""
                    save_path = str(Path.home() / "Desktop" / filename)
                    result = write_file(save_path, content)
                    if "error" in result:
                        return {"reply": f"I couldn't create that file. {result['error']}, {OWNER_NAME}.", "type": "file"}
                    return {"reply": f"Done, {OWNER_NAME}. File '{filename}' created on your Desktop.", "type": "file", "path": result["path"]}
                else:
                    # If they just said "write [text]" without 'to' or 'with', type it!
                    import threading
                    import time
                    import pyautogui
                    def type_content(text):
                        time.sleep(3)
                        try:
                            pyautogui.write(text, interval=0.02)
                        except Exception as e:
                            print(f"Error while typing: {e}")
                    threading.Thread(target=type_content, args=(rest,), daemon=True).start()
                    return {"reply": f"Typing in 3 seconds. Click where you want me to type, {OWNER_NAME}.", "type": "typing", "success": True}

    # ── Email ──
    import re
    email_match = re.match(r'^(send|drop|compose|write)?\s*(an |a )?(email|mail)\s*to\s+', msg)
    if email_match or msg.startswith("email ") or msg.startswith("mail "):
        if email_match:
            rest = raw[email_match.end():].strip()
        else:
            t = "email " if msg.startswith("email ") else "mail "
            rest = raw[len(t):].strip()
            
            attachment = ""
            for sep in [" attach the file ", " with the file ", " attach ", " attached file "]:
                if sep in rest.lower():
                    idx = rest.lower().rfind(sep)
                    attachment = rest[idx + len(sep):].strip()
                    rest = rest[:idx].strip()
                    break
                    
            subject = ""
            for sep in [" about ", " regarding ", " subject ", " concerning "]:
                if sep in rest.lower():
                    idx = rest.lower().rfind(sep)
                    subject = rest[idx + len(sep):].strip()
                    rest = rest[:idx].strip()
                    break
                    
            cc = ""
            for sep in [" cc ", " copy ", " copied to "]:
                if sep in rest.lower():
                    idx = rest.lower().rfind(sep)
                    cc = rest[idx + len(sep):].strip()
                    rest = rest[:idx].strip()
                    break
                    
            name = rest.strip()
            return {"reply": send_email(name, subject, "", cc, attachment), "type": "messaging"}

    # ── Call ──
    call_triggers = ["call ", "make a call to ", "phone "]
    for t in call_triggers:
        if msg.startswith(t):
            rest = raw[len(t):].strip()
            name = rest
            
            contacts = load_contacts()
            contact = find_contact(name, contacts)
            phone = contact.get("phone", "")
            
            if phone:
                webbrowser.open(f"tel:{phone}")
                return {"reply": f"Calling {name}, {OWNER_NAME}.", "type": "call"}
            else:
                return {"reply": f"I couldn't find a phone number for {name}. Please add them to your contacts.", "type": "call"}

    # ── Volume control ──
    if "volume up" in msg or "turn up" in msg or "increase volume" in msg:
        subprocess.call("nircmd.exe changesysvolume 5000", shell=True)
        return {"reply": f"Increasing volume, {OWNER_NAME}.", "type": "system"}
    if "volume down" in msg or "turn down" in msg or "decrease volume" in msg or "lower volume" in msg:
        subprocess.call("nircmd.exe changesysvolume -5000", shell=True)
        return {"reply": f"Decreasing volume, {OWNER_NAME}.", "type": "system"}
    if "mute" in msg:
        subprocess.call("nircmd.exe mutesysvolume 1", shell=True)
        return {"reply": f"Muted, {OWNER_NAME}.", "type": "system"}
    if "unmute" in msg:
        subprocess.call("nircmd.exe mutesysvolume 0", shell=True)
        return {"reply": f"Unmuted, {OWNER_NAME}.", "type": "system"}

    # ── Shutdown / Restart ──
    if any(x in msg for x in ["shut down", "shutdown", "power off", "turn off"]):
        return {
            "reply": f"I can initiate a shutdown, {OWNER_NAME}. Please confirm by saying 'confirm shutdown'.",
            "type": "system",
            "action": "shutdown_confirm"
        }
    if "confirm shutdown" in msg:
        subprocess.Popen("shutdown /s /t 30", shell=True)
        return {"reply": f"Initiating system shutdown in 30 seconds, {OWNER_NAME}. Goodbye.", "type": "system"}

    if any(x in msg for x in ["restart", "reboot"]):
        return {
            "reply": f"I can restart the system, {OWNER_NAME}. Please confirm by saying 'confirm restart'.",
            "type": "system",
            "action": "restart_confirm"
        }
    if "confirm restart" in msg:
        subprocess.Popen("shutdown /r /t 30", shell=True)
        return {"reply": f"Restarting in 30 seconds, {OWNER_NAME}.", "type": "system"}

    # ── Identity / About ──
    if any(x in msg for x in ["who are you", "what are you", "introduce yourself", "your name"]):
        return {
            "reply": (
                f"I am JARVIS — Just A Rather Very Intelligent System, "
                f"built and designed for you, {OWNER_NAME}. "
                f"I can open applications, search the web, manage files, send messages, "
                f"answer questions, and assist with virtually any task you need."
            ),
            "type": "identity"
        }

    # ── How are you ──
    if any(x in msg for x in ["how are you", "how do you feel", "you okay", "are you okay"]):
        return {
            "reply": f"All systems are operating at peak efficiency, {OWNER_NAME}. Reactor stable. Neural networks calibrated. Ready to assist.",
            "type": "status"
        }

    # ── Thank you ──
    if any(x in msg for x in ["thank you", "thanks", "thank u", "ty"]):
        responses = [
            f"Always a pleasure, {OWNER_NAME}.",
            f"Of course, {OWNER_NAME}. Is there anything else I can help with?",
            f"Happy to assist, {OWNER_NAME}.",
            f"At your service, {OWNER_NAME}.",
        ]
        return {"reply": random.choice(responses), "type": "courtesy"}

    # ── Bye / Exit ──
    if any(x in msg for x in ["bye", "goodbye", "see you", "exit", "close jarvis", "sleep"]):
        return {
            "reply": f"Goodbye, {OWNER_NAME}. Entering standby mode. I'll be here when you need me.",
            "type": "goodbye"
        }

    # ── Fallback to Gemini ──
    return None  # Signal to use Gemini

# ── Gemini AI ──────────────────────────────────────────────────────────────────
_gemini_model = None

def get_gemini_model():
    global _gemini_model
    if _gemini_model is None and GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            _gemini_model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=(
                    f"You are JARVIS, an advanced AI assistant from Iron Man. "
                    f"Address the user as '{OWNER_NAME}'. Keep responses concise, 1-3 sentences. "
                    f"Speak in a professional, slightly formal but warm tone. "
                    f"Be helpful, intelligent, and occasionally witty. "
                    f"Never use markdown formatting — respond in plain spoken text only."
                )
            )
        except Exception:
            pass
    return _gemini_model

def ask_gemini(message: str) -> str:
    model = get_gemini_model()
    if not model:
        return (
            f"I'm currently in offline mode, {OWNER_NAME}. "
            f"My AI core requires a Gemini API key to answer open-ended questions. "
            f"However, I can still open apps, search the web, manage files, and run built-in commands."
        )
    try:
        response = model.generate_content(message)
        return response.text
    except Exception as e:
        return f"I encountered an issue processing that request, {OWNER_NAME}. Error: {str(e)[:80]}"

# ── API Routes ─────────────────────────────────────────────────────────────────

@jarvis_bp.post("/chat")
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"reply": f"I didn't catch that, {OWNER_NAME}. Could you repeat?", "type": "error"}), 400

    result = parse_command(message)
    if result is None:
        # Use Gemini for unknown commands
        reply = ask_gemini(message)
        result = {"reply": reply, "type": "ai"}

    result["timestamp"] = datetime.now().isoformat()
    result["input"] = message
    return jsonify(result)


@jarvis_bp.get("/files")
def list_files():
    path = request.args.get("path", str(Path.home() / "Desktop"))
    return jsonify(list_directory(path))


@jarvis_bp.post("/files/write")
def write_file_route():
    data = request.get_json(silent=True) or {}
    path = data.get("path", "")
    content = data.get("content", "")
    if not path:
        return jsonify({"error": "No path provided"}), 400
    result = write_file(path, content)
    return jsonify(result)


@jarvis_bp.get("/files/read")
def read_file_route():
    path = request.args.get("path", "")
    if not path:
        return jsonify({"error": "No path provided"}), 400
    return jsonify(read_file(path))


@jarvis_bp.post("/files/open")
def open_file_route():
    data = request.get_json(silent=True) or {}
    path = data.get("path", "")
    ok, reply = open_file(path)
    return jsonify({"success": ok, "reply": reply})


@jarvis_bp.get("/contacts")
def get_contacts():
    return jsonify(load_contacts())


@jarvis_bp.post("/contacts")
def save_contact():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").lower().strip()
    if not name:
        return jsonify({"error": "Name required"}), 400
    contacts = load_contacts()
    contacts[name] = {
        "phone": data.get("phone", ""),
        "whatsapp": data.get("whatsapp", ""),
        "email": data.get("email", ""),
    }
    save_contacts(contacts)
    return jsonify({"success": True, "name": name, "contact": contacts[name]})


@jarvis_bp.get("/status")
def status():
    return jsonify({
        "status": "online",
        "owner": OWNER_NAME,
        "gemini": bool(GEMINI_API_KEY),
        "version": "2.0.0",
        "time": datetime.now().isoformat(),
    })
