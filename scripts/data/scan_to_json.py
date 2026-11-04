"""Turn an ORCA relaxed-scan trajectory (multi-frame .xyz) into the compact JSON
the ScanPath component plays.

Usage: python scripts/data/scan_to_json.py traj.xyz public/data/scan-path.json

Frames: the converged geometry of every constrained scan step, then the free
relaxation after the last step, thinned so consecutive frames differ by at
least MIN_STEP Å RMSD. Energies are kcal/mol relative to the first frame.
"""
import json
import math
import sys

HARTREE = 627.509
MIN_STEP = 0.025  # Å RMSD between kept relaxation frames
# atom indices (0-based) of the bonds the readouts track
TRACK = {
    "cc": (65, 68),   # cyanide C ··· epoxide C (the scanned coordinate)
    "co": (67, 68),   # epoxide C–O that breaks
    "oh": (67, 41),   # epoxide O ··· H coming from Tyr
}

src, out = sys.argv[1], sys.argv[2]
lines = open(src).read().split("\n")
frames, i = [], 0
while i < len(lines):
    if not lines[i].strip():
        i += 1
        continue
    n = int(lines[i])
    energy = float(lines[i + 1].split("E")[-1])
    atoms = [l.split() for l in lines[i + 2:i + 2 + n]]
    frames.append((energy, [a[0] for a in atoms], [tuple(map(float, a[1:4])) for a in atoms]))
    i += 2 + n

E = [f[0] for f in frames]
# a new constrained step starts wherever the energy jumps up by > 0.3 kcal/mol
starts = [0] + [k for k in range(1, len(E)) if (E[k] - E[k - 1]) * HARTREE > 0.3]
keep = [s - 1 for s in starts[1:]]
scan_steps = len(keep)

def rmsd(a, b):
    return math.sqrt(sum(math.dist(p, q) ** 2 for p, q in zip(a, b)) / len(a))

last = keep[-1]
for k in range(starts[-1], len(frames)):
    if rmsd(frames[k][2], frames[last][2]) >= MIN_STEP or k == len(frames) - 1:
        keep.append(k)
        last = k

elements = frames[0][1]
centre = [sum(c[j] for c in frames[0][2]) / len(elements) for j in range(3)]
out_frames = [[round(c[j] - centre[j], 3) for c in frames[k][2] for j in range(3)] for k in keep]
json.dump({
    "source": "AIQM2 relaxed scan via ORCA (MLatom-ORCA-interface)",
    "elements": elements,
    "frames": out_frames,
    "energy": [round((E[k] - E[0]) * HARTREE, 2) for k in keep],
    "scanSteps": scan_steps,
    "scanned": list(TRACK["cc"]),
    "track": {name: [round(math.dist(frames[k][2][a], frames[k][2][b]), 3) for k in keep] for name, (a, b) in TRACK.items()},
    "atoms": {"nucleophile": [64, 65], "epoxide": [66, 67, 68], "tyr": [30, 31, 41], "arg": [49, 62]},
}, open(out, "w"), separators=(",", ":"))
print(f"{len(keep)} frames ({scan_steps} scan steps), {len(elements)} atoms")
