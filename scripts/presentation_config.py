"""Shared config for team presentation."""
import os
from pathlib import Path

DOCS = Path(__file__).resolve().parents[1] / "docs"
SCREENSHOTS = DOCS / "presentation-screenshots"

# Prefer local dev for screenshots: npm run dev, then capture (reliable, no Vercel 401).
CAPTURE_BASE = os.environ.get(
    "PRESENTATION_CAPTURE_BASE",
    os.environ.get("PRESENTATION_LIVE_URL", "http://localhost:3000"),
).rstrip("/")

LIVE_URL = os.environ.get(
    "PRESENTATION_LIVE_URL",
    CAPTURE_BASE,
).rstrip("/")

OUT_DECK = DOCS / "AppointmentAI-Team-Presentation.pptx"

ADMIN_EMAIL = "admin@demo-clinic.com"
ADMIN_PASSWORD = "Admin12345"
