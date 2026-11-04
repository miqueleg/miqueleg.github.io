#!/usr/bin/env node
// Refreshes src/data/repos.json (stars, descriptions, last push) from the GitHub API.
// Env: GITHUB_USER (default miqueleg), GITHUB_TOKEN (optional, avoids rate limits in CI).
import { readFile, writeFile } from "node:fs/promises";

const USER = process.env.GITHUB_USER ?? "miqueleg";
const OUT = new URL("../src/data/repos.json", import.meta.url);
const headers = { Accept: "application/vnd.github+json", "User-Agent": "miqueleg.github.io repo sync" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`, { headers });
if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
const repos = (await res.json())
  .filter((r) => !r.fork && !r.archived && r.name !== `${USER}.github.io`)
  .map((r) => ({
    name: r.name,
    description: r.description ?? "",
    stars: r.stargazers_count,
    language: r.language,
    pushed: r.pushed_at.slice(0, 10),
    url: r.html_url,
  }));

let previous = null;
try {
  previous = await readFile(OUT, "utf8");
} catch {}
const next = JSON.stringify(repos, null, 2) + "\n";
if (previous === next) console.log(`No changes (${repos.length} repos).`);
else {
  await writeFile(OUT, next);
  console.log(`Wrote ${repos.length} repos to src/data/repos.json.`);
}
