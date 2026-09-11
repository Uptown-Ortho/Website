#!/usr/bin/env python3
"""Assemble the site's pages from src/ into HTML at the repo root.

Run it, commit the output. Netlify serves the committed HTML, so there is still
no build step on the host and no build configuration to get wrong — the split
into pages did not cost us that.

    python3 build.py
"""
import hashlib, pathlib, re, sys

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
        path='about/',
        title='Meet Our Doctors &amp; Team — Uptown Orthodontics, Bay City MI',
        desc='Dr. Brandan LeBourdais and Dr. Hannah Collison, and the team you will see at '
             'every visit. AAO member orthodontists serving Bay City and the Tri-Cities.'),
    'treatments': dict(
        path='treatments/',
        title='Orthodontic Treatments in Bay City, MI — Braces, Clear Aligners &amp; More',
        desc='Braces, clear aligners, early treatment, teen and adult orthodontics, surgery, '
             'retainers, 3D imaging and emergency care — with insurance and payment plans.'),
    'quiz': dict(
        path='quiz/',
        title='Smile Quiz — Where to Start | Uptown Orthodontics',
        desc='Not sure where to begin? Answer three quick questions and we will point you '
             'toward the right kind of orthodontic treatment. Bay City, MI.'),
    'reviews': dict(
        path='reviews/',
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
                 r'\1 aria-current="page"\2', nav)
    nav = re.sub(rf'(<a href="[^"]*"[^>]*)(>{re.escape(label)}</a>)',
                 r'\1 aria-current="page"\2', nav)
    return nav



# ── Responsive images ────────────────────────────────────────────────────────
# Every device was downloading the same file: a phone pulled a 1400px-wide image
# into a 311px tile, roughly four times the pixels it can use. build.py now emits
# width variants and a srcset so the browser picks. Variants are generated here
# and committed, so the host still serves plain files.

VARIANT_WIDTHS = (400, 800, 1200)

# `sizes` has to describe the layout or the browser guesses 100vw and picks the
# largest file. Keyed by filename; the value is the CSS width of the slot.
SIZES = {
    'doctors-portraits.jpg': '(max-width: 1240px) 100vw, 1200px',
    'default_grid':          '(max-width: 700px) 100vw, (max-width: 1240px) 50vw, 600px',
}
# Images small enough that variants would not pay for themselves.
SKIP = {'logo.png', 'dr-collison-avatar.jpg', 'dr-lebourdais-avatar.jpg'}


def make_variants(name: str) -> list:
    """Write <stem>-<w>.<ext> beside the original; return the widths that exist."""
    try:
        from PIL import Image
    except ImportError:
        return []
    src = ROOT / 'assets' / 'img' / name
    if not src.exists():
        return []
    im = Image.open(src)
    made = []
    for w in VARIANT_WIDTHS:
        if w >= im.width:
            continue
        stem, ext = name.rsplit('.', 1)
        out = src.with_name(f'{stem}-{w}.{ext}')
        if not out.exists() or out.stat().st_mtime < src.stat().st_mtime:
            r = im.convert('RGB') if ext.lower() in ('jpg', 'jpeg') else im.copy()
            r = r.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            if ext.lower() in ('jpg', 'jpeg'):
                r.save(out, 'JPEG', quality=74, optimize=True, progressive=True)
            else:
                r.save(out, optimize=True)
        made.append(w)
    return made


def add_srcset(html: str) -> str:
    """Attach srcset/sizes to every <img> that has variants."""
    def one(m):
        tag = m.group(0)
        f = re.search(r'src="assets/img/([\w.-]+)"', tag)
        if not f or 'srcset=' in tag:
            return tag
        name = f.group(1)
        if name in SKIP:
            return tag
        widths = make_variants(name)
        if not widths:
            return tag
        stem, ext = name.rsplit('.', 1)
        srcset = ', '.join(f'assets/img/{stem}-{w}.{ext} {w}w' for w in widths)
        from PIL import Image
        full = Image.open(ROOT / 'assets' / 'img' / name).width
        srcset += f', assets/img/{name} {full}w'
        sizes = SIZES.get(name, SIZES['default_grid'])
        return tag[:-1] + f' srcset="{srcset}" sizes="{sizes}">'
    return re.sub(r'<img\b[^>]*>', one, html)


def asset_version(name: str) -> str:
    """Short content hash, appended to the CSS/JS URLs as ?v=.

    netlify.toml caches /assets/* for seven days while HTML is must-revalidate.
    Without this, a deploy would serve returning visitors new HTML against
    week-old CSS — the one combination that renders a broken page. The hash
    changes only when the file does, so the long cache still does its job.
    """
    data = (ROOT / 'assets' / name).read_bytes()
    return hashlib.sha256(data).hexdigest()[:8]



def build() -> int:
    layout = (SRC / 'layout.html').read_text(encoding='utf-8')
    cssv, jsv = asset_version('site.css'), asset_version('site.js')
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
                .replace('{{FOOTER}}', footer)
                .replace('{{CSSV}}', cssv)
                .replace('{{JSV}}', jsv))
        html = add_srcset(html)
        left = re.findall(r'\{\{[A-Z]+\}\}', html)
        if left:
            print(f'ERROR: {page}.html still has placeholders: {left}', file=sys.stderr)
            return 1
        # Home stays at the root; the rest become <name>/index.html so the clean
        # URL is the filesystem, not a Netlify setting. Asset and link references
        # are root-relative for the same reason.
        # Not just quote-preceded: srcset entries are comma-separated, so match
        # any bare 'assets/' that is not already rooted.
        html = re.sub(r'(?<![/\w-])assets/', '/assets/', html)
        html = re.sub(r'(?<=href=")(?!https?:|mailto:|tel:|sms:|#|/)([a-z-]+)\.html', r'/\1/', html)
        html = html.replace('href="/index"', 'href="/"')
        out = ROOT / 'index.html' if page == 'index' else ROOT / page / 'index.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding='utf-8')
        rel = out.relative_to(ROOT)
        print(f'  {str(rel):24} {len(html)//1024:>3} KB')
        written += 1
    print(f'{written} pages built')
    return 0


if __name__ == '__main__':
    raise SystemExit(build())
