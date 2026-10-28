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
    'financing': dict(
        path='financing/',
        title='Insurance &amp; Payment Plans | Uptown Orthodontics, Bay City MI',
        desc='How we handle insurance, down payments and monthly plans, plus the free '
             'consultation. Orthodontic payment options in Bay City, Michigan.'),
    'quiz': dict(
        path='quiz/',
        title='Smile Quiz — Where to Start | Uptown Orthodontics',
        desc='Not sure where to begin? Answer three quick questions and we will point you '
             'toward the right kind of orthodontic treatment. Bay City, MI.'),
    'faq': dict(
        path='faq/',
        title='Patient FAQ: Common Questions | Uptown Orthodontics, Bay City MI',
        desc='Straight answers about your first visit, insurance and payments, and what to '
             'do when a bracket or wire comes loose. Uptown Orthodontics, Bay City, MI.'),
    'reviews': dict(
        path='reviews/',
        title='Patient Reviews — Uptown Orthodontics, Bay City MI',
        desc='What our patients say, and our Google rating. Read reviews of Uptown '
             'Orthodontics in Bay City, Michigan, and leave one of your own.'),
}

# Which nav entry is "here" for each page, so the current page is marked.
CURRENT = {'index': None, 'about': 'About Us', 'treatments': 'Treatments', 'faq': 'FAQ', 'financing': 'Treatments',
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
# ---- Google rating -------------------------------------------------------
# The one place the score lives. It appeared in five spots across two pages
# (the number, the star fill, the aria-label, the review count), which is four
# chances to update it inconsistently. Change these two values and rebuild.
RATING = 4.8
REVIEW_COUNT = 20


def rating_fill() -> str:
    """Star fill as a percentage of the five-star row.

    Exact only because .star-rating has no letter-spacing: the fill is a
    percentage of the element's width, and the trailing space after each glyph
    would make that percentage overstate the score. See the note on
    .rating-banner .star-rating in site.css before adding any.
    """
    return f'{RATING / 5 * 100:g}%'


def rating_label() -> str:
    return f'{RATING:g} out of 5 stars'


SIZES = {
    'doctors-portraits.jpg': '(max-width: 1240px) 100vw, 1200px',
    'default_grid':          '(max-width: 700px) 100vw, (max-width: 1240px) 50vw, 600px',
}
# Fixed-size images, where the default grid `sizes` would lie badly. A team
# headshot renders at 104 CSS px; telling the browser it fills 50vw makes it
# fetch a variant several times larger than the circle it lands in.
FIXED_SIZES = {
    'team-april.jpg': '104px', 'team-amanda.jpg': '104px',
    'team-ashtyn.jpg': '104px', 'team-beth.jpg': '104px',
}
# Images small enough that variants would not pay for themselves.
SKIP = {'logo.png', 'dr-collison-avatar.jpg', 'dr-lebourdais-avatar.jpg'}

# Background images that only ever appear in site.css, picked by media query
# because a CSS background cannot take a srcset.
#
# These need naming explicitly because make_variants() is otherwise only ever
# reached from add_srcset(), which walks <img> tags. Nothing walks the
# stylesheet, so a background image's variants were never regenerated:
# hero-2.jpg was replaced on 2026-10-08 and every screen at 1200px or narrower
# kept serving a *different photograph* from 2026-09-10 until the client
# spotted it on her phone six weeks later. She read it as "the update hasn't
# reached the phone version", which was exactly right.
#
# Anything the stylesheet points at by hand belongs here.
# The 400 and 800 hero files are not referenced by any rule today. They are
# regenerated anyway, because leaving them behind as the *previous* photograph
# under a current-looking name is the trap that caused this in the first place:
# a file called hero-2-800.jpg should never be anything but hero-2.
CSS_BACKGROUNDS = {
    'hero-1.jpg': (400, 800, 1200),
    'hero-2.jpg': (400, 800, 1200),
    'exterior.jpg': (700, 1100),
}


def build_css_background_variants() -> list:
    """Regenerate variants for images referenced only from the stylesheet.

    Returns a list of human-readable notes about what was rebuilt, so a stale
    variant is reported at build time rather than discovered by the client.
    """
    try:
        from PIL import Image
    except ImportError:
        return ['PIL missing: CSS background variants not checked']
    notes = []
    for name, widths in CSS_BACKGROUNDS.items():
        src = ROOT / 'assets' / 'img' / name
        if not src.exists():
            notes.append(f'{name}: MISSING')
            continue
        im = Image.open(src)
        stem, ext = name.rsplit('.', 1)
        for w in widths:
            out = src.with_name(f'{stem}-{w}.{ext}')
            want_h = round(im.height * w / im.width)
            # Rebuild when it is missing, older than the source, or a different
            # shape from the source. The ratio test is what catches a variant
            # left behind by a *previous* photo: a replacement shot with a new
            # aspect ratio leaves a correctly-named file that is the wrong
            # picture, and only the ratio gives it away.
            stale = (not out.exists()
                     or out.stat().st_mtime < src.stat().st_mtime
                     or abs(Image.open(out).width / Image.open(out).height
                            - im.width / im.height) > 0.01)
            if not stale:
                continue
            why = 'missing' if not out.exists() else 'stale'
            r = im.convert('RGB').resize((w, want_h), Image.LANCZOS)
            r.save(out, 'JPEG', quality=78, optimize=True, progressive=True)
            notes.append(f'{out.name} rebuilt ({why}, {w}x{want_h}, '
                         f'{out.stat().st_size // 1024} KB)')
    return notes


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
        sizes = SIZES.get(name) or FIXED_SIZES.get(name) or SIZES['default_grid']
        return tag[:-1] + f' srcset="{srcset}" sizes="{sizes}">'
    return re.sub(r'<img\b[^>]*>', one, html)


IMG_REF = re.compile(r'(/assets/img/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp|svg|gif))(\?v=[0-9a-f]{8})?')


def _img_hash(rel: str, _cache={}) -> str:
    """Content hash for one image under /assets/img/."""
    if rel not in _cache:
        f = ROOT / rel.lstrip('/')
        _cache[rel] = hashlib.sha256(f.read_bytes()).hexdigest()[:8] if f.is_file() else None
    return _cache[rel]


def version_images(text: str) -> str:
    """Append ?v=<content hash> to every /assets/img/ reference.

    netlify.toml caches /assets/* for seven days. Images are replaced in place
    under the same filename when a photo is updated, so without this a returning
    visitor keeps the OLD photo for up to a week -- which is how the previous
    exterior shot, still showing the old practice name, survived a swap. The
    hash changes only when the bytes change, so the long cache still does its
    job. Idempotent: an existing ?v= is stripped and recomputed.
    """
    def one(m):
        rel, h = m.group(1), _img_hash(m.group(1))
        return rel if h is None else f'{rel}?v={h}'
    return IMG_REF.sub(one, text)


def version_stylesheet_images() -> None:
    """Same treatment for url() backgrounds inside assets/site.css.

    Hero slides and the exterior banner are CSS backgrounds, which cannot take a
    srcset and are not reachable from the HTML rewrite. Rewritten in place and
    idempotently, so site.css stays the editable source of truth; its own ?v=
    hash is computed afterwards and therefore reflects these edits.
    """
    f = ROOT / 'assets' / 'site.css'
    css = f.read_text(encoding='utf-8')
    out = version_images(css)
    if out != css:
        f.write_text(out, encoding='utf-8')


def faq_jsonld(content: str) -> str:
    """Build FAQPage structured data from the FAQ page's own <details> blocks.

    Generated from the markup rather than maintained separately: Google requires
    the structured data to match the visible answers, and a hand-kept copy drifts
    the first time a question is reworded. Questions with no answer yet simply are
    not in the markup, so they cannot leak into the schema either.

    None of the local competitors publish FAQPage data -- Copus has 27 questions
    and no structured data at all -- so this is cheap ground to take.
    """
    import html as _html, json as _json
    pairs = re.findall(
        r'<details class="faq-item">\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>',
        content, re.S)
    if not pairs:
        return ''

    def plain(fragment: str) -> str:
        text = re.sub(r'<[^>]+>', '', fragment)
        text = _html.unescape(text).replace('\u00a0', ' ')
        return ' '.join(text.split())

    data = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {'@type': 'Question', 'name': plain(q),
             'acceptedAnswer': {'@type': 'Answer', 'text': plain(a)}}
            for q, a in pairs
        ],
    }
    return ('\n<script type="application/ld+json">\n'
            + _json.dumps(data, indent=2, ensure_ascii=False) + '\n</script>\n')


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
    # Must precede version_stylesheet_images(), which hashes these files to
    # write their ?v= into site.css, which in turn must precede
    # asset_version('site.css') so the stylesheet hash covers it.
    for note in build_css_background_variants():
        print(f'  image: {note}')
    version_stylesheet_images()
    cssv, jsv = asset_version('site.css'), asset_version('site.js')
    nav = (SRC / 'nav.html').read_text(encoding='utf-8').strip()
    footer = (SRC / 'footer.html').read_text(encoding='utf-8').strip()
    jsonld = (SRC / 'jsonld.html').read_text(encoding='utf-8').strip()

    written = 0
    for page, meta in PAGES.items():
        content = (SRC / 'pages' / f'{page}.html').read_text(encoding='utf-8').strip()
        if page == 'faq':
            content += faq_jsonld(content)
        html = (layout
                .replace('{{TITLE}}', meta['title'])
                .replace('{{DESC}}', meta['desc'])
                .replace('{{PATH}}', meta['path'])
                .replace('{{JSONLD}}', '\n' + jsonld + '\n' if meta.get('jsonld') else '')
                .replace('{{NAV}}', nav_for(page, nav))
                .replace('{{CONTENT}}', content)
                .replace('{{FOOTER}}', footer)
                .replace('{{CSSV}}', cssv)
                .replace('{{JSV}}', jsv)
                .replace('{{RATING}}', f'{RATING:g}')
                .replace('{{RATING_FILL}}', rating_fill())
                .replace('{{RATING_LABEL}}', rating_label())
                .replace('{{REVIEW_COUNT}}', str(REVIEW_COUNT)))
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
        html = version_images(html)
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
