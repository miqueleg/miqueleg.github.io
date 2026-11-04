import { getCollection, type CollectionEntry } from "astro:content";

/** Old Jekyll permalinks: /blog/YYYY/Slug/ where Slug is the file name minus its date. */
export const postSlug = (p: CollectionEntry<"blog">) => p.id.replace(/^\d{4}-\d{2}-\d{2}-/, "");
export const postUrl = (p: CollectionEntry<"blog">) => `/blog/${p.data.date.getUTCFullYear()}/${postSlug(p)}/`;

export const getPosts = async () =>
  (await getCollection("blog", (p) => import.meta.env.DEV || !p.data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
