"""
app.py — JARVIS Flask Application Entry Point
MODULE 1: Owner Authentication & Security
"""
import logging
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# ── Load environment variables from .env ──────────────────────────────────────
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("JARVIS")


def create_app() -> Flask:
    app = Flask(__name__)

    # ── Config ─────────────────────────────────────────────────────────────
    app.config["SECRET_KEY"]                 = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
    app.config["JWT_SECRET_KEY"]             = os.getenv("JWT_SECRET_KEY",   "jwt-dev-secret")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"]   = timedelta(hours=4)
    app.config["JWT_TOKEN_LOCATION"]         = ["headers"]
    app.config["JWT_HEADER_NAME"]            = "Authorization"
    app.config["JWT_HEADER_TYPE"]            = "Bearer"

    # ── Extensions ─────────────────────────────────────────────────────────
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    jwt = JWTManager(app)

    # ── JWT Error Handlers ─────────────────────────────────────────────────
    @jwt.unauthorized_loader
    def unauthorized_response(error_msg):
        return jsonify({"error": "Missing or invalid token.", "details": error_msg}), 401

    @jwt.expired_token_loader
    def expired_token_response(jwt_header, jwt_payload):
        return jsonify({"error": "Session expired. Please log in again.", "code": "TOKEN_EXPIRED"}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(error_msg):
        return jsonify({"error": "Invalid token.", "details": error_msg}), 422

    # ── Blueprints ─────────────────────────────────────────────────────────
    from routes.auth_routes import auth_bp
    from routes.jarvis_routes import jarvis_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(jarvis_bp)

    # ── Root ───────────────────────────────────────────────────────────────
    @app.get("/")
    def root():
        return jsonify({
            "name": "JARVIS AI Interface",
            "module": "2 — Voice Assistant & Command Center",
            "version": "2.0.0",
            "endpoints": [
                "GET  /api/auth/status",
                "POST /api/auth/setup",
                "POST /api/auth/login",
                "GET  /api/auth/me  (JWT required)",
                "POST /api/jarvis/chat",
                "GET  /api/jarvis/files",
                "POST /api/jarvis/files/write",
                "GET  /api/jarvis/files/read",
                "POST /api/jarvis/files/open",
                "GET  /api/jarvis/contacts",
                "POST /api/jarvis/contacts",
                "GET  /api/jarvis/status",
            ],
        })

    # ── Hardware Fingerprint Boot Check ───────────────────────────────────
    from security.auth import is_setup_complete, verify_hardware_fingerprint
    if is_setup_complete():
        if not verify_hardware_fingerprint():
            logger.critical(
                "BOOT ABORTED: Hardware fingerprint mismatch. "
                "This JARVIS installation was copied to an unauthorized machine."
            )
            # In production you might raise SystemExit(1) here.
            # For development we log and continue.

    logger.info("JARVIS Security Module initialized. Ready on http://127.0.0.1:5000")
    return app


if __name__ == "__main__":
    application = create_app()
    application.run(host="127.0.0.1", port=5000, debug=False)
