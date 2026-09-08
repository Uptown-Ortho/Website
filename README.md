# Uptown Orthodontics — website

Static marketing site for Uptown Orthodontics, Bay City, MI.
No build step, no backend, no dependencies.

```
index.html          the whole site — markup, styles and scripts in one file
assets/img/         photography
assets/favicon.svg  tab icon
assets/og-image.jpg link-preview card (1200x630)
scripts/            local tooling (not deployed)
```

## Running it locally

Any static server works:

```bash
npx serve .
```

## Deploying

Hosted on Netlify. `netlify.toml` sets the publish directory, cache headers and a
`noindex` rule; importing the repo needs no further configuration. Every push to `main`
deploys automatically.

## How contact works

There is no form backend and the site stores nothing. Every route ends at **Weave**, the
practice's existing patient-messaging platform:

- the embedded form in the closing CTA is Weave's own contact page in an iframe
- the floating message bubble is Weave's Text Connect widget, loaded in `<head>`
- phone numbers are `tel:` links, and the fallback if the iframe fails to load
- the Smile Quiz collects no contact details; it ends in a button to the form above

Use the public `book.getweave.com` host for the iframe, not the internal address the
widget script uses — that hostname encodes infrastructure that will eventually move.

Weave's `widget.js` appends its iframes to `document.body` and exposes no container
option, so the bubble cannot be made inline. The inline form works because the panel it
opens is a standalone page that permits framing.

## The Weave widget errors on preview URLs — this is expected

Sending a message from a `.netlify.app` or `.vercel.app` preview shows
*"Sending text failed: Request failed with status code 401"*. The message still
delivers and the auto-reply still fires.

Confirmed by A/B test 2026-09-08: the identical widget, on the same Weave account, works
with no error on `uptown-ortho.com`. The only variable is the origin, so Weave is
validating the requesting domain against the one registered to that widget ID.

**Not a bug, and not worth a support ticket.** It clears itself once the site is on
`uptown-ortho.com`. Re-test after cutover to confirm; if the error survives the domain
change, *then* it is Weave's.

Side effect: contact cannot be fully tested from a preview URL. Test on the live domain,
or ask Weave whether the preview domain can be added to the widget's allowed origins.

## Notes for whoever edits this next

- **The Google rating is hardcoded** — in the hero badge and the reviews banner, alongside
  a `--fill` percentage on the star component. Update the number and the percentage
  together. It is not fetched live: the Places API bills the rating field at its highest
  tier and forbids caching, so a live figure would be billable on every page view.
- **The nav is width-constrained.** The full row needs ~1140px; below 1100px it collapses
  to the drawer. Adding an item pushes past that, so swap rather than append.
- **`scripts/build-portable.py`** bundles the site into one self-contained HTML file for
  sharing by email. Output goes to `dist/`, which is gitignored.
