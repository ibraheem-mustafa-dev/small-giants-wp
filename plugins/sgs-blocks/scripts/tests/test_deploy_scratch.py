"""Deploy scratch folders live under E:/sgs-tmp (system temp only where E: is missing).

Run: python plugins/sgs-blocks/scripts/tests/test_deploy_scratch.py
"""
from __future__ import annotations

import re
import sys
import tempfile
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))

failures = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f": {detail}"))
    if not cond:
        failures.append(name)


import deploy_scratch  # noqa: E402

with mock.patch("deploy_scratch.Path.exists", return_value=True):
    check("scratch_dir is E:/sgs-tmp where E: has it", str(deploy_scratch.scratch_dir()).replace("\\", "/") == "E:/sgs-tmp")
with mock.patch("deploy_scratch.Path.exists", return_value=False):
    check("scratch_dir falls back to the system temp folder", Path(deploy_scratch.scratch_dir()) == Path(tempfile.gettempdir()))

offenders = []
for path in sorted(list(SCRIPTS.glob("deploy_*.py")) + [SCRIPTS / "build-deploy.py"]):
    if path.name == "deploy_scratch.py":
        continue
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if re.search(r"tempfile\.(TemporaryDirectory|mkdtemp|mkstemp|NamedTemporaryFile|gettempdir)\(", line) and "scratch_dir()" not in line and "dir=root" not in line:
            offenders.append(f"{path.name}:{number}: {line.strip()}")
check("every tempfile call in the deploy scripts is placed with scratch_dir()", not offenders, offenders)

sys.exit(1 if failures else 0)
