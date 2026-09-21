# Discoverability

What the repository does for itself, and the five things only an account holder can do.

## What is automated

- `app/index.html` carries a canonical URL, Open Graph and Twitter card tags, a JSON-LD `SoftwareApplication` block, and a full meta description.
- `app/sitemap.xml` lists the hosted demo. `npm run check` fails if it stops matching the canonical URL, or if the social metadata goes missing.
- `.github/workflows/pages.yml` builds the demo on every push to `main` and publishes it as soon as Pages is enabled.

## Owner actions

### 1. Enable GitHub Pages

<https://github.com/drewc611/TONEARA/settings/pages> — set **Source** to **GitHub Actions**.

Nothing else on this page matters until this is done, because there is no site to crawl. A workflow token cannot do it: creating a Pages site requires repository admin, which is why every `Deploy demo` run before this change failed with `Create Pages site failed. Error: Resource not accessible by integration`.

Once enabled, the next push to `main` publishes to <https://drewc611.github.io/TONEARA/>.

### 2. Fill in the repository metadata

The **About** panel on the repository home page. These fields are what a search engine reads for the repository itself, and they are independent of Pages. All three are currently empty or unset.

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

- **A `robots.txt` in this repository.** Crawlers read `robots.txt` only at the origin root, `drewc611.github.io/robots.txt`, which belongs to a user site that does not exist. A file under `/TONEARA/` is ignored. This only becomes useful behind a custom domain.
- **Worrying about duplicate-content filtering.** That applies to repositories cloned from a template. This one is original.
