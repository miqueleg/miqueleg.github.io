# miqueleg.github.io

Personal site of Miquel Estévez-Gay, built with [Astro](https://astro.build) and served by GitHub Pages.

## Run it locally

Needs Node 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview    # serve dist/
```

## Where things live

| What | Where |
| --- | --- |
| Pages | `src/pages/` |
| Blog posts | `src/content/blog/YYYY-MM-DD-Slug.md` (or `.mdx` to embed components) → `/blog/YYYY/Slug/` |
| Research case studies | `src/content/research/<slug>.md` → `/research/<slug>/` |
| Publications | `src/data/publications.json` (generated, don't edit) + `src/data/publications.overrides.json` (hand edits) |
| Tools | blurbs in `src/data/tools.ts`, stars and dates in `src/data/repos.json` (generated) |
| Name, links, CV | `src/data/site.ts` |
| Colours and layout | `src/styles/global.css` |
| 3D and animation data | `public/data/` (built by the scripts in `scripts/data/`) |

### Blog posts

Front matter: `title`, `date`, optional `description`, `tags` (space-separated string or list) and `draft: true` to hide a post.
Use `.mdx` when the post needs a component, for example the scan player:

```mdx
import ScanPath from "../../components/ScanPath.astro";

<ScanPath />
```

### Research case studies

Each Markdown file in `src/content/research/` becomes a page, and its paper card on `/research/` links to it instead of the DOI.

```yaml
---
title: Full paper title
short: Short headline for the page
venue: ACS Catalysis
year: 2024
doi: 10.1021/acscatal.4c04815   # must match the DOI in publications.json
order: 1
spec: MD · substrate binding · loop engineering
summary: One or two sentences shown under the headline.
structure:                      # optional rotating 3D view
  pdb: 5O30                     # file in public/data/structures/<pdb>.pdb
  highlight: [39, 40, 41]       # residues shown as white sticks (chain A)
  accent: [45]                  # residues shown as red sticks
  caption: What the viewer shows
---
Body in Markdown.
```

## Publications and repositories sync

`scripts/sync-publications.mjs` reads works from ORCID, enriches them with OpenAlex (authors, venue, citations, open-access links),
merges preprints and Angewandte's two editions into one entry, and writes `src/data/publications.json` only if something changed.
`scripts/sync-repos.mjs` does the same for GitHub stars and descriptions.

```bash
npm run sync:pubs
node scripts/sync-repos.mjs
```

The deploy workflow runs both every Monday (and on manual runs), commits any change and redeploys.
To fix a wrong entry, add it to `publications.overrides.json`, keyed by lowercase DOI (or the normalised title for works without one):
`{"hide": true}` drops it, `{"selected": true}` puts it on the homepage, and any other field (`venue`, `title`, `kind`…) replaces the synced value.
Optional repository secret: `OPENALEX_API_KEY` (free at openalex.org) for more reliable OpenAlex requests.

## Animation data

| File | Built by | From |
| --- | --- | --- |
| `public/data/hhec.json` | `scripts/data/anm_hhec.py 1pwz.pdb public/data/hhec.json` | PDB 1PWZ, elastic-network mode for the hero |
| `public/data/scan-path.json` | `scripts/data/scan_to_json.py traj.xyz public/data/scan-path.json` | ORCA relaxed-scan trajectory (multi-frame xyz with `E` in each comment line) |
| `public/data/structures/*.pdb` | `scripts/data/trim_pdb.py in.pdb out.pdb A[,B] [HET,...]` | any PDB; keeps chosen chains, drops waters and H |

`scan_to_json.py` has the atom indices for the readouts (`TRACK`) and the highlighted groups (`atoms`) at the top; change them for a different system.

## Deployment

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/` to the `gh-pages` branch, which is what GitHub Pages serves,
so the repository's Pages settings don't need to change.
