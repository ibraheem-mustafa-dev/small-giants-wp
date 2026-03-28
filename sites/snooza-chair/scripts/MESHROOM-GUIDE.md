# Meshroom Photogrammetry Guide — SGS Configurator Pro

## Quick Start
```bash
"C:/Users/Bean/Projects/Meshroom-2023.3.0/meshroom_batch.exe" \
  --input [folder-of-images] \
  --output [output-folder]
```

## Optimal Image Capture (for future products)
- 100-150 still photos (not video frames)
- 3 orbit passes: 20 degrees above, horizontal, 30 degrees below
- 10-15 degrees between each shot (24-36 per orbit)
- 60-80% overlap between consecutive frames
- 12MP minimum resolution
- Flat diffuse lighting (overcast outdoors ideal)
- Lock exposure before shooting
- Include a scale reference object in a few frames

## Key Parameters to Tune
- FeatureExtraction describerPreset: "high" for textured surfaces
- DepthMap downscale: 1 for max quality (needs 8GB+ VRAM), 2 for default
- DepthMapFilter minNumOfConsistentCams: reduce to 2 if sparse coverage
- MeshFiltering keepLargestMeshOnly: true
- MeshFiltering smoothingIteration: 5

## Post-Processing Pipeline
1. Import OBJ into Blender
2. Delete background/floor geometry
3. Fix flipped normals
4. Decimate to 30k-50k polygons
5. Export as GLB with Draco compression

## Video Frame Extraction (FFmpeg)
```bash
ffmpeg -i video.mp4 -vf "select=not(mod(n\,3))" -vsync vfr frames/frame_%04d.png
```

## Known Issues
- Video frames: H.264 compression degrades texture. Still photos always better
- Shiny/metallic surfaces create holes (spray with matte chalk if possible)
- 45 frames is borderline — 100+ recommended for complex objects like chairs
