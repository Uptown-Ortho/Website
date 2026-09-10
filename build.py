#!/usr/bin/env python3
"""Assemble the site's pages from src/ into HTML at the repo root.

Run it, commit the output. Netlify serves the committed HTML, so there is still
no build step on the host and no build configuration to get wrong — the split
into pages did not cost us that.

    python3 build.py
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'

# Per page: <title>, meta description, and the URL path it is canonical at.
# Each page targets its own search intent — that is most of the point of the
# split, so keep the titles distinct rather than variations on one phrase.
PAGES = {
    'index': dict(
        path='',
        title='Uptown Orthodontics — Braces &amp; Clear Aligners in Bay City, MI',
        desc='Uptown Orthodontics in Bay City, MI — braces, clear aligners and certified '
             'Invisalign providers, treating kids, teens and adults. Free consultation, 989.894.2929.',
        jsonld=True),
    'about': dict(
        path='about.html',
        title='Meet Our Doctors &amp; Team — Uptown Orthodontics, Bay City MI',
        desc='Dr. Brandan LeBourdais and Dr. Hannah Collison, and the team you will see at '
             'every visit. AAO member orthodontists serving Bay City and the Tri-Cities.'),
    'treatments': dict(
        path='treatments.html',
        title='Orthodontic Treatments in Bay City, MI — Braces, Clear Aligners &amp; More',
        desc='Braces, clear aligners, early treatment, teen and adult orthodontics, surgery, '
             'retainers, 3D imaging and emergency care — with insurance and payment plans.'),
    'quiz': dict(
        path='quiz.html',
        title='Smile Quiz — Where to Start | Uptown Orthodontics',
        desc='Not sure where to begin? Answer three quick questions and we will point you '
             'toward the right kind of orthodontic treatment. Bay City, MI.'),
    'reviews': dict(
        path='reviews.html',
        title='Patient Reviews — Uptown Orthodontics, Bay City MI',
        desc='What our patients say, and our Google rating. Read reviews of Uptown '
             'Orthodontics in Bay City, Michigan, and leave one of your own.'),
}

# Which nav entry is "here" for each page, so the current page is marked.
CURRENT = {'index': None, 'about': 'About Us', 'treatments': 'Treatments',
           'quiz': 'Smile Quiz', 'reviews': 'Reviews'}


def nav_for(page: str, nav: str) -> str:
    """Mark the current page in the shared nav."""
    label = CURRENT.get(page)
    if not label:
        return nav
    # Top-level buttons (dropdowns) and plain links are both possible.
    nav = re.sub(rf'(<button[^>]*class="nav-top"[^>]*)(>{re.escape(label)}</button>)',
                 r'\1 aria-current="true"\2', nav)
    nav = re.sub(rf'(<a href="[^"]*"[^>]*)(>{re.escape(label)}</a>)',
                 r'\1 aria-current="page"\2', nav)
    return nav


def build() -> int:
    layout = (SRC / 'layout.html').read_text(encoding='utf-8')
    nav = (SRC / 'nav.html').read_text(encoding='utf-8').strip()
    footer = (SRC / 'footer.html').read_text(encoding='utf-8').strip()
    jsonld = (SRC / 'jsonld.html').read_text(encoding='utf-8').strip()

    written = 0
    for page, meta in PAGES.items():
        content = (SRC / 'pages' / f'{page}.html').read_text(encoding='utf-8').strip()
        html = (layout
                .replace('{{TITLE}}', meta['title'])
                .replace('{{DESC}}', meta['desc'])
                .replace('{{PATH}}', meta['path'])
                .replace('{{JSONLD}}', '\n' + jsonld + '\n' if meta.get('jsonld') else '')
                .replace('{{NAV}}', nav_for(page, nav))
                .replace('{{CONTENT}}', content)
                .replace('{{FOOTER}}', footer))
        left = re.findall(r'\{\{[A-Z]+\}\}', html)
        if left:
            print(f'ERROR: {page}.html still has placeholders: {left}', file=sys.stderr)
            return 1
        out = ROOT / f'{page}.html'
        out.write_text(html, encoding='utf-8')
        print(f'  {out.name:18} {len(html)//1024:>3} KB')
        written += 1
    print(f'{written} pages built')
    return 0


if __name__ == '__main__':
    raise SystemExit(build())
