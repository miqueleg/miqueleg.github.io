"""Trim a PDB (1PWZ, HheC) and compute an elastic-network (ANM) mode for the homepage hero.

Usage: python scripts/data/anm_hhec.py 1pwz.pdb public/data/hhec.json
Output: JSON with the PDB text (backbone + catalytic triad side chains + ligand)
and per-atom displacement vectors along the lowest non-trivial ANM mode.
"""
import json
import sys

import numpy as np

src, out = sys.argv[1], sys.argv[2]
CATALYTIC = {132, 145, 149}  # Ser132, Tyr145, Arg149 in HheC
BACKBONE = {"N", "CA", "C", "O"}

header, atoms = [], []
for line in open(src):
    rec = line[:6].strip()
    if rec in ("HELIX", "SHEET"):
        header.append(line.rstrip("\n"))
    elif rec in ("ATOM", "HETATM"):
        if line[16] not in (" ", "A"):  # drop alt locs
            continue
        name = line[12:16].strip()
        resn = line[17:20].strip()
        resi = int(line[22:26])
        if rec == "ATOM" and not (name in BACKBONE or resi in CATALYTIC):
            continue
        if rec == "HETATM" and resn not in ("RSO", "CL"):
            continue
        atoms.append({
            "line": line.rstrip("\n")[:80],
            "rec": rec, "name": name, "resn": resn,
            "chain": line[21], "resi": resi,
            "xyz": np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])]),
        })

# centre the structure so the web viewer can rotate around the origin
xyz = np.array([a["xyz"] for a in atoms])
centre = xyz.mean(axis=0)

ca = [i for i, a in enumerate(atoms) if a["name"] == "CA" and a["rec"] == "ATOM"]
R = xyz[ca]
n = len(R)
H = np.zeros((3 * n, 3 * n))
cut2 = 15.0 ** 2
for i in range(n):
    d = R - R[i]
    r2 = (d * d).sum(1)
    for j in np.where((r2 < cut2) & (np.arange(n) > i))[0]:
        blk = -np.outer(d[j], d[j]) / r2[j]
        H[3*i:3*i+3, 3*j:3*j+3] = blk
        H[3*j:3*j+3, 3*i:3*i+3] = blk
        H[3*i:3*i+3, 3*i:3*i+3] -= blk
        H[3*j:3*j+3, 3*j:3*j+3] -= blk
w, v = np.linalg.eigh(H)
mode = v[:, 6].reshape(n, 3)  # first non-trivial mode
mode /= np.sqrt((mode ** 2).sum(1).mean())  # unit RMS per residue

# map residue displacement to every atom of that residue; ligand follows nearby residues
key = {(atoms[i]["chain"], atoms[i]["resi"]): k for k, i in enumerate(ca)}
disp = np.zeros_like(xyz)
for i, a in enumerate(atoms):
    k = key.get((a["chain"], a["resi"]))
    if k is not None:
        disp[i] = mode[k]
    else:
        near = np.where(((R - a["xyz"]) ** 2).sum(1) < 64)[0]
        disp[i] = mode[near].mean(0) if len(near) else 0

lines = list(header)
for i, a in enumerate(atoms):
    x, y, z = xyz[i] - centre
    lines.append(f"{a['line'][:30]}{x:8.3f}{y:8.3f}{z:8.3f}{a["line"][54:80]}")
lines.append("END")

json.dump({
    "pdb": "\n".join(lines),
    "disp": [round(float(c), 3) for c in disp.ravel()],
    "natoms": len(atoms),
    "ncalpha": n,
    "eigenvalue": float(w[6]),
}, open(out, "w"), separators=(",", ":"))
print(len(atoms), "atoms,", n, "CA, eig", w[6:9])
