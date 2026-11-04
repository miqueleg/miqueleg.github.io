"""Data for the homepage hero: the HheC tetramer breathing along its lowest
elastic-network (ANM) mode, with the AIQM2 cluster-model scan placed in every
active site by superposing the cluster's C-alpha caps on the crystal C-alphas.

Usage: python scripts/data/hero_hhec.py 1zmt.pdb output_traj.xyz public/data/hero.json

The cluster's side chains are truncated at C-alpha (methyl caps); CAPS maps those
atom indices (0-based, in the 303-atom xyz) to HheC residue numbers.
"""
import json
import math
import sys

import numpy as np

pdb_path, xyz_path, out_path = sys.argv[1:4]
CHAINS = "ABCD"
CUTOFF = 15.0  # Å, ANM contact cutoff
MIN_STEP = 0.035  # Å RMSD between kept relaxation frames
HARTREE = 627.509
# cluster atom index -> HheC residue whose C-alpha it sits on (174-179: capped backbone stretch GPNYLH)
CAPS = {271: 174, 258: 175, 135: 176, 149: 177, 159: 178, 298: 179, 0: 12, 32: 86, 71: 139, 205: 249,
        54: 132, 93: 145, 112: 149, 165: 186, 186: 187, 280: 142, 63: 134}
ANCHORS = [271, 258, 135, 149, 159, 298]
CYANIDE, EPOXIDE = [227, 228], [229, 230, 231]
RCOV = {"H": 0.31, "C": 0.76, "N": 0.71, "O": 0.66}

# ---------- protein: backbone of the tetramer ----------
res, ss = [], []
for line in open(pdb_path):
    rec = line[:6].strip()
    if rec == "HELIX" and line[19] in CHAINS:
        ss.append(line.rstrip("\n"))
    elif rec == "SHEET" and line[21] in CHAINS:
        ss.append(line.rstrip("\n"))
    elif rec == "ATOM" and line[21] in CHAINS and line[16] in " A":
        name = line[12:16].strip()
        if name not in ("N", "CA", "C", "O"):
            continue
        key = (line[21], int(line[22:26]))
        if not res or res[-1]["key"] != key:
            res.append({"key": key, "resn": line[17:20], "atoms": {}})
        res[-1]["atoms"][name] = [float(line[30:38]), float(line[38:46]), float(line[46:54])]
res = [r for r in res if len(r["atoms"]) == 4]
ca = np.array([r["atoms"]["CA"] for r in res])
centre = ca.mean(0)
ca_of = {r["key"]: i for i, r in enumerate(res)}

# ---------- ANM ----------
n = len(ca)
H = np.zeros((3 * n, 3 * n))
for i in range(n):
    d = ca - ca[i]
    r2 = (d * d).sum(1)
    for j in np.where((r2 < CUTOFF ** 2) & (np.arange(n) > i))[0]:
        blk = -np.outer(d[j], d[j]) / r2[j]
        H[3*i:3*i+3, 3*j:3*j+3] = blk
        H[3*j:3*j+3, 3*i:3*i+3] = blk
        H[3*i:3*i+3, 3*i:3*i+3] -= blk
        H[3*j:3*j+3, 3*j:3*j+3] -= blk
w, v = np.linalg.eigh(H)
mode = v[:, 6].reshape(n, 3)
mode /= np.sqrt((mode ** 2).sum(1).mean())  # unit RMS per residue

# ---------- cluster trajectory ----------
lines = open(xyz_path).read().split("\n")
frames, i = [], 0
while i < len(lines):
    if not lines[i].strip():
        i += 1
        continue
    na = int(lines[i])
    energy = float(lines[i + 1].split("E")[-1])
    rows = [l.split() for l in lines[i + 2:i + 2 + na]]
    frames.append((energy, np.array([[float(x) for x in r[1:4]] for r in rows])))
    i += 2 + na
el = [l.split()[0] for l in lines[2:2 + int(lines[0])]]
na = len(el)

def bonded(X, a, b):
    return np.linalg.norm(X[a] - X[b]) < 1.15 * (RCOV[el[a]] + RCOV[el[b]])

X0 = frames[0][1]
nbr = [[b for b in range(na) if b != a and bonded(X0, a, b)] for a in range(na)]
# drop hydrogens on carbon (they never move between atoms in this scan)
keep_atoms = [a for a in range(na) if not (el[a] == "H" and nbr[a] and el[nbr[a][0]] == "C")]
idx = {a: k for k, a in enumerate(keep_atoms)}

# frames: converged scan steps, then the last step thinned by RMSD
E = [f[0] for f in frames]
starts = [0] + [k for k in range(1, len(E)) if (E[k] - E[k - 1]) * HARTREE > 0.3]
kept = [s - 1 for s in starts[1:]]
scan_steps = len(kept)
rmsd = lambda A, B: math.sqrt(((A - B) ** 2).sum(1).mean())
last = kept[-1]
for k in range(starts[-1], len(frames)):
    if rmsd(frames[k][1][keep_atoms], frames[last][1][keep_atoms]) >= MIN_STEP or k == len(frames) - 1:
        kept.append(k)
        last = k

# bonds: static ones go in the SDF, the ones that change are switched per frame
pairs = [(a, b) for a in keep_atoms for b in keep_atoms if a < b and
         min(np.linalg.norm(frames[k][1][a] - frames[k][1][b]) for k in kept) < 2.2]
static, dynamic = [], []
for a, b in pairs:
    states = "".join("1" if bonded(frames[k][1], a, b) else "0" for k in kept)
    if "1" in states and "0" not in states:
        static.append([idx[a], idx[b]])
    elif "1" in states:
        dynamic.append([idx[a], idx[b], states])

# bonds drawn dashed while they break or form: the switching ones, plus the
# cyanide C ··· epoxide C attack (the scanned coordinate, never fully formed here)
cn_c = next(a for a in CYANIDE if el[a] == "C")
attacked = min((a for a in EPOXIDE if el[a] == "C"), key=lambda a: np.linalg.norm(frames[kept[-1]][1][a] - frames[kept[-1]][1][cn_c]))
partial = [[a, b, 2.0 if "H" in (el[keep_atoms[a]], el[keep_atoms[b]]) else 2.2] for a, b, _ in dynamic] + [[idx[cn_c], idx[attacked], 3.0]]

# ---------- superpose the cluster on every active site ----------
def kabsch(P, Q):
    pc, qc = P.mean(0), Q.mean(0)
    U, _, Vt = np.linalg.svd((P - pc).T @ (Q - qc))
    D = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))])
    return U @ D @ Vt, pc, qc  # x -> (x - pc) @ R + qc

# fragments, to give each cluster atom the motion of the residue it belongs to
comp = [-1] * na
for s in range(na):
    if comp[s] >= 0:
        continue
    stack, comp[s] = [s], s
    while stack:
        a = stack.pop()
        for b in nbr[a]:
            if comp[b] < 0:
                comp[b] = s
                stack.append(b)

pc_all = X0.mean(0)
sites = []
for chain in CHAINS:
    R, pc, qc = kabsch(X0[ANCHORS], np.array([res[ca_of[(chain, 174 + k)]]["atoms"]["CA"] for k in range(6)]))
    first = lambda x: (x - pc) @ R + qc
    # each cap takes the nearest chain carrying that residue (W249 comes from the neighbouring subunit)
    match = {}
    for a, resi in CAPS.items():
        match[a] = min((c for c in CHAINS if (c, resi) in ca_of), key=lambda c: np.linalg.norm(first(X0[a]) - ca[ca_of[(c, resi)]]))
    P = np.array([X0[a] for a in CAPS])
    Q = np.array([ca[ca_of[(match[a], resi)]] for a, resi in CAPS.items()])
    R, pc, qc = kabsch(P, Q)
    fit = math.sqrt((((P - pc) @ R + qc - Q) ** 2).sum(1).mean())
    placed = (X0 - pc) @ R + qc
    disp = []
    for a in keep_atoms:
        caps = [c for c in CAPS if comp[c] == comp[a]]
        if caps:
            c = min(caps, key=lambda c: np.linalg.norm(X0[c] - X0[a]))
            disp.append(mode[ca_of[(match[c], CAPS[c])]])
        else:  # substrate, cyanide, waters: smooth average of the C-alphas around them
            d2 = ((ca - placed[a]) ** 2).sum(1)
            wgt = np.exp(-d2 / (2 * 4.0 ** 2)) * (d2 < 100)
            disp.append((wgt[:, None] * mode).sum(0) / wgt.sum())
    t = qc - centre + (pc_all - pc) @ R  # frames are stored relative to pc_all: site = f @ R + t
    sites.append({"chain": chain, "fitRmsd": round(fit, 2), "R": [round(float(x), 5) for x in R.ravel()],
                  "t": [round(float(x), 3) for x in t], "disp": [round(float(x), 2) for x in np.array(disp).ravel()]})
    print(f"site {chain}: C-alpha fit RMSD {fit:.2f} Å over {len(CAPS)} atoms")

r1 = lambda x: round(float(x), 2)
out = {
    "source": "PDB 1ZMT (HheC tetramer) + AIQM2 relaxed scan of the cluster model",
    "protein": {
        "ss": ss,
        "chain": "".join(r["key"][0] for r in res),
        "resi": [r["key"][1] for r in res],
        "resn": [r["resn"] for r in res],
        "xyz": [r1(x) for r in res for name in ("N", "CA", "C", "O") for x in np.array(r["atoms"][name]) - centre],
        "disp": [r1(x) for x in mode.ravel()],
        "eigenvalue": round(float(w[6]), 5),
    },
    "cluster": {
        "elements": [el[a] for a in keep_atoms],
        "frames": [[r1(x) for x in (frames[k][1][keep_atoms] - pc_all).ravel()] for k in kept],
        "energy": [round((E[k] - E[0]) * HARTREE, 2) for k in kept],
        "scanSteps": scan_steps,
        "bonds": static,
        "dynamic": dynamic,
        "cyanide": [idx[a] for a in CYANIDE],
        "epoxide": [idx[a] for a in EPOXIDE],
        "relay": sorted({a for p in dynamic for a in p[:2]} - {idx[a] for a in CYANIDE + EPOXIDE}),
        "partial": partial,
        "sites": sites,
    },
}
json.dump(out, open(out_path, "w"), separators=(",", ":"))
print(f"{n} residues, eigenvalues {np.round(w[6:9], 4)}; cluster {len(keep_atoms)} atoms x {len(kept)} frames "
      f"({scan_steps} scan steps), {len(static)} static + {len(dynamic)} switching bonds")
