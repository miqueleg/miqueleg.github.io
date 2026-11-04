import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  // file names keep the Jekyll pattern YYYY-MM-DD-Slug so old /blog/YYYY/Slug/ links still resolve
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog", generateId: ({ entry }) => entry.replace(/\.mdx?$/, "") }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((t) => (typeof t === "string" ? t.split(/\s+/).filter(Boolean) : (t ?? []))),
    draft: z.boolean().default(false),
  }),
});

const research = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/research" }),
  schema: z.object({
    title: z.string(),
    short: z.string(),
    venue: z.string(),
    year: z.number(),
    doi: z.string(),
    order: z.number(),
    spec: z.string(),
    summary: z.string(),
    structure: z
      .object({
        pdb: z.string(),
        highlight: z.array(z.number()).default([]),
        accent: z.array(z.number()).default([]),
        caption: z.string(),
      })
      .optional(),
  }),
});

export const collections = { blog, research };
