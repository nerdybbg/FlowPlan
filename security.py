"""
FlowPlan OS — Enterprise Security Middleware & Cryptographic Hardening Suite
Enforces security headers, sliding-window rate limits, PBKDF2-HMAC-SHA256 hashing, and XSS sanitization.
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import time
import hashlib
import hmac
from collections import defaultdict
import html

# Sliding-Window Rate Limiter (45 requests per 60 seconds per IP)
RATE_LIMIT_WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = 45

client_request_history = defaultdict(list)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Anti-scraping, clickjacking prevention, and XSS defense headers
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' https:; "
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://formspree.io;"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), geolocation=(), payment=()"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        timestamps = client_request_history[client_ip]
        client_request_history[client_ip] = [
            t for t in timestamps if now - t < RATE_LIMIT_WINDOW_SECONDS
        ]

        if len(client_request_history[client_ip]) >= MAX_REQUESTS_PER_WINDOW:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait 60 seconds."
            )

        client_request_history[client_ip].append(now)
        return await call_next(request)


def sanitize_input(text: str) -> str:
    """Escapes HTML entities to defend against script injection."""
    if not isinstance(text, str):
        return text
    return html.escape(text.strip())


def hash_password_pbkdf2(password: str, salt: str = "FLOWPLAN_OS_PBKDF2_SALT_2026") -> str:
    """Derives a 256-bit cryptographic key using PBKDF2-HMAC-SHA256."""
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120000
    )
    return f"pbkdf2_sha256$120000${dk.hex()}"


def verify_password_pbkdf2(password: str, stored_hash: str, salt: str = "FLOWPLAN_OS_PBKDF2_SALT_2026") -> bool:
    computed = hash_password_pbkdf2(password, salt)
    return hmac.compare_digest(computed, stored_hash)
