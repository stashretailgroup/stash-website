# STASH Retail Group website

The marketing site for STASH: automated convenience retail machines (Pokémon cards, 21+ vapes and everyday essentials) that businesses host for free and earn 10% of net sales.

**The good stuff. On demand.**

It's a plain static site: HTML, CSS and JavaScript with no build step. It runs on any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

## What's in here

```
index.html              The whole site (Home, Machines and About tabs)
404.html                "Page not found" page
privacy.html            Privacy Policy
terms.html              Terms of Use
cookies.html            Cookie Policy
refunds.html            Refund Policy (machine purchases)
accessibility.html      Accessibility statement
og-image.png            Link preview image (1200×630) for texts and social posts
favicon.svg             Browser tab icon
robots.txt, sitemap.xml Search engine files
assets/
  css/style.css         All styles
  css/fonts.css         Self-hosted fonts (no Google Fonts requests)
  fonts/                Archivo, Barlow and Barlow Condensed (SIL Open Font License)
  js/main.js            Tabs, hero machine, lineup, address suggestions, request form
  img/logo.webp
  img/machines/         Machine renders (tower, kiosks, smart fridge, smart market)
  img/products/         Pokémon packs, vapes, ZYN, power bank
apps-script/Code.gs     Google Apps Script that saves form requests to the Google Sheet
netlify.toml            Netlify settings (optional)
vercel.json             Vercel settings (optional)
```

## Put it on GitHub

1. Go to https://github.com/new, name the repository `stash-website`, leave every box unchecked, and click **Create repository**.
2. In Terminal, from this folder, run the two commands GitHub shows under "push an existing repository":

   ```
   git remote add origin https://github.com/YOUR-GITHUB-USERNAME/stash-website.git
   git push -u origin main
   ```

   Or skip Terminal: on the empty repository page click **uploading an existing file**, drag in everything in this folder, and click **Commit changes**.

## Go live

Pick one host.

**Netlify (easiest):** netlify.com → Add new site → Import from GitHub → pick `stash-website` → Deploy. No settings to change.

**Vercel:** vercel.com → Add New → Project → import `stash-website` → Deploy.

**GitHub Pages (free, stays on GitHub):** repository → Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save. The site appears at `https://YOUR-GITHUB-USERNAME.github.io/stash-website/` within a minute or two.

### Connect your domain

The site is already set up for **stashretailgroup.com**: link previews, the canonical link, `robots.txt` and `sitemap.xml` all point there. In your host's domain settings, add `stashretailgroup.com` (and `www.stashretailgroup.com`, redirecting to it) and follow its DNS steps.

To check the link preview after it's live, paste https://stashretailgroup.com into https://www.opengraph.xyz.

## Website form → Google Sheet

The "Host a STASH" form sends each request to the **Inquiries** tab in the *STASH Business Prospects* Google Sheet and emails stashretailgroup@gmail.com.

- The connection URL is `SHEET_URL` near the bottom of `assets/js/main.js`.
- The script behind it is `apps-script/Code.gs`. If you change it, paste it into the sheet under **Extensions → Apps Script**, then **Deploy → Manage deployments → Edit → New version → Deploy**. The URL stays the same.
- If the Sheet connection ever fails, the form falls back to showing the request so the visitor can email it.
- A hidden spam-trap field catches basic bots.

Address suggestions in the form come from Photon (OpenStreetMap data). They're free, need no key, and are limited to US results.

## Editing common things

| Change | Where |
|---|---|
| Headline, hero boxes ($0 / 10%) | `index.html`, the `hero` section |
| FAQ answers | `index.html`, search for `<details>` |
| Lineup machines and descriptions | `assets/js/main.js`, the `LU` list |
| Location product mixes | `assets/js/main.js`, the `LOCS` list |
| Email and phone | `index.html` (contact section and footer) and `assets/js/main.js` (email fallback) |
| Colors and fonts | top of `assets/css/style.css` (`:root`) |
| Swap an image | replace the file in `assets/img/` with one of the same name |

## Legal pages

The legal pages are written for how the site works today: no cookies, no analytics, no ads, self-hosted fonts, form requests sent to Google Sheets, and address suggestions from Photon. If you add analytics, a chat widget, an embedded map or video, or text-message marketing, update `privacy.html` and `cookies.html` first, and you may need a consent banner. Change the "Last updated" date whenever you edit a policy.

## After editing CSS or JS

Browsers keep `assets/` files for a week. When you change `style.css` or `main.js`, bump the `?v=` number on their links near the top and bottom of `index.html` so visitors get the new version right away.

## Test locally

From this folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.
