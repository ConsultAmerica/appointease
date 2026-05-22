"""Capture UI screenshots for the team deck. Requires the app running at CAPTURE_BASE."""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from presentation_config import ADMIN_EMAIL, ADMIN_PASSWORD, CAPTURE_BASE, SCREENSHOTS

NEXT_MARKERS = ("Appointment Scheduling", "Completely Automated", "__next", "AppointmentAI")
BAD_MARKERS = ("Authentication Required", "Login – Vercel")


def _ok(page) -> bool:
    html = page.content()
    if any(b in html for b in BAD_MARKERS):
        return False
    title = (page.title() or "").lower()
    if "404" in title or "not found" in title:
        return False
    if page.locator("#__next, [data-nextjs-scroll-focus-boundary]").count() > 0:
        return True
    if "appointmentai" in title or "appointease" in title:
        return True
    return any(m in html for m in NEXT_MARKERS)


def _shot(page, path: Path) -> bool:
    if not _ok(page):
        print(f"  skip {path.name} — page not valid (404, Vercel auth, or wrong site)")
        return False
    page.screenshot(path=str(path), full_page=False)
    print(f"  saved {path.name}")
    return True


def _login_admin(page, base: str) -> bool:
    page.goto(f"{base}/auth/login", wait_until="networkidle", timeout=60_000)
    if not _ok(page):
        return False
    page.fill('input[type="email"]', ADMIN_EMAIL)
    page.fill('input[type="password"]', ADMIN_PASSWORD)
    page.click('button[type="submit"]')
    try:
        page.wait_for_url("**/admin**", timeout=25_000)
    except Exception:
        print("  admin login failed — seed DB and use admin@demo-clinic.com / Admin12345")
        return False
    page.wait_for_timeout(1200)
    return True


def main():
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    base = CAPTURE_BASE
    print(f"Capture base: {base}")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        for name, route in [("01-home.png", "/"), ("02-book.png", "/book")]:
            page.goto(f"{base}{route}", wait_until="networkidle", timeout=60_000)
            page.wait_for_timeout(800)
            _shot(page, SCREENSHOTS / name)

        if _login_admin(page, base):
            page.goto(f"{base}/admin", wait_until="networkidle", timeout=60_000)
            page.wait_for_timeout(800)
            _shot(page, SCREENSHOTS / "03-admin.png")

        browser.close()

    have = list(SCREENSHOTS.glob("*.png"))
    print(f"Done — {len(have)} image(s) in {SCREENSHOTS}")
    if len(have) < 2:
        raise SystemExit(
            "\nNeed at least home + book screenshots.\n"
            "  cd appointease && npm run dev\n"
            "  $env:PRESENTATION_CAPTURE_BASE = 'http://localhost:3000'\n"
            "  python scripts/capture-presentation-screenshots.py\n"
        )


if __name__ == "__main__":
    main()
