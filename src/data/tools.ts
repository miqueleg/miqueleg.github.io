// Hand-written blurbs for the methods I want to feature (level: which scale each one serves); stars and dates come
// from repos.json (scripts/sync-repos.mjs). Anything else on GitHub is listed below them.
import repos from "./repos.json";

const featured = [
  { name: "protonation-optimizer", blurb: "Picks histidine tautomers (HID/HIE/HIP) from PropKa3 pKa values plus xTB energies of each local environment, before MD.", level: "QM → MM", stack: "Python · xTB · PropKa3 · MDTraj", post: "/blog/2025/Protonation-Optimizer/" },
  { name: "QMMESP", blurb: "RESP charges for ligands computed inside the protein with electrostatically embedded QM/MM, written straight into Amber prepi files.", level: "QM/MM", stack: "Python · PySCF / ORCA · Multiwfn", post: "/blog/2025/QMMESP/" },
  { name: "MLatom-ORCA-interface", blurb: "Couples the AIQM2 potential in MLatom with ORCA's optimiser and relaxed scans, for cluster-model calculations.", level: "QM", stack: "MLatom · ORCA · AIQM2", post: "/blog/2025/AIQM2-ORCA-Sella/" },
  { name: "MLatom-Sella-TS-search", blurb: "Transition-state searches with MLatom (AIQM2) as the calculator and Sella as the optimiser.", level: "QM", stack: "MLatom · Sella · ASE", post: "/blog/2025/AIQM2-ORCA-Sella/" },
  { name: "gxtb-pymol-interface", blurb: "A PyMOL plugin that runs xTB and g-xTB: optimisations, frequencies, NEB paths and IRC-like relaxations from the viewer.", level: "QM", stack: "PyMOL · Qt · xTB / g-xTB" },
  { name: "MDTunnel", blurb: "Moves a ligand along a protein tunnel one sphere at a time, minimising at each step, and returns an energy profile.", level: "MM", stack: "OpenMM · OpenFF · AutoDock Vina" },
];

export type Repo = (typeof repos)[number];
export const tools = featured.map((t) => {
  const r = repos.find((x) => x.name === t.name);
  return { ...t, url: r?.url ?? `https://github.com/miqueleg/${t.name}`, stars: r?.stars ?? 0, pushed: r?.pushed ?? null };
});
export const otherRepos: Repo[] = repos.filter((r) => !featured.some((t) => t.name === r.name));
