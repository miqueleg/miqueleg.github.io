"""Trim a PDB for the web viewer: keep the chosen chains, drop waters, hydrogens and alt locs.

Usage: python scripts/data/trim_pdb.py in.pdb out.pdb A,B [KEEP_HET,...]
"""
import sys

src, out, chains = sys.argv[1], sys.argv[2], set(sys.argv[3].split(","))
keep_het = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else set()
lines = []
for line in open(src):
    rec = line[:6].strip()
    if rec in ("HELIX", "SHEET"):
        lines.append(line.rstrip("\n"))
    elif rec in ("ATOM", "HETATM"):
        if line[21] not in chains or line[16] not in (" ", "A"):
            continue
        if line[76:78].strip() == "H" or (rec == "HETATM" and line[17:20].strip() not in keep_het):
            continue
        lines.append(line.rstrip("\n")[:80])
lines.append("END")
open(out, "w").write("\n".join(lines) + "\n")
print(out, sum(l.startswith(("ATOM", "HETATM")) for l in lines), "atoms")
