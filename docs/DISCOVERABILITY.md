# Discoverability

What the repository does for itself, and the five things only an account holder can do.

## What is automated

- `app/index.html` carries a canonical URL, Open Graph and Twitter card tags with alt text, a JSON-LD `SoftwareApplication` block, a `FAQPage` block, and a full meta description.
- The page carries prose a crawler can rank. A studio interface is controls and labels, which reads to a search engine as a page about nothing; the about and FAQ sections explain what the engine does, that it is deterministic synthesis rather than a model, what leaves the device, and what exports.
- `app/sitemap.xml` and `app/robots.txt` both name the canonical URL. `npm run check` fails if any of the three drift apart, if the social metadata goes missing, if the title stops describing the product, or if either JSON-LD block disappears.
- `test/discoverability.test.mjs` asserts every marked-up FAQ answer is text the page actually shows. Structured data that outruns the page is a manual action in Search Console, not a ranking boost.
- `app/404.html` gives GitHub Pages a styled, `noindex` fallback for unknown paths instead of its default page.
- `.github/workflows/pages.yml` builds the demo on every push to `main` and publishes it as soon as Pages is enabled.

## Owner actions

### 1. Enable GitHub Pages

<https://github.com/drewc611/TONEARA/settings/pages> — set **Source** to **GitHub Actions**.

Nothing else on this page matters until this is done, because there is no site to crawl. A workflow token cannot do it: creating a Pages site requires repository admin, which is why every `Deploy demo` run before this change failed with `Create Pages site failed. Error: Resource not accessible by integration`.

Once enabled, the next push to `main` publishes to <https://drewc611.github.io/TONEARA/>.

### 2. Fill in the repository metadata

The **About** panel on the repository home page. These fields are what a search engine reads for the repository itself, and they are independent of Pages. The description currently reads `Make the music that you imagine`, which says nothing a person would type into a search box. Homepage and topics are unset.

**Homepage**

```
https://drewc611.github.io/TONEARA/
```

**Description**

```
Browser-first AI-assisted music studio. Turn a written brief into an original instrumental, preview it, and export WAV - entirely on-device, with no account, API key, or upload.
```

**Topics**

```
ai-music  music-generation  web-audio  browser-first  pwa
offline-first  javascript  wav  audio-synthesis  royalty-free-music
```

### 3. Verify the site in Google Search Console

Only after step 1, and only for the URL-prefix property `https://drewc611.github.io/TONEARA/`. A domain property is not available, because `github.io` is on the Public Suffix List.

Two ways to verify, both needing a value only the account holder can generate:

- **Meta tag** — paste the `<meta name="google-site-verification" content="…">` tag into `app/index.html`, directly below the `<meta name="theme-color">` line. It ships to `dist/` unchanged.
- **HTML file** — drop the `google….html` file into `app/`. The build copies `app/` to `dist/` verbatim, so it is served at the site root.

### 4. Submit the sitemap

In Search Console, submit:

```
https://drewc611.github.io/TONEARA/sitemap.xml
```

This covers the hosted demo only. It cannot make the repository page crawl sooner: Search Console acts on properties you have verified, and `github.com` is not one you can verify. The repository page is indexed on GitHub's own schedule, and step 2 is the only lever on it.

### 5. Inbound links

Search crawlers reach new pages by following links from pages they already trust, so the demo URL needs to exist somewhere other than this repository.

Note before posting: the [LICENSE](../LICENSE) is proprietary. Reuse, redistribution, hosted deployment, derivative works, and commercial use all require written permission. That is worth stating plainly wherever the project is shared, since developer communities generally read a public repository as open source.

## What will not help

- **`app/robots.txt`, as things stand.** It ships, and it is correct, but crawlers read `robots.txt` only from the origin root (RFC 9309, section 2.3). Here that is `drewc611.github.io/robots.txt`, which belongs to a user site that does not exist, so the copy under `/TONEARA/` is never fetched. It starts working the moment the site moves behind a custom domain. Nothing is blocked in the meantime: absent a `robots.txt`, crawlers assume everything is allowed.

  If you want an origin-root `robots.txt` on `github.io`, it has to live in a repository named `drewc611.github.io`, which becomes your user site at `https://drewc611.github.io/`. That repository does not exist today. Creating one would also give the project an inbound link from a page Google already crawls, which is step 5's whole point. Say the word and I will draft it, but creating a public repository under your account is your call, not mine.
- **Worrying about duplicate-content filtering.** That applies to repositories cloned from a template. This one is original.
