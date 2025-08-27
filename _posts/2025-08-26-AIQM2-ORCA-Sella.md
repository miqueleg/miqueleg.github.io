---
layout: post
title: AIQM2 Geometry Optimization with: ORCA Opt, SCAN, and; Sella TS search
date: 2025-08-26 12:00:00
description: Overview of new AIQM2-based projects for structure minimization and transition-state searches
tags: aiqm2 orca scan sella quantum-chemistry DFT semiempirical
---

I recently uploaded a set of utilities that combine the **AIQM2** machine-learning potential with established quantum chemistry tools. The aim is to simplify geometry refinement and transition-state location in complex systems.
Oficial implementations are available in [MLatom](https://github.com/dralgroup/mlatom) (ASE, geomeTRIC and Gaussian), but as for the date I am writting this, the oficial implementations lacked the possibility of adding positional and distance restraints during TS search and SCAN. Also, I like the TS search algorithm from Sella, and the ability of using the analytical hessian for the TS search. (I tried to implement this on ORCA, but I failed to use the computed hessian for the TS search)

* **ORCA Opt and SCAN minimization** – a workflow that drives geometry relaxation by coupling AIQM2 calculator with ORCA's Opt and SCAN algorithms. [Implementation on GitHub](https://github.com/miqueleg/MLatom-ORCA-interface)
* **Sella transition state search** – harnesses the Sella optimizer for efficient saddle-point searches using AIQM2 energies, gradients and hessian. [Implementation on GitHub](https://github.com/miqueleg/MLatom-Sella-TS-search)

### SCAN example

Below is a SCAN-driven optimization example. The plot shows the energy evolution over optimization cycles.

<img src="{{ '/assets/img/SCAN.png' | relative_url }}" alt="ORCA TS Optimization Progress" style="width:80%;height:auto;display:block;margin:0 auto;" />

#### Interactive trajectory

Use the slider below to browse individual frames from the SCAN trajectory.

<div id="scan-viewer" style="width:100%; height:500px; position:relative;"></div>
<input type="range" id="frame-slider" min="0" value="0" style="width:120%">

<script src="https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.6/3Dmol-min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  const viewer = $3Dmol.createViewer(document.getElementById('scan-viewer'), {
    backgroundColor: 'black'
  });
  fetch('{{ '/assets/xyz/output_traj_reduced.xyz' | relative_url }}')
    .then(r => r.text())
    .then(data => {
      viewer.addModelsAsFrames(data, 'xyz');
      viewer.setStyle({}, {stick:{radius:0.15}, sphere:{scale:0.3}});
      viewer.zoomTo();
      viewer.render();
      const slider = document.getElementById('frame-slider');
      slider.max = viewer.getModel(0).getNumFrames() - 1;
      slider.oninput = () => {
        viewer.setFrame(parseInt(slider.value));
        viewer.render();
      };
    });
});
</script>
