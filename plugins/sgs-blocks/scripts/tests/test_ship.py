"""ship.py: reseed only when a block.json or a seeder changed; one build-deploy pass that carries the editor check;
publish only after that pass; push last.

Run: python plugins/sgs-blocks/scripts/tests/test_ship.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("ship", SCRIPTS / "ship.py")
ship = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ship)
import deploy_common  # noqa: E402

failures = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f": {detail}"))
    if not cond:
        failures.append(name)


hits = ship.needs_reseed([
    "plugins/sgs-blocks/src/blocks/account/block.json",
    "plugins/sgs-blocks/src/blocks/account/style.css",
    "plugins/sgs-blocks/src/blocks/cart/render.php",
    "theme/sgs-theme/assets/css/woocommerce.css",
    "plugins/sgs-blocks/scripts/seed-composition-roles.py",
])
check("a block.json and a seeder trigger a reseed; css, php and theme files do not",
      hits == ["plugins/sgs-blocks/src/blocks/account/block.json", "plugins/sgs-blocks/scripts/seed-composition-roles.py"], hits)
check("no trigger, no reseed", ship.needs_reseed(["plugins/sgs-blocks/src/blocks/cart/style.css", "README.md"]) == [])

import json, sqlite3, tempfile  # noqa: E401,E402
tmp = Path(tempfile.mkdtemp())
(tmp / "blocks" / "alpha").mkdir(parents=True)
(tmp / "blocks" / "beta").mkdir(parents=True)
(tmp / "blocks" / "alpha" / "block.json").write_text(json.dumps({"name": "sgs/alpha", "attributes": {"a": {}, "b": {}}}))
(tmp / "blocks" / "beta" / "block.json").write_text(json.dumps({"name": "sgs/beta", "attributes": {"c": {}}}))
db = tmp / "f.db"
con = sqlite3.connect(db)
con.execute("CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT)")
con.executemany("INSERT INTO block_attributes VALUES (?, ?)", [("sgs/alpha", "a"), ("sgs/alpha", "b")])
con.commit()
con.close()
missing = ship.missing_from_db(tmp / "blocks", db)
check("an attribute or a block the shared DB lacks forces a reseed (generated files committed by an unpublished reseed do not count)",
      missing == ["sgs/beta::c"], missing)
con = sqlite3.connect(db)
con.execute("INSERT INTO block_attributes VALUES ('sgs/beta', 'c')")
con.commit()
con.close()
check("a DB that holds every attribute needs no reseed", ship.missing_from_db(tmp / "blocks", db) == [])

names = [n for n, _, _ in ship.plan("eye-care-test", True, "C:/t/x.db", False, True)]
check("reseeded run order", names == ["begin", "reseed", "seed-reference", "regenerate", "commit-generated", "build-deploy", "publish", "push"], names)
check("publish comes after the one build-deploy pass", names.index("publish") > names.index("build-deploy"))

steps = {n: (a, e) for n, a, e in ship.plan("eye-care-test", True, "C:/t/x.db", True, True)}
argv, env = steps["build-deploy"]
check("build-deploy reads the private copy", env == {"SGS_FRAMEWORK_DB": "C:/t/x.db"}, env)
check("build-deploy runs the target's editor check", "--editor-check" in argv and argv[argv.index("--editor-check") + 1] == deploy_common.TARGETS["eye-care-test"]["editor_mirror"], argv)
check("--takeover passes through", "--takeover" in argv)
check("no --gate-only, --skip-verify or --allow-dirty", not {"--gate-only", "--skip-verify", "--allow-dirty"} & set(argv))

names = [n for n, _, _ in ship.plan("eye-care-test", False, "C:/t/x.db", False, False)]
check("no reseed, no push: build-deploy alone", names == ["build-deploy"], names)
_, env = {n: (a, e) for n, a, e in ship.plan("eye-care-test", False, "C:/t/x.db", False, False)}["build-deploy"]
check("without a reseed the shared DB is used", env == {}, env)

check("every target names its editor-check mirror", all(t.get("editor_mirror") for t in deploy_common.TARGETS.values()),
      [k for k, t in deploy_common.TARGETS.items() if not t.get("editor_mirror")])

sys.exit(1 if failures else 0)
