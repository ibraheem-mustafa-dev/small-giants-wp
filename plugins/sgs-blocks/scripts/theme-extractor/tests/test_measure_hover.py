"""measure.js hover read: class-bearing buttons keep the legacy single delayed read, classless ones settle.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_measure_hover.py -q

Approach: ``measure-node.js::readHover`` is driven with a fake Playwright page (needs Node only, no
browser) whose ``evaluate`` returns a colour that keeps easing for a few reads and then stops. That makes
the number of reads and the value returned deterministic, where a real transition would depend on timing.
A class-bearing button (`classKey` without the `sig:` prefix) must read exactly once, after the same
hover + 120 ms wait as before; the classless one (`sig:`) must keep reading until two consecutive reads
agree, and return the final value. The live end-to-end companions are in test_presets_classless.py.
"""
from __future__ import annotations

import json
import pathlib
import shutil
import subprocess

import pytest

PKG = pathlib.Path(__file__).resolve().parent.parent

HARNESS = r"""
const { readHover } = require(process.argv[1]);
const EASING = ['rgb(37,37,37)', 'rgb(40,40,40)', 'rgb(42,42,42)'];   // mid-transition, then settled
function fakePage() {
  const log = { hovers: 0, waits: [], reads: 0 };
  return { log,
    hover: async () => { log.hovers++; },
    waitForTimeout: async (ms) => { log.waits.push(ms); },
    evaluate: async () => ({ backgroundColor: EASING[Math.min(log.reads++, EASING.length - 1)] }) };
}
(async () => {
  const out = {};
  for (const [name, classKey] of [['classBearing', 'btn-real||'], ['classless', 'sig:rgb(20, 20, 20)|x']]) {
    const page = fakePage();
    const hover = await readHover(page, { idx: 0, classKey });
    out[name] = { hover: hover.backgroundColor, ...page.log };
  }
  process.stdout.write(JSON.stringify(out));
})();
"""


@pytest.fixture(scope="module")
def result() -> dict:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not on PATH")
    proc = subprocess.run([node, "-e", HARNESS, str(PKG / "measure-node.js")], capture_output=True, text=True,
                          encoding="utf-8", timeout=30)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


def test_class_bearing_button_gets_the_legacy_single_read_after_the_120ms_wait(result):
    legacy = result["classBearing"]
    assert legacy["reads"] == 1 and legacy["waits"] == [120] and legacy["hovers"] == 1
    assert legacy["hover"] == "rgb(37,37,37)"            # the first read: exactly what it always returned


def test_classless_button_reads_until_two_consecutive_reads_agree(result):
    settled = result["classless"]
    assert settled["hover"] == "rgb(42,42,42)" and settled["reads"] >= 4
    assert settled["waits"][0] == 120 and set(settled["waits"][1:]) == {80}
