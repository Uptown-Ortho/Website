#!/usr/bin/env python3
"""Verify a deployed site actually works, before the client looks at it.

    python3 scripts/check-site.py https://staging--....netlify.app

Written after a broken nav reached staging while the client was using it for
review. The bug was a forwarder file shadowing a directory page, so every nav
link redirect-looped back to the home page. It got through because the check at
the time used fetch(url, redirect='follow'), which follows a loop silently and
reports 200.

So this does the things that check missed:
  - counts redirect hops instead of following them blindly
  - confirms the page served is the page the link asked for, by comparing the
    canonical to the requested URL
  - follows the nav links found in the HTML rather than a list I maintain by hand
"""
import re
import subprocess
import sys

TIMEOUT = 25


def fetch(url):
    """-> (status, location, body), never following redirects.

    Uses curl rather than urllib: this machine's Python cannot verify Let's
    Encrypt chains (a local trust-store gap, not a site problem), and a checking
    tool must not be the thing that turns verification off.
    """
    r = subprocess.run(
        ['curl', '-sS', '-o', '-', '-w', '\n__STATUS__%{http_code}\n__LOCATION__%{redirect_url}',
         '--max-time', str(TIMEOUT), url],
        capture_output=True, text=True)
    out = r.stdout
    status = re.search(r'__STATUS__(\d+)', out)
    loc = re.search(r'__LOCATION__(\S*)', out)
    body = out.split('\n__STATUS__')[0]
    return (int(status.group(1)) if status else 0,
            loc.group(1) if loc else '',
            body)


def canonical(html):
    m = re.search(r'<link rel="canonical" href="([^"]+)"', html)
    return m.group(1) if m else None


def title(html):
    m = re.search(r'<title>([^<]*)</title>', html)
    return m.group(1) if m else '(no title)'


def check(base):
    base = base.rstrip('/')
    fails, checked = [], 0

    status, loc, home = fetch(base + '/')
    if status != 200:
        print(f'FATAL: {base}/ returned {status}')
        return 1

    # Follow the nav as published, not a hand-maintained list.
    nav = re.search(r'<div class="nav-links".*?</nav>', home, re.S)
    links = sorted({h.split('#')[0] for h in re.findall(r'href="(/[^"]*)"', nav.group(0) if nav else home)
                    if not h.startswith('/assets')})
    print(f'nav links found: {len(links)}\n')

    for link in links:
        url = base + link
        hops, seen, cur = 0, set(), url
        while hops < 6:
            status, loc, body = fetch(cur)
            if status in (301, 302, 307, 308):
                nxt = loc if loc.startswith('http') else base + loc
                if nxt in seen:
                    fails.append(f'{link}: REDIRECT LOOP at {nxt}')
                    break
                seen.add(nxt); cur = nxt; hops += 1; continue
            break
        checked += 1
        if status != 200:
            fails.append(f'{link}: final status {status}')
            continue
        if hops > 1:
            fails.append(f'{link}: {hops} redirect hops (expected at most 1)')
        # The page served must be the page the link asked for.
        canon = canonical(body)
        want = link.rstrip('/').rsplit('/', 1)[-1] or ''
        if canon and want and not canon.rstrip('/').endswith(want):
            fails.append(f'{link}: served a page whose canonical is {canon} — wrong page')
        h1s = re.findall(r'<h1[^>]*>', body)
        if len(h1s) != 1:
            fails.append(f'{link}: {len(h1s)} <h1> elements (expected 1)')
        print(f'  {link:22} {status}  {hops} hop(s)  {title(body)[:44]}')

    print()
    if fails:
        print(f'{len(fails)} PROBLEM(S):')
        for f in fails:
            print(f'  - {f}')
        return 1
    print(f'{checked} nav destinations OK — no loops, no wrong pages, one h1 each')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(check(sys.argv[1]))
