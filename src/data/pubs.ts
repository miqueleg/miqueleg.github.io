import data from "./publications.json";

export type Work = (typeof data.works)[number] & { selected?: boolean };
export const works = data.works as Work[];
export const updated = data.updated;
export const orcid = data.orcid;

export const selected = works.filter((w) => w.selected);
export const peerReviewed = works.filter((w) => w.kind === "article" || w.kind === "review");
export const totalCitations = works.reduce((s, w) => s + (w.citations ?? 0), 0);
export const hIndex = (() => {
  const c = works.map((w) => w.citations ?? 0).sort((a, b) => b - a);
  return c.filter((x, i) => x >= i + 1).length;
})();

/** Author list with my name marked; long lists are shortened around me. */
export function authorParts(w: Work, max = 8) {
  const a = w.authors.map((name, i) => ({ name, me: i === w.me }));
  if (a.length <= max) return a;
  const keep = new Set([0, 1, 2, a.length - 1, w.me]);
  const out: { name: string; me: boolean }[] = [];
  a.forEach((x, i) => {
    if (keep.has(i)) out.push(x);
    else if (out.at(-1)?.name !== "…") out.push({ name: "…", me: false });
  });
  return out;
}

export const venueShort = (v: string | null) =>
  (v ?? "").replace("Angewandte Chemie International Edition", "Angew. Chem. Int. Ed.").replace("Journal of Chemical Information and Modeling", "J. Chem. Inf. Model.");
