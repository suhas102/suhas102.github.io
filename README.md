# suhas102.github.io — Suhas Suresha portfolio

Static GitHub Pages site. No build step — just HTML/CSS/JS.

## Preview locally

```bash
cd suhas102.github.io
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` in a browser.

## Deploy to GitHub Pages

Repo name must be `suhas102.github.io` under user `suhas102` for a user site
(URL: https://suhas102.github.io/).

```bash
cd suhas102.github.io
git init
git add .
git commit -m "Add portfolio site"
git branch -M main
git remote add origin https://github.com/suhas102/suhas102.github.io.git
git push -u origin main
```

Then: GitHub repo → Settings → Pages → Deploy from branch → `main` / `/ (root)`.

CV file: `assets/Suhas-Suresha-CV.pdf` (copied from `RenderCV_sb2nov_Theme__Copy_.pdf`).
Replace it any time with a new export using the same filename so links keep working.

## Add a new project

Copy one `<article class="card">…</article>` block in `index.html`,
update title, description, tech tags, and GitHub URL. No other changes needed.
