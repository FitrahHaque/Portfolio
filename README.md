# Portfolio - Asif Haque

A compact, text-first personal portfolio built with Hugo. The site uses a dark technical interface, chained top navigation, subtle scale-on-hover text states, and dedicated pages for each portfolio section.

## Tech Stack

| Concern | Choice |
| --- | --- |
| Static site generator | Hugo |
| Styling | Plain CSS via Hugo Pipes |
| Content | `data/site.yaml` |
| Assets | `public/` copied by Hugo |
| Deployment | GitHub Pages workflow |

## Project Structure

```text
.
├── assets/css/main.css          # site styling
├── data/site.yaml               # profile, sections, projects, links
├── content/                     # section pages and Markdown blog posts
├── layouts/                     # Hugo templates and partials
├── public/                      # favicon, profile mark, resume, OG image
├── hugo.toml                    # Hugo config
└── .github/workflows/deploy.yml # GitHub Pages deploy
```

## Local Development

Install Hugo first:

```bash
brew install hugo
```

Run the site:

```bash
hugo server --disableFastRender
```

Build production output:

```bash
hugo --gc --minify
```

The production build writes to `dist/`.

## Editing Content

Update portfolio copy, section entries, links, and profile details in:

```text
data/site.yaml
```

Public files such as `resume.pdf`, `profile.svg`, `favicon.svg`, and `og-image.svg` live in `public/`.

Blog posts are Markdown files in `content/blog/`. Add a new `.md` file with front matter like:

```yaml
---
title: My post title
date: 2026-05-30
summary: One sentence shown in lists.
tags:
  - Research
  - ML
---
```

The homepage automatically shows the two newest blog posts by date.

## Deployment

The included GitHub Actions workflow installs Hugo, builds the site, and uploads `dist/` to GitHub Pages.

If the repository name or deployment path changes, update `baseURL` in `hugo.toml`.
