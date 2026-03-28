"""
Blender headless script to clean up AI-generated GLB models.
Run: blender --background --python cleanup-model.py -- input.glb output.glb

Improvements applied:
1. Remesh for cleaner topology
2. Smooth shading
3. Subdivision surface for organic curves
4. Decimate to target polygon count
5. Auto-UV unwrap for better texturing
"""

import bpy
import sys
import os


def get_args():
    """Get arguments after the -- separator."""
    argv = sys.argv
    if "--" not in argv:
        return None, None, {}

    args = argv[argv.index("--") + 1:]
    input_path = args[0] if len(args) > 0 else None
    output_path = args[1] if len(args) > 1 else None

    options = {}
    for i, arg in enumerate(args[2:], 2):
        if arg.startswith("--"):
            key = arg[2:]
            val = args[i + 1] if i + 1 < len(args) and not args[i + 1].startswith("--") else "true"
            options[key] = val

    return input_path, output_path, options


def cleanup_model(input_path, output_path, target_polys=30000, subdivisions=1):
    """Clean up the AI-generated mesh."""

    # Clear the scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import GLB
    bpy.ops.import_scene.gltf(filepath=input_path)

    # Find the mesh object
    mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            mesh_obj = obj
            break

    if mesh_obj is None:
        print("ERROR: No mesh found in GLB")
        return False

    # Select and make active
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_obj

    current_polys = len(mesh_obj.data.polygons)
    print(f"Input mesh: {current_polys} polygons")

    # Step 1: Smooth shading
    bpy.ops.object.shade_smooth()
    print("Applied smooth shading")

    # Step 2: Remove doubles (merge close vertices)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.001)
    bpy.ops.object.mode_set(mode='OBJECT')
    print("Removed duplicate vertices")

    # Step 3: Voxel remesh for cleaner topology
    mesh_obj.data.remesh_voxel_size = 0.01
    mesh_obj.data.use_remesh_preserve_volume = True
    bpy.ops.object.voxel_remesh()
    remeshed_polys = len(mesh_obj.data.polygons)
    print(f"Voxel remesh: {remeshed_polys} polygons")

    # Step 4: Subdivision surface for smoother organic shapes
    if subdivisions > 0:
        subsurf = mesh_obj.modifiers.new(name="Subdivision", type='SUBSURF')
        subsurf.levels = subdivisions
        subsurf.render_levels = subdivisions
        bpy.ops.object.modifier_apply(modifier="Subdivision")
        subdiv_polys = len(mesh_obj.data.polygons)
        print(f"After subdivision ({subdivisions} levels): {subdiv_polys} polygons")

    # Step 5: Decimate to target polygon count
    current_polys = len(mesh_obj.data.polygons)
    if current_polys > target_polys:
        ratio = target_polys / current_polys
        decimate = mesh_obj.modifiers.new(name="Decimate", type='DECIMATE')
        decimate.ratio = ratio
        bpy.ops.object.modifier_apply(modifier="Decimate")
        final_polys = len(mesh_obj.data.polygons)
        print(f"Decimated to {final_polys} polygons (target: {target_polys})")
    else:
        final_polys = current_polys
        print(f"No decimation needed: {final_polys} polygons (target: {target_polys})")

    # Step 6: Auto smooth normals (Blender 4.1+ uses modifier, 5.x removed the old API)
    try:
        mesh_obj.data.use_auto_smooth = True
        mesh_obj.data.auto_smooth_angle = 0.523599
        print("Applied auto-smooth normals (legacy API)")
    except AttributeError:
        # Blender 5.x — auto smooth is default behaviour with smooth shading
        print("Auto-smooth handled by smooth shading (Blender 5.x)")

    # Step 7: Smart UV project for better texturing
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=66, island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    print("Applied smart UV projection")

    # Step 8: Export as GLB
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
    )

    file_size = os.path.getsize(output_path)
    print(f"\nOutput: {output_path}")
    print(f"Final: {final_polys} polygons, {file_size / 1024 / 1024:.1f}MB")

    return True


if __name__ == "__main__":
    input_path, output_path, options = get_args()

    if not input_path or not output_path:
        print("Usage: blender --background --python cleanup-model.py -- input.glb output.glb [--target-polys 30000] [--subdivisions 1]")
        sys.exit(1)

    target_polys = int(options.get("target-polys", "30000"))
    subdivisions = int(options.get("subdivisions", "1"))

    success = cleanup_model(input_path, output_path, target_polys, subdivisions)
    sys.exit(0 if success else 1)
