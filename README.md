# sugardrum.com

The Sugardrum website, built with [Eleventy](https://www.11ty.dev/).

## Commands

```sh
npm install
npm start        # dev server at http://localhost:8080 (drafts included)
npm run build    # production build into _site/ (drafts skipped, HTML/JS minified)
```

## Layout

| Path | What it is |
| --- | --- |
| `eleventy.config.js` | Eleventy config: collections, filters, `{% youtube "id" %}` shortcode, Sass, minification |
| `src/posts/` | Blog posts (`YYYY-MM-DD-slug.md`). URLs are `/blog/YYYY/MM/DD/slug/` |
| `src/posts/drafts/` | Unpublished posts – shown by `npm start` only |
| `src/pages/` | Top-level pages (about, gigs, music…) |
| `src/song-stories/` | Song story pages |
| `src/_data/` | Site settings, navigation, releases (`music.yml`), photos and videos |
| `src/_includes/layouts/` | `base` → `page` → `page-text`, plus `post` and `category` |
| `src/_includes/partials/` | Header, footer, nav and reusable snippets |
| `src/css/main.scss`, `src/_sass/` | Styles, compiled to `/css/main.css` |
| `src/js/scripts.js` | Site scripts (vanilla JS module) → `/js/main.js`. Links with `class="lightbox"` open in the [LiteLight](https://litelightbox.com) lightbox; the `title` becomes the caption |

Category pages (`/categories/<name>/`) are generated from the `categories` front matter on posts.

## Deployment

Pushing to `master` deploys automatically: the GitHub Action in `.github/workflows/deploy.yml` builds the site, syncs `_site/` to the `sugardrum.com` S3 bucket (eu-west-1) and clears the CloudFront cache. It can also be run by hand from the repo's **Actions** tab.

It needs these repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `CLOUDFRONT_DISTRIBUTION_ID`.

To deploy by hand instead: `npm run build`, then `aws s3 sync _site/ s3://sugardrum.com --delete --exclude "external/mp3s/*"` and `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`.
