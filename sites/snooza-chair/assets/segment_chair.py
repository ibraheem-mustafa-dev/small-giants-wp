"""
Segment the Snooza Chair from video frames using SAM + colour filtering.
Strategy: Generate all masks with SAM, score each mask by how much blue (the chair's vinyl)
it contains, pick the best match, and output the chair-only image with transparent background.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import os
import cv2
import numpy as np
import torch
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator
from pathlib import Path

# Paths
CHECKPOINT = "C:/Users/Bean/Projects/TripoSR/sam_vit_b.pth"
INPUT_DIR = "C:/Users/Bean/Projects/small-giants-wp/sites/snooza-chair/assets/meshroom-clean"
OUTPUT_DIR = "C:/Users/Bean/Projects/small-giants-wp/sites/snooza-chair/assets/sam-masked"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load SAM
print("Loading SAM model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
sam = sam_model_registry["vit_b"](checkpoint=CHECKPOINT)
sam.to(device)

mask_generator = SamAutomaticMaskGenerator(
    sam,
    points_per_side=32,
    pred_iou_thresh=0.86,
    stability_score_thresh=0.92,
    min_mask_region_area=10000,  # ignore tiny fragments
)

def score_mask_as_chair(mask, image_hsv):
    """Score how likely this mask contains the blue Snooza Chair.
    The chair is bright blue vinyl (HSV: H=100-120, S>80, V>80).
    Also has grey/white trim and black interior.
    We want the mask that has the MOST blue pixels relative to its size.
    """
    masked_hsv = image_hsv[mask]
    if len(masked_hsv) == 0:
        return 0

    h, s, v = masked_hsv[:, 0], masked_hsv[:, 1], masked_hsv[:, 2]

    # Blue vinyl: H=90-130, S>60, V>60
    blue_pixels = np.sum((h >= 90) & (h <= 130) & (s > 60) & (v > 60))

    # Also count light grey/white pixels (trim): S<40, V>180
    trim_pixels = np.sum((s < 40) & (v > 180))

    # Black interior: V<60
    black_pixels = np.sum(v < 60)

    # Chair score: blue is primary, trim and black are secondary
    total = len(masked_hsv)
    blue_ratio = blue_pixels / total
    chair_ratio = (blue_pixels + trim_pixels * 0.3 + black_pixels * 0.2) / total

    # Prefer larger masks (the chair is a big object)
    size_bonus = min(total / 100000, 1.0)  # cap at 1.0

    return chair_ratio * 0.7 + blue_ratio * 0.2 + size_bonus * 0.1


def process_frame(filepath, output_path):
    """Process one frame: segment, find chair mask, output with transparent bg."""
    image = cv2.imread(str(filepath))
    if image is None:
        return False

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image_hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Generate all masks
    masks = mask_generator.generate(image_rgb)

    if not masks:
        print(f"  No masks found for {filepath.name}")
        return False

    # Score each mask
    scored = []
    for m in masks:
        score = score_mask_as_chair(m["segmentation"], image_hsv)
        scored.append((score, m))

    # Sort by score descending
    scored.sort(key=lambda x: x[0], reverse=True)

    # Take the best mask — but also merge any overlapping high-scoring masks
    # (the chair might be split into multiple segments)
    best_score = scored[0][0]
    threshold = best_score * 0.5  # merge masks scoring > 50% of the best

    combined_mask = np.zeros(image.shape[:2], dtype=bool)
    merged_count = 0
    for score, m in scored:
        if score >= threshold and score > 0.1:
            combined_mask |= m["segmentation"]
            merged_count += 1
        else:
            break

    # Create output with transparent background
    output = np.zeros((image.shape[0], image.shape[1], 4), dtype=np.uint8)
    output[:, :, :3] = image  # BGR
    output[:, :, 3] = (combined_mask * 255).astype(np.uint8)  # alpha

    cv2.imwrite(str(output_path), output)
    return True


# Process all frames
frames = sorted(Path(INPUT_DIR).glob("seg1_*.png"))
print(f"Found {len(frames)} frames to process")

success = 0
for i, frame in enumerate(frames):
    output_path = Path(OUTPUT_DIR) / frame.name
    if output_path.exists():
        success += 1
        continue

    print(f"Processing {i+1}/{len(frames)}: {frame.name}")
    if process_frame(frame, output_path):
        success += 1

print(f"\nDone. {success}/{len(frames)} frames processed successfully.")
print(f"Output: {OUTPUT_DIR}")
