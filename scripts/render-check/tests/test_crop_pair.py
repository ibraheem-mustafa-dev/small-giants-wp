"""rc_report._crop_pair: a difference whose box lies past a screenshot's right or bottom edge (a ticker's off-screen copy)
gives no picture instead of stopping the run; a box inside the screenshot still gives its pair."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from rc_report import _crop_pair  # noqa: E402

PIL = pytest.importorskip("PIL")


def _png(path: Path, w: int, h: int) -> Path:
    from PIL import Image

    Image.new("RGB", (w, h), (200, 200, 200)).save(path)
    return path


def test_box_past_the_right_edge_gives_no_pair(tmp_path):
    a, b = _png(tmp_path / "a.png", 1440, 900), _png(tmp_path / "b.png", 1440, 900)
    assert _crop_pair(a, b, [2000, 100, 300, 40], [2100, 100, 300, 40], tmp_path / "p.png") is False
    assert not (tmp_path / "p.png").exists()


def test_box_below_the_bottom_edge_gives_no_pair(tmp_path):
    a, b = _png(tmp_path / "a.png", 375, 800), _png(tmp_path / "b.png", 375, 800)
    assert _crop_pair(a, b, [10, 5000, 100, 40], None, tmp_path / "p.png") is False


def test_box_partly_inside_crops_the_visible_part(tmp_path):
    from PIL import Image

    a, b = _png(tmp_path / "a.png", 1440, 900), _png(tmp_path / "b.png", 1400, 900)
    assert _crop_pair(a, b, [1300, 100, 400, 40], [1300, 100, 400, 40], tmp_path / "p.png") is True
    out = Image.open(tmp_path / "p.png")
    assert out.width > 12 and out.height > 0


def test_box_inside_gives_a_pair(tmp_path):
    a, b = _png(tmp_path / "a.png", 1440, 900), _png(tmp_path / "b.png", 1440, 900)
    assert _crop_pair(a, b, [100, 100, 200, 40], [100, 100, 220, 40], tmp_path / "p.png") is True
