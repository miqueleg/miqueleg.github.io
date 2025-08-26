---
layout: post
title: AIQM2 Geometry Optimization with ORCA, SCAN and Sella
date: 2025-08-26 12:00:00
description: Overview of new AIQM2-based projects for structure minimization and transition-state searches
tags: aiqm2 orca scan sella quantum-chemistry
---

I recently uploaded a set of utilities that combine the **AIQM2** machine-learning potential with established quantum chemistry tools. The aim is to simplify geometry refinement and transition-state location in complex systems.

* **ORCA + SCAN minimization** – a workflow that drives geometry relaxation by coupling AIQM2 predictions with ORCA's SCAN density functional. [Implementation on GitHub](https://github.com/miqueleg/orca-scan-minimization)
* **Sella for transition states** – harnesses the Sella optimizer for efficient saddle-point searches using AIQM2 energies and gradients. [Implementation on GitHub](https://github.com/miqueleg/sella-ts-search)
* **AIQM2 core scripts** – utilities that interface the neural network model with common QC packages. [Implementation on GitHub](https://github.com/miqueleg/aiqm2-geometry)

### SCAN example

Below is a SCAN-driven optimization example. The plot shows the energy evolution over optimization cycles.

![ORCA TS Optimization Progress]({{ '/assets/img/scan_ts_progress.svg' | relative_url }})

#### Interactive trajectory

Use the slider to browse individual frames from the SCAN trajectory.

<div id="scan-viewer" style="width:100%; height:400px;"></div>
<input type="range" id="frame-slider" min="0" value="0" style="width:100%">

<script src="https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.6/3Dmol-min.js"></script>
<script>
const viewer = $3Dmol.createViewer('scan-viewer', {backgroundColor: 'black'});
fetch('{{ '/assets/xyz/output_traj.xyz' | relative_url }}')
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
</script>
