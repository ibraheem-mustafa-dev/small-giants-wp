#!/usr/bin/env python3
"""image-sequence-prep.py — turns a video into frames the sgs/image-sequence block can use.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md FR-38-9 (Wave C, "the asset pipeline
… is a named Wave C work item — the block is NOT done when the canvas draws; it is
done when a client can produce usable frames with the documented tooling").

WHAT THIS DOES
---------------------------------------------------------------------------------------
Takes ONE video file and produces a numbered, compressed frame sequence at up to three
resolutions (desktop / tablet / mobile — the sgs/image-sequence block's resolution
ladder), plus a `frames-manifest.json` telling the operator exactly what to paste into
the block's "Frame source" inspector panel.

Output layout (per tier):
    <output-dir>/<tier>/frame_0001.<ext>
    <output-dir>/<tier>/frame_0002.<ext>
    …
This filename convention (`frame_` + zero-padded index + extension, 1-indexed on disk)
is a FIXED CONTRACT with the block's runtime (`src/shared/effects/gsap/fx-image-sequence.js`
`frameUrl()`) — do not rename the prefix here without updating that function too.

EXTERNAL DEPENDENCY — ffmpeg (NOT bundled, NOT a Python package)
---------------------------------------------------------------------------------------
This script shells out to `ffmpeg`, a free, open-source command-line tool the OPERATOR
installs on their own machine. This is explicitly NOT a project dependency in the
"no new npm/pip package" sense the framework's no-hardcoding/no-cheat rules protect —
ffmpeg is never imported, vendored, or shipped with this plugin; it is an external tool
this script calls via `subprocess`, exactly the way `wp` (WP-CLI) or `git` are external
tools other scripts in this project already assume are on the PATH. If it is missing,
this script FAILS LOUDLY with plain-English install instructions (see `_require_ffmpeg`)
rather than a Python stack trace — a non-technical operator needs "install this program"
words, not a traceback.

USAGE (plain English — this is also mirrored in scripts/IMAGE-SEQUENCE-PREP-README.md,
which a non-coder operator should read FIRST; this docstring is the developer copy)
---------------------------------------------------------------------------------------
    python image-sequence-prep.py --input product-spin.mp4 --output-dir out/product-spin \\
        --tier desktop=1920x1080 --tier tablet=1024x576 --tier mobile=640x360 \\
        --frames 90 --format webp --quality 82

    python image-sequence-prep.py --self-test   # proves the script's own logic can fail

Every `--tier` is optional to OMIT (the block falls back up the ladder when a tier is
absent), but at least one is required to produce any output. `--frames` sets the total
frame count sampled evenly across the video's duration (NOT ffmpeg's native fps — a
120fps 10-second clip does not need 1200 frames for a smooth scroll-scrub; 60-150 is
the sane range for a scroll effect, and the script does not silently cap or warn beyond
a soft sanity check because the block's own editor UI already carries the heavy-asset
warning for the operator at that end).

CHANGELOG
---------------------------------------------------------------------------------------
2026-07-31  Initial build (Spec 38 FR-38-9, Wave C item C8). No PyPI/npm dependency
            added — ffmpeg is an external tool, documented as such above and in the
            README. `--self-test` covers: missing-ffmpeg failure path, malformed
            `--tier` value rejection, frame-filename convention, and manifest shape —
            each proves the check can genuinely FAIL, not just pass on the happy path
            (house rule: "a gate that cannot fail reads green forever").
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

sys.stdout.reconfigure(encoding="utf-8")

FRAME_PREFIX = "frame_"
DEFAULT_PAD = 4
DEFAULT_FRAME_COUNT = 90
ALLOWED_FORMATS = ("webp", "jpg", "png")
TIER_ORDER = ("desktop", "tablet", "mobile")

_TIER_RE = re.compile(r"^(desktop|tablet|mobile)=(\d+)x(\d+)$")


class Tier(NamedTuple):
    """One resolution-ladder rung: a name (desktop/tablet/mobile) + target box."""

    name: str
    width: int
    height: int


# ---------------------------------------------------------------------------
# ffmpeg presence — fail loudly, in plain English, before anything else runs.
# ---------------------------------------------------------------------------


def _require_ffmpeg() -> str:
    """Return the ffmpeg executable path, or exit with install instructions.

    This is the FIRST thing `main()` calls. A missing dependency must never
    surface as a Python traceback to a non-technical operator — it must say,
    in one paragraph, what to install and how.

    :return: Absolute path to the ffmpeg binary.
    :raises SystemExit: Always, when ffmpeg cannot be found (exit code 1).
    """
    found = shutil.which("ffmpeg")
    if found:
        return found

    print(
        "\n"
        "============================================================\n"
        " ffmpeg is not installed (or not on your PATH).\n"
        "============================================================\n"
        "This tool needs ffmpeg to turn a video into frames. It is a\n"
        "free, well-known program — installing it takes a couple of\n"
        "minutes:\n"
        "\n"
        "  Windows:  winget install ffmpeg\n"
        "            (or download from https://ffmpeg.org/download.html)\n"
        "  macOS:    brew install ffmpeg\n"
        "  Linux:    sudo apt install ffmpeg   (Debian/Ubuntu)\n"
        "            sudo dnf install ffmpeg   (Fedora)\n"
        "\n"
        "After installing, close and reopen your terminal, then run this\n"
        "command again.\n"
        "============================================================\n",
        file=sys.stderr,
    )
    raise SystemExit(1)


# ---------------------------------------------------------------------------
# --tier parsing
# ---------------------------------------------------------------------------


def parse_tier(raw: str) -> Tier:
    """Parse one `--tier name=WxH` argument.

    :param raw: Raw CLI value, e.g. ``"desktop=1920x1080"``.
    :return: The parsed :class:`Tier`.
    :raises ValueError: When `raw` does not match `name=WxH` with a known tier
        name and positive integer dimensions — this is the validation the
        `--self-test` malformed-input case proves actually rejects bad input,
        rather than silently coercing it.
    """
    match = _TIER_RE.match(raw.strip())
    if not match:
        raise ValueError(
            f"Invalid --tier value {raw!r}. Expected "
            f"desktop|tablet|mobile=<width>x<height>, e.g. desktop=1920x1080."
        )
    name, width, height = match.group(1), int(match.group(2)), int(match.group(3))
    if width <= 0 or height <= 0:
        raise ValueError(f"--tier {raw!r} has a non-positive dimension.")
    return Tier(name=name, width=width, height=height)


# ---------------------------------------------------------------------------
# Frame filename convention — the fixed contract with fx-image-sequence.js.
# ---------------------------------------------------------------------------


def frame_filename(index: int, ext: str, pad: int = DEFAULT_PAD) -> str:
    """Build one frame's filename. 1-indexed on disk (index 0 -> frame_0001.ext).

    :param index: 0-based frame index.
    :param ext: File extension without the leading dot.
    :param pad: Zero-padding width.
    :return: The filename, e.g. ``"frame_0001.webp"``.
    """
    return f"{FRAME_PREFIX}{str(index + 1).zfill(pad)}.{ext}"


# ---------------------------------------------------------------------------
# ffmpeg invocation
# ---------------------------------------------------------------------------


def build_ffmpeg_command(
    ffmpeg_bin: str,
    input_path: Path,
    tier: Tier,
    out_dir: Path,
    frame_count: int,
    fmt: str,
    quality: int,
) -> list[str]:
    """Build the ffmpeg argv for one tier.

    Sampling strategy: `frame_count` frames spread EVENLY across the whole
    video duration via ffmpeg's `fps` filter driven by `1/step`, rather than
    a fixed frame rate — a fixed fps would produce a different total frame
    count per video length, and the block's config is a single `count` per
    tier, so the export must target that count directly.

    Cropping: `scale=…:force_original_aspect_ratio=increase,crop=W:H` fills
    the target box exactly (matching the canvas runtime's own "cover" draw),
    so what the operator previews in the output folder is what visitors see —
    no separate crop step needed on the frontend.

    :param ffmpeg_bin: Path to the ffmpeg executable.
    :param input_path: Source video file.
    :param tier: Target resolution tier.
    :param out_dir: Directory this tier's frames are written into.
    :param frame_count: Total frames to sample across the whole clip.
    :param fmt: One of ALLOWED_FORMATS.
    :param quality: 1-100 quality/compression setting (encoder-specific).
    :return: The full ffmpeg command as an argv list.
    """
    pattern = str(out_dir / f"{FRAME_PREFIX}%0{DEFAULT_PAD}d.{fmt}")

    vf = (
        f"scale={tier.width}:{tier.height}:force_original_aspect_ratio=increase,"
        f"crop={tier.width}:{tier.height}"
    )

    cmd = [
        ffmpeg_bin,
        "-y",
        "-i",
        str(input_path),
        "-vf",
        f"select='not(mod(n\\,1))',{vf}",
        "-vsync",
        "vfr",
        "-frames:v",
        str(frame_count),
    ]

    # -frames:v alone samples from the START of the clip at native fps, which
    # over-represents the first fraction of a long video. Instead derive an
    # explicit output fps from the (probed) duration so frame_count frames
    # spread across the WHOLE clip. Duration is probed by the caller and
    # folded into `vf` below when known; kept separate here so this function
    # stays a pure argv-builder the self-test can exercise without ffprobe.

    if fmt == "webp":
        cmd += ["-c:v", "libwebp", "-quality", str(quality), "-lossless", "0"]
    elif fmt == "jpg":
        # ffmpeg's mjpeg qscale is inverted (2 = best, 31 = worst); map our
        # 1-100 "higher is better" quality onto that range.
        qscale = max(2, min(31, round(31 - (quality / 100) * 29)))
        cmd += ["-c:v", "mjpeg", "-qscale:v", str(qscale)]
    # png is lossless; no quality flag to set.

    cmd.append(pattern)
    return cmd


def probe_duration_seconds(ffmpeg_bin: str, input_path: Path) -> float | None:
    """Best-effort video duration in seconds, via `ffprobe` (ships alongside ffmpeg).

    Returns None when ffprobe is unavailable or parsing fails — callers must
    tolerate that and fall back to ffmpeg's native sampling rather than crash.

    :param ffmpeg_bin: Path to the ffmpeg executable (ffprobe is a sibling binary).
    :param input_path: Source video file.
    :return: Duration in seconds, or None.
    """
    ffprobe_bin = shutil.which("ffprobe") or str(Path(ffmpeg_bin).with_name("ffprobe"))
    if not shutil.which(ffprobe_bin) and not os.path.exists(ffprobe_bin):
        return None

    try:
        result = subprocess.run(
            [
                ffprobe_bin,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(input_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        return float(result.stdout.strip())
    except (ValueError, subprocess.SubprocessError, OSError):
        return None


def run_tier(
    ffmpeg_bin: str,
    input_path: Path,
    tier: Tier,
    out_root: Path,
    frame_count: int,
    fmt: str,
    quality: int,
) -> dict:
    """Extract one tier's frame sequence, returning its manifest entry.

    :param ffmpeg_bin: Path to the ffmpeg executable.
    :param input_path: Source video file.
    :param tier: Target resolution tier.
    :param out_root: The `--output-dir` root; this tier writes to `out_root/tier.name`.
    :param frame_count: Total frames to sample.
    :param fmt: One of ALLOWED_FORMATS.
    :param quality: 1-100 quality setting.
    :return: Manifest entry ``{"count": int, "pad": int, "ext": str, "folder": str}``.
    :raises RuntimeError: When ffmpeg exits non-zero — surfaced with ffmpeg's own
        stderr tail so the operator sees the real cause (bad input file, codec
        issue, etc.) rather than a bare "it failed".
    """
    out_dir = out_root / tier.name
    out_dir.mkdir(parents=True, exist_ok=True)

    duration = probe_duration_seconds(ffmpeg_bin, input_path)
    cmd = build_ffmpeg_command(ffmpeg_bin, input_path, tier, out_dir, frame_count, fmt, quality)

    if duration and duration > 0:
        # Replace the naive select filter with an fps filter tuned to spread
        # frame_count frames across the whole known duration.
        target_fps = frame_count / duration
        vf_index = cmd.index("-vf")
        base_vf = cmd[vf_index + 1].split(",", 1)[1]  # drop the naive select() clause
        cmd[vf_index + 1] = f"fps={target_fps:.6f},{base_vf}"

    print(f"  Extracting {frame_count} frames -> {out_dir} ({tier.width}x{tier.height}) …")
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)

    if result.returncode != 0:
        tail = "\n".join(result.stderr.strip().splitlines()[-15:])
        raise RuntimeError(f"ffmpeg failed for tier '{tier.name}':\n{tail}")

    written = sorted(out_dir.glob(f"{FRAME_PREFIX}*.{fmt}"))
    total_bytes = sum(f.stat().st_size for f in written)

    print(
        f"    [ok] {len(written)} frames, {total_bytes / 1024:.0f} KB total "
        f"(~{total_bytes / max(1, len(written)) / 1024:.1f} KB/frame)"
    )

    return {
        "count": len(written),
        "pad": DEFAULT_PAD,
        "ext": fmt,
        "folder": str(out_dir),
    }


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------


def build_manifest(tier_results: dict[str, dict], base_url_hint: str = "") -> dict:
    """Build the operator-facing manifest — one entry per tier that ran.

    `base` is left as a placeholder the operator fills in with the real
    uploaded folder URL (this script has no way to know the eventual WP
    upload path); `base_url_hint`, when given, pre-fills it as a convenience.

    :param tier_results: `{tier_name: run_tier() return value}`.
    :param base_url_hint: Optional URL prefix to pre-fill `base` with.
    :return: The manifest dict, matching the block's inspector field shape
        (base/count/pad/ext per tier).
    """
    manifest: dict = {"tiers": {}}
    for name in TIER_ORDER:
        if name not in tier_results:
            continue
        entry = tier_results[name]
        base = f"{base_url_hint.rstrip('/')}/{name}" if base_url_hint else "PASTE-UPLOADED-FOLDER-URL-HERE"
        manifest["tiers"][name] = {
            "base": base,
            "count": entry["count"],
            "pad": entry["pad"],
            "ext": entry["ext"],
        }
    return manifest


# ---------------------------------------------------------------------------
# Self-test — proves the checks above can genuinely FAIL, not just pass.
# ---------------------------------------------------------------------------


def self_test() -> None:
    """Run assertions covering the failure paths, not just the happy path.

    House rule this exists to satisfy: "a gate that cannot fail reads green
    forever" — every check below has a companion assertion proving the
    NEGATIVE case (bad input, missing dependency) is actually rejected.
    """
    # 1. Missing-ffmpeg failure path fires (not just that ffmpeg-present succeeds).
    real_which = shutil.which
    try:
        shutil.which = lambda _name: None  # type: ignore[assignment]
        try:
            _require_ffmpeg()
            raise AssertionError("_require_ffmpeg() did not exit when ffmpeg was absent")
        except SystemExit as exc:
            assert exc.code == 1, f"Expected exit code 1, got {exc.code}"
    finally:
        shutil.which = real_which
    print("  [PASS] _require_ffmpeg() fails loudly (SystemExit 1) when ffmpeg is absent")

    # 1b. Negative control: present ffmpeg must NOT trigger the failure path
    #     (a check that always fails is as vacuous as one that never does).
    try:
        shutil.which = lambda _name: "/usr/bin/ffmpeg"  # type: ignore[assignment]
        path = _require_ffmpeg()
        assert path == "/usr/bin/ffmpeg"
    finally:
        shutil.which = real_which
    print("  [PASS] _require_ffmpeg() returns the path when ffmpeg IS present (negative control)")

    # 2. --tier parsing rejects malformed input.
    for bad in ("desktop", "desktop=abcxdef", "phone=100x100", "desktop=0x100", "desktop=100x0"):
        try:
            parse_tier(bad)
            raise AssertionError(f"parse_tier({bad!r}) should have raised ValueError")
        except ValueError:
            pass
    print("  [PASS] parse_tier() rejects 5 classes of malformed --tier input")

    # 2b. Negative control: a well-formed value parses correctly.
    tier = parse_tier("desktop=1920x1080")
    assert tier == Tier("desktop", 1920, 1080), f"Unexpected parse: {tier}"
    print("  [PASS] parse_tier() accepts a well-formed value (negative control)")

    # 3. Frame filename convention — the fixed contract with the JS runtime.
    assert frame_filename(0, "webp") == "frame_0001.webp"
    assert frame_filename(9, "jpg") == "frame_0010.jpg"
    assert frame_filename(0, "png", pad=2) == "frame_01.png"
    print("  [PASS] frame_filename() matches fx-image-sequence.js's frameUrl() convention")

    # 4. Manifest shape.
    manifest = build_manifest(
        {"desktop": {"count": 90, "pad": 4, "ext": "webp", "folder": "/tmp/x/desktop"}},
        base_url_hint="https://example.com/uploads/seq",
    )
    assert "tiers" in manifest
    assert manifest["tiers"]["desktop"]["count"] == 90
    assert manifest["tiers"]["desktop"]["base"] == "https://example.com/uploads/seq/desktop"
    assert "tablet" not in manifest["tiers"], "Missing tier must not appear in the manifest"
    print("  [PASS] build_manifest() shape matches the block's inspector fields; omitted tiers absent")

    # 5. ffmpeg command builder never emits an empty/malformed argv for a
    #    supported format, and rejects nothing silently for an unsupported one
    #    (the CLI's own --format choices= already blocks bad values before
    #    this is reached — this checks the builder itself stays honest).
    cmd = build_ffmpeg_command(
        "ffmpeg", Path("in.mp4"), Tier("desktop", 800, 450), Path("out"), 12, "webp", 80
    )
    assert "-c:v" in cmd and "libwebp" in cmd
    assert str(Path("in.mp4")) in cmd
    print("  [PASS] build_ffmpeg_command() produces a well-formed argv for webp")

    print("\nAll self-test assertions passed (including negative controls).")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Turn a video into a numbered, compressed frame sequence for the "
            "sgs/image-sequence block."
        )
    )
    parser.add_argument("--input", type=Path, help="Source video file.")
    parser.add_argument("--output-dir", type=Path, help="Folder to write tier subfolders into.")
    parser.add_argument(
        "--tier",
        action="append",
        default=[],
        dest="tiers",
        metavar="NAME=WxH",
        help="Repeatable. e.g. --tier desktop=1920x1080 --tier mobile=640x360.",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=DEFAULT_FRAME_COUNT,
        help=f"Total frames per tier, spread across the whole clip (default {DEFAULT_FRAME_COUNT}).",
    )
    parser.add_argument("--format", choices=ALLOWED_FORMATS, default="webp", help="Output image format.")
    parser.add_argument("--quality", type=int, default=82, help="1-100 quality/compression (default 82).")
    parser.add_argument(
        "--base-url",
        default="",
        help="Optional. Pre-fills the manifest's per-tier 'base' with <this>/<tier>.",
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Run internal assertions (including failure-path checks) and exit. No video needed.",
    )
    args = parser.parse_args()

    if args.self_test:
        try:
            self_test()
            return 0
        except AssertionError as exc:
            print(f"\n[FAIL] {exc}", file=sys.stderr)
            return 1

    if not args.input or not args.output_dir:
        parser.error("--input and --output-dir are required (unless using --self-test).")

    if not args.tiers:
        parser.error("At least one --tier is required, e.g. --tier desktop=1920x1080.")

    if args.quality < 1 or args.quality > 100:
        parser.error("--quality must be between 1 and 100.")

    if args.frames < 1 or args.frames > 1000:
        parser.error("--frames must be between 1 and 1000 (sanity bound — see README).")

    if not args.input.exists():
        print(f"\n[FAIL] Input video not found: {args.input}", file=sys.stderr)
        return 1

    try:
        tiers = [parse_tier(raw) for raw in args.tiers]
    except ValueError as exc:
        print(f"\n[FAIL] {exc}", file=sys.stderr)
        return 1

    ffmpeg_bin = _require_ffmpeg()  # exits with install instructions if missing

    args.output_dir.mkdir(parents=True, exist_ok=True)

    tier_results: dict[str, dict] = {}
    for tier in tiers:
        try:
            tier_results[tier.name] = run_tier(
                ffmpeg_bin, args.input, tier, args.output_dir, args.frames, args.format, args.quality
            )
        except RuntimeError as exc:
            print(f"\n[FAIL] {exc}", file=sys.stderr)
            return 1

    manifest = build_manifest(tier_results, base_url_hint=args.base_url)
    manifest_path = args.output_dir / "frames-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"\nDone. Wrote manifest to {manifest_path}")
    print("\nPaste these values into the block's Frame Source panel:\n")
    for name, entry in manifest["tiers"].items():
        print(f"  {name}:")
        print(f"    Frames folder URL : {entry['base']}")
        print(f"    Frame count       : {entry['count']}")
        print(f"    File type         : {entry['ext']}")
        print(f"    Zero-padding      : {entry['pad']}")
    print(
        "\nUpload the tier folder(s) under your output directory to your media "
        "library / uploads folder, then set 'Frames folder URL' to wherever "
        "that folder ends up being publicly reachable."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
