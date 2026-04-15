"""
Playwright-based JavaScript renderer for SPA (React CSR, Vue CSR, Angular) sites.

Uses Playwright's synchronous API so it works inside the existing synchronous
Celery/ThreadPoolExecutor crawl pipeline without requiring asyncio changes.

Concurrency is capped at MAX_CONTEXTS via a threading.Semaphore — browsers are
heavy (~100-200 MB RAM each), so we never open more than 4 contexts at once.

Usage:
    with PlaywrightRenderer() as renderer:
        html, status_code, final_url = renderer.render(url)
"""

import threading
import time

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class PlaywrightRenderer:
    """Headless Chromium renderer with a bounded concurrency pool."""

    MAX_CONTEXTS = 4          # max simultaneous browser pages
    PAGE_TIMEOUT_MS = 20_000  # 20s per page

    def __init__(self):
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError(
                "playwright is not installed. Run: pip install playwright && playwright install chromium"
            )
        self._semaphore = threading.Semaphore(self.MAX_CONTEXTS)
        self._pw = None
        self._browser = None

    def start(self) -> None:
        """Launch the headless browser. Call once before rendering."""
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        )

    def stop(self) -> None:
        """Close the browser and Playwright instance."""
        try:
            if self._browser:
                self._browser.close()
        except Exception:
            pass
        try:
            if self._pw:
                self._pw.stop()
        except Exception:
            pass

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *_):
        self.stop()

    def render(self, url: str) -> tuple[str, int, str]:
        """
        Render a URL in a headless Chromium browser.
        Returns (html, status_code, final_url).
        Thread-safe — semaphore caps MAX_CONTEXTS concurrent renders.
        """
        with self._semaphore:
            context = self._browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
                java_script_enabled=True,
            )
            status_code = 200
            try:
                page = context.new_page()

                # Capture the main document response status
                def _on_response(response):
                    nonlocal status_code
                    try:
                        if response.request.is_navigation_request() and response.request.resource_type == "document":
                            status_code = response.status
                    except Exception:
                        pass

                page.on("response", _on_response)

                # Try networkidle first (waits for JS to finish loading data)
                # Fall back to domcontentloaded on timeout (e.g. infinite polling pages)
                try:
                    page.goto(url, wait_until="networkidle", timeout=self.PAGE_TIMEOUT_MS)
                except PlaywrightTimeout:
                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=self.PAGE_TIMEOUT_MS)
                    except Exception:
                        pass
                except Exception:
                    pass

                html = page.content()
                final_url = page.url
                page.close()
                return html, status_code, final_url
            finally:
                context.close()
