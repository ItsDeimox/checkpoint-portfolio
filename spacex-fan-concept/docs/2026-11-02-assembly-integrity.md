# Connected-source inspection correction

The reported Falcon Heavy interstage ribbons were reproduced in the actual viewer. `partitionAuthoredRegions` distributed individual triangles by their centroid height, splitting a continuous body whose triangles span multiple regions. Conserving the total triangle count did not prevent broken isolated surfaces.

The importer now groups whole connected surfaces using geometric edge adjacency while copying every original position, UV, normal and tangent unchanged. Selection regions remain clickable; continuous bodies are retained as assembly context rather than torn into false standalone modules. The interface identifies these as ASSEMBLY VIEW, not a fabricated cutaway. No end caps or internal geometry are generated, and no asset or source material has been replaced.

This corrects the importer-created openings/ribbons, not genuinely missing cabin, plumbing or tank internals in the artist files. A complete interior replacement remains outstanding. The Falcon 9/Dragon/Starship model sources are unchanged.

Regression checks cover a closed body crossing all former slicing bands, UV seams, separate engine components and contextual inspection without copied or generated triangles. Actual high/eco Heavy geometry is checked for newly introduced boundary edges and unchanged source triangle totals; desktop/mobile interactions and rendered images are reviewed before publication.
