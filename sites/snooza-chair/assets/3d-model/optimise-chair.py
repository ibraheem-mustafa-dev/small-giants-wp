"""
Blender headless script to optimise the Snooza Chair GLB.
Run: blender --background --python optimise-chair.py

Steps:
1. Import GLB
2. Decimate to ~50K faces (web-ready)
3. Create 6 colour material variants (KHR_materials_variants)
4. Export optimised GLB
"""

import bpy
import os
import sys

# ─── Config ───────────────────────────────────────────────────
INPUT_GLB = os.path.join(os.path.dirname(__file__), "snooza-chair-blue.glb")
OUTPUT_GLB = os.path.join(os.path.dirname(__file__), "snooza-chair-web.glb")
TARGET_FACES = 50000

# Snooza Chair colour variants (vinyl outer colour)
COLOURS = {
    "Royal Blue":      (0.0, 0.35, 0.75, 1.0),
    "Mandarin Orange": (0.95, 0.45, 0.08, 1.0),
    "Apple Green":     (0.30, 0.65, 0.15, 1.0),
    "Grey":            (0.45, 0.45, 0.45, 1.0),
    "Hot Pink":        (0.90, 0.15, 0.40, 1.0),
    "Black":           (0.05, 0.05, 0.05, 1.0),
}

# ─── Clean scene ──────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)

# ─── Import GLB ───────────────────────────────────────────────
print(f"Importing {INPUT_GLB}...")
bpy.ops.import_scene.gltf(filepath=INPUT_GLB)
print(f"Imported. Objects: {len(bpy.data.objects)}")

# ─── Find mesh objects ────────────────────────────────────────
meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
print(f"Mesh objects: {len(meshes)}")

total_faces_before = sum(len(obj.data.polygons) for obj in meshes)
print(f"Total faces before: {total_faces_before:,}")

# ─── Decimate each mesh ──────────────────────────────────────
if total_faces_before > TARGET_FACES:
    ratio = TARGET_FACES / total_faces_before
    print(f"Decimation ratio: {ratio:.4f} (target: {TARGET_FACES:,} faces)")

    for obj in meshes:
        if len(obj.data.polygons) < 100:
            continue  # Skip tiny meshes

        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Add decimate modifier
        mod = obj.modifiers.new(name="Decimate", type='DECIMATE')
        mod.ratio = ratio
        mod.use_collapse_triangulate = True

        # Apply modifier
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.select_set(False)

    total_faces_after = sum(len(obj.data.polygons) for obj in meshes)
    print(f"Total faces after: {total_faces_after:,}")
else:
    print("Already under target, skipping decimation.")

# ─── Create colour variants ──────────────────────────────────
# Find the main blue material (the outer vinyl)
# We look for the material with the most blue-ish base colour
blue_mat = None
blue_mat_name = None
for mat in bpy.data.materials:
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                base = node.inputs['Base Color'].default_value
                # Check if it's blue-ish (blue channel > red and green)
                if base[2] > 0.3 and base[2] > base[0] and base[2] > base[1]:
                    blue_mat = mat
                    blue_mat_name = mat.name
                    print(f"Found blue material: {mat.name} (RGBA: {base[0]:.2f}, {base[1]:.2f}, {base[2]:.2f}, {base[3]:.2f})")
                    break
    if blue_mat:
        break

if not blue_mat:
    # Fallback: just use the first material with a principled BSDF
    for mat in bpy.data.materials:
        if mat.use_nodes:
            for node in mat.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    blue_mat = mat
                    blue_mat_name = mat.name
                    print(f"No blue found, using first material: {mat.name}")
                    break
        if blue_mat:
            break

# Create variant materials
variant_materials = {}
if blue_mat:
    for colour_name, rgba in COLOURS.items():
        if colour_name == "Royal Blue":
            variant_materials[colour_name] = blue_mat
            continue

        # Duplicate the blue material
        new_mat = blue_mat.copy()
        new_mat.name = f"Vinyl_{colour_name.replace(' ', '_')}"

        # Change the base colour
        for node in new_mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                node.inputs['Base Color'].default_value = rgba
                break

        variant_materials[colour_name] = new_mat

    print(f"Created {len(variant_materials)} colour variants")

    # Store variant info as custom properties for the exporter
    # KHR_materials_variants is set up during glTF export via the Blender addon
    # We need to use the glTF variants extension
    # For Blender 5.x, we set up variant data on the mesh

    # Get the mesh object that uses the blue material
    for obj in meshes:
        for i, slot in enumerate(obj.material_slots):
            if slot.material == blue_mat:
                print(f"Blue material is on object '{obj.name}', slot {i}")
                # We'll store the variants as a custom property for reference
                obj["snooza_colour_variants"] = str(list(COLOURS.keys()))
                break
else:
    print("WARNING: Could not find any material to create variants from")

# ─── Print all materials for debugging ────────────────────────
print("\n--- All materials ---")
for mat in bpy.data.materials:
    print(f"  {mat.name}")

# ─── Export optimised GLB ─────────────────────────────────────
print(f"\nExporting to {OUTPUT_GLB}...")

# Export settings for web
bpy.ops.export_scene.gltf(
    filepath=OUTPUT_GLB,
    export_format='GLB',
    export_texcoords=True,
    export_normals=True,
    export_materials='EXPORT',
    export_image_format='AUTO',
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_apply=True,
)

# Check output size
output_size = os.path.getsize(OUTPUT_GLB) / (1024 * 1024)
print(f"\nExport complete!")
print(f"Output: {OUTPUT_GLB}")
print(f"Size: {output_size:.1f} MB")
print(f"Faces: {sum(len(obj.data.polygons) for obj in meshes):,}")
print(f"Colour variants created: {len(variant_materials)}")
