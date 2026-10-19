# Card hover: propagation-only correction

Baseline: `2254c2aeb6d2a80fc26dd1bab522aaca8045f6da`.

The user requested the original propagating network, with a different style of propagation, not a different hover effect. Prism fragments and the subsequent recorded cursor wake were incorrect interpretations. Both are removed from the runtime.

The exact original `CUBE_NETWORK_GLSL` sampling, nodes, wire shapes, colour composition and `.42 / .46` emission gains are restored from `2534b7a`. Only per-card edge conductance changes: neighbouring connections transmit at different rates along a smoothly varying direction field. An impulse still travels through unvisited nodes after the pointer stops or leaves. There is no recorded cursor path or ribbon mask.

The weights are configured once at construction, remain positive and never exceed the original spring weights. Topology, array sizes, solver, timestep, injection, damping, shaders and per-frame workload are otherwise unchanged from the pre-Prism network. The six-face graph, existing data texture and all five colours are retained. Reduced motion and portal travel still stop the wave. The original shared cube and Play Now are unmodified.

No changes to the main loop, GPU scheduling, quality settings, page capture, tunnel, camera, lighting, car or layouts. New tests distinguish restored network shading from both rejected replacements and demonstrate actual propagation beyond the cursor, a different wave footprint, stationary decay, unchanged topology, bounded weights and preserved resources. Software-GPU validation is not a hardware performance claim.
