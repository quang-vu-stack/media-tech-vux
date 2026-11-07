#!/usr/bin/env python3
"""Read-only Chromium smoke probe for MEDIA TECH VUX.

Selftest: verifies Chromium launches, executes JavaScript, and handles clicks.
--url: only tests a running web login shell, WITHOUT signing in or modifying data.
This is NOT the project's Playwright E2E suite and never marks real_browser_e2e PASS.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--selftest', action='store_true', help='Verify Chromium itself without internet or a game server')
    parser.add_argument('--url', help='Existing MEDIA TECH VUX web URL (read-only login-shell check)')
    parser.add_argument('--allow-remote', action='store_true', help='Explicitly allow a public HTTPS URL')
    parser.add_argument('--output', help='Optional JSON evidence destination')
    args = parser.parse_args()
    if args.selftest == bool(args.url):
        parser.error('Choose exactly one of --selftest or --url')
    if args.url:
        target = urlparse(args.url)
        is_local = target.hostname in ('localhost', '127.0.0.1', '::1')
        if target.scheme not in ('http', 'https') or not target.hostname or target.username or target.password or target.query or target.fragment:
            parser.error('Only valid http(s) URLs without embedded credentials are accepted')
        if not is_local and (not args.allow_remote or target.scheme != 'https'):
            parser.error('Remote target requires HTTPS and --allow-remote')

    evidence = {
        'product': 'MEDIA TECH VUX',
        'checked_at': datetime.now(timezone.utc).isoformat(),
        'mode': 'chromium_engine_selftest' if args.selftest else 'website_login_shell_only',
        'status': 'FAIL',
        'real_browser_e2e': 'NOT_RUN',
        'reason': 'This smoke probe does not execute the full React/QA-account E2E suite.',
    }
    browser = None
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as playwright:
            opts = dict(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
            chromium_path = os.environ.get('CHROMIUM_EXECUTABLE', '').strip()
            if chromium_path:
                opts['executable_path'] = chromium_path
            elif Path('/usr/bin/chromium').exists():
                opts['executable_path'] = '/usr/bin/chromium'
            browser = playwright.chromium.launch(**opts)
            page = browser.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)[:200]))
            if args.selftest:
                page.set_content('''<!doctype html><meta charset="utf-8"><h1 id="status">READY</h1>
                    <button id="run" onclick="document.getElementById('status').textContent='CLICK_OK'">Verify</button>''')
                page.locator('#run').click()
                if page.locator('#status').inner_text() != 'CLICK_OK':
                    raise AssertionError('JavaScript click handler did not run')
            else:
                page.goto(args.url, wait_until='domcontentloaded', timeout=20000)
                page.wait_for_timeout(500)
                body = page.locator('body').inner_text(timeout=10000)
                if 'MEDIA TECH' not in body or 'VUS' not in body:
                    raise AssertionError('MEDIA TECH VUX branding missing')
                if 'Chưa tìm thấy cấu hình Supabase' in body:
                    raise AssertionError('Frontend missing Supabase configuration')
                if 'Đăng nhập' not in body and 'CEO' not in body:
                    raise AssertionError('Login screen or CEO app not found')
            if errors:
                raise AssertionError('Uncaught browser exception: ' + '; '.join(errors))
            evidence['status'] = 'PASS'
            evidence['browser_engine'] = 'Chromium via Python Playwright'
            browser.close()
    except Exception as error:
        evidence['error'] = (str(error).splitlines() or ['Unknown error'])[0][:250]
    finally:
        if browser is not None:
            try:
                if browser.is_connected():
                    browser.close()
            except Exception:
                pass
    payload = json.dumps(evidence, indent=2, ensure_ascii=False)
    print(payload)
    if args.output:
        destination = Path(args.output)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(payload + '\n', encoding='utf-8')
    return 0 if evidence['status'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
