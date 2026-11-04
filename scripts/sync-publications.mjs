#!/usr/bin/env node
// Pulls my works from ORCID, enriches them with OpenAlex (authors, venue,
// citations, open-access link) and writes src/data/publications.json.
//
//   node scripts/sync-publications.mjs
//
// Env: ORCID_ID (default below), OPENALEX_API_KEY (optional, free at openalex.org).
// Hand edits go in src/data/publications.overrides.json, never in the output file.

import { readFile, writeFile } from "node:fs/promises";

const ORCID = process.env.ORCID_ID ?? "0000-0002-8576-8777";
const KEY = process.env.OPENALEX_API_KEY;
const OUT = new URL("../src/data/publications.json", import.meta.url);
const OVERRIDES = new URL("../src/data/publications.overrides.json", import.meta.url);

const PREPRINT_PREFIXES = ["10.1101/", "10.26434/", "10.48550/", "10.21203/", "10.20944/", "10.31219/"];
const SKIP_TYPES = new Set(["peer-review", "erratum", "paratext", "retraction", "dataset", "software", "data-set"]);

const norm = (s) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function getJSON(url, headers = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "miqueleg.github.io publication sync", ...headers } });
    if (res.ok) return res.json();
    if (attempt >= 3 || res.status < 500) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

const openalex = (path, params) => {
  const q = new URLSearchParams(params);
  if (KEY) q.set("api_key", KEY);
  return getJSON(`https://api.openalex.org/${path}?${q}`);
};

// ---------- ORCID ----------
const orcid = await getJSON(`https://pub.orcid.org/v3.0/${ORCID}/works`, { Accept: "application/json" });
const fromOrcid = orcid.group.map((g) => {
  const s = g["work-summary"][0];
  const ids = g["external-ids"]?.["external-id"] ?? [];
  const doi = ids.find((e) => e["external-id-type"] === "doi")?.["external-id-value"]?.toLowerCase() ?? null;
  return {
    doi,
    title: s.title?.title?.value ?? "",
    year: Number(s["publication-date"]?.year?.value) || null,
    venue: s["journal-title"]?.value ?? null,
    type: s.type,
    url: s.url?.value ?? null,
  };
});

// ---------- OpenAlex ----------
const SELECT = "doi,display_name,publication_year,type,primary_location,authorships,cited_by_count,open_access,biblio";
const byAuthor = await openalex("works", { filter: `author.orcid:${ORCID}`, per_page: "200", select: SELECT });
const oa = new Map(byAuthor.results.filter((w) => w.doi).map((w) => [w.doi.replace("https://doi.org/", "").toLowerCase(), w]));
const missing = fromOrcid.map((w) => w.doi).filter((d) => d && !oa.has(d));
for (let i = 0; i < missing.length; i += 40) {
  const chunk = missing.slice(i, i + 40);
  const res = await openalex("works", { filter: `doi:${chunk.join("|")}`, per_page: "50", select: SELECT });
  for (const w of res.results) oa.set(w.doi.replace("https://doi.org/", "").toLowerCase(), w);
}

const merged = new Map();
const add = (w) => merged.set(w.doi ?? `title:${norm(w.title)}`, w);
for (const o of fromOrcid) {
  const w = o.doi ? oa.get(o.doi) : null;
  add({
    doi: o.doi,
    title: (w?.display_name ?? o.title).replace(/<[^>]+>/g, ""),
    year: o.year ?? w?.publication_year ?? null,
    venue: o.venue ?? w?.primary_location?.source?.display_name ?? null,
    type: o.type ?? w?.type,
    authors: w?.authorships?.map((a) => a.author.display_name) ?? [],
    me: w?.authorships?.findIndex((a) => a.author.orcid?.endsWith(ORCID)) ?? -1,
    citations: w?.cited_by_count ?? null,
    oaUrl: w?.open_access?.oa_url ?? null,
    url: o.doi ? `https://doi.org/${o.doi}` : o.url,
  });
}
// works OpenAlex attributes to me that ORCID does not list
for (const [doi, w] of oa) {
  if (merged.has(doi)) continue;
  add({
    doi,
    title: w.display_name.replace(/<[^>]+>/g, ""),
    year: w.publication_year,
    venue: w.primary_location?.source?.display_name ?? null,
    type: w.type,
    authors: w.authorships.map((a) => a.author.display_name),
    me: w.authorships.findIndex((a) => a.author.orcid?.endsWith(ORCID)),
    citations: w.cited_by_count,
    oaUrl: w.open_access?.oa_url ?? null,
    url: `https://doi.org/${doi}`,
  });
}

// ---------- de-duplicate ----------
const isPreprint = (w) => w.type === "preprint" || w.type === "posted-content" || PREPRINT_PREFIXES.some((p) => w.doi?.startsWith(p));
let works = [...merged.values()].filter((w) => !SKIP_TYPES.has(w.type));
const groups = new Map();
for (const w of works) {
  const k = norm(w.title);
  groups.set(k, [...(groups.get(k) ?? []), w]);
}
works = [...groups.values()].map((g) => {
  const journal = g.filter((w) => !isPreprint(w));
  // Angewandte publishes a German (ange) and an international (anie) edition of every paper
  const pick =
    journal.find((w) => w.doi?.startsWith("10.1002/anie.")) ??
    journal.sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0))[0] ??
    g[0];
  const preprint = g.find((w) => isPreprint(w) && w !== pick);
  return {
    ...pick,
    preprint: preprint ? preprint.url : null,
    kind: isPreprint(pick) ? "preprint" : pick.type === "dissertation-thesis" || pick.type === "dissertation" ? "thesis" : /review/i.test(pick.venue ?? "") ? "review" : "article",
    citations: Math.max(...g.map((w) => w.citations ?? 0)) || pick.citations,
  };
});

// ---------- hand overrides ----------
let overrides = {};
try {
  overrides = JSON.parse(await readFile(OVERRIDES, "utf8"));
} catch {}
works = works
  .map((w) => ({ ...w, ...(overrides.works?.[w.doi ?? norm(w.title)] ?? {}) }))
  .filter((w) => !w.hide)
  .map(({ hide, ...w }) => w)
  .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));

// ---------- write only if something changed ----------
let previous = null;
try {
  previous = JSON.parse(await readFile(OUT, "utf8"));
} catch {}
if (previous && JSON.stringify(previous.works) === JSON.stringify(works)) {
  console.log(`No changes (${works.length} works).`);
} else {
  await writeFile(OUT, JSON.stringify({ orcid: ORCID, updated: new Date().toISOString().slice(0, 10), works }, null, 2) + "\n");
  console.log(`Wrote ${works.length} works to src/data/publications.json.`);
}
