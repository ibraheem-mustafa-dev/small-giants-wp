"""ship.py: reseed only when a block.json or a seeder changed; one build-deploy pass (the editor check only when asked);
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
(tmp / "blocks" / "beta" / "block.json").write_text(json.dumps({"name": "sgs/beta", "attributes": {"c": {}, "_comment_c": "a note, not an attribute"}}))
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
check("no editor check unless asked", "--editor-check" not in argv, argv)
argv_ec = [a for n, a, _ in ship.plan("eye-care-test", False, "C:/t/x.db", False, False, editor_check=True) if n == "build-deploy"][0]
check("--editor-check runs the target's editor check", "--editor-check" in argv_ec and argv_ec[argv_ec.index("--editor-check") + 1] == deploy_common.TARGETS["eye-care-test"]["editor_mirror"], argv_ec)
check("--takeover passes through", "--takeover" in argv)
check("no --gate-only, --skip-verify or --allow-dirty", not {"--gate-only", "--skip-verify", "--allow-dirty"} & set(argv))

names = [n for n, _, _ in ship.plan("eye-care-test", False, "C:/t/x.db", False, False)]
check("no reseed, no push: build-deploy alone", names == ["build-deploy"], names)
_, env = {n: (a, e) for n, a, e in ship.plan("eye-care-test", False, "C:/t/x.db", False, False)}["build-deploy"]
check("without a reseed the shared DB is used", env == {}, env)

check("every target names its editor-check mirror", all(t.get("editor_mirror") for t in deploy_common.TARGETS.values()),
      [k for k, t in deploy_common.TARGETS.items() if not t.get("editor_mirror")])

# The reseed loop: a reseed whose commit rewrote only seed-history.json must not trigger the next reseed.
import subprocess  # noqa: E402
SEED_HISTORY = "plugins/sgs-blocks/scripts/dbschema/seed-history.json"
ROLE_MAP = "plugins/sgs-blocks/scripts/consistency/attr-role-map.json"
SEEDER = "plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py"
check("a GENERATED file alone never triggers a reseed", ship.needs_reseed([SEED_HISTORY, ROLE_MAP]) == [],
      ship.needs_reseed([SEED_HISTORY, ROLE_MAP]))
repo = Path(tempfile.mkdtemp(prefix="ship-reseed-"))


def g(*a):
    return subprocess.run(["git", *a], cwd=repo, capture_output=True, text=True, check=True).stdout.strip()


g("init", "-q")
g("config", "user.email", "t@example.invalid")
g("config", "user.name", "t")


def commit(files, msg):
    for rel, text in files.items():
        f = repo / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text)
    g("add", "-A")
    g("commit", "-q", "-m", msg)


commit({SEEDER: "v1", ROLE_MAP: "r1", SEED_HISTORY: "h1"}, "a reseed that wrote both generated files")
commit({SEED_HISTORY: "h2"}, "a reseed that rewrote seed-history.json only")


def reasons(marker_fn, trigger_fn):
    marker = marker_fn(g)
    return trigger_fn(g("diff", "--name-only", f"{marker}..HEAD").splitlines())


def old_marker(git_fn):
    return git_fn("log", "-1", "--format=%H", "--", ROLE_MAP)


def old_needs_reseed(changed):
    return [p for p in changed if any(p.startswith(t) for t in ship.RESEED_TRIGGERS)]


check("after a seed-history-only reseed commit, the next ship does not reseed",
      reasons(ship.last_reseed_commit, ship.needs_reseed) == [], reasons(ship.last_reseed_commit, ship.needs_reseed))
check("NEGATIVE CONTROL: the old marker and trigger rule reseed again (the loop this fixes)",
      reasons(old_marker, old_needs_reseed) == [SEED_HISTORY], reasons(old_marker, old_needs_reseed))
commit({SEEDER: "v2"}, "a real seeder edit")
check("a real seeder edit after the last reseed still triggers one",
      reasons(ship.last_reseed_commit, ship.needs_reseed) == [SEEDER], reasons(ship.last_reseed_commit, ship.needs_reseed))

sys.exit(1 if failures else 0)
