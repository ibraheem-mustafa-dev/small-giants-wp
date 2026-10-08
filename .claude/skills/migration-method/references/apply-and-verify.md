# Apply, prove and deploy detail (Steps 9, 9b, 10, 11)

Loaded from SKILL.md.

## Step 9 — Snapshot, dry run, then apply

```bash
git status --porcelain -- <the paths your survey listed>   # must be empty
git rev-parse HEAD                                          # record it
python plugins/sgs-blocks/scripts/<your-script>.py --fix    # diff only
python plugins/sgs-blocks/scripts/<your-script>.py --fix --apply
git diff --stat
```

⛔ **`--survey` must report `unrecognised: 0` BEFORE you apply, and nothing enforces it.**
The model writes every file inside its scan loop and only then prints `REFUSING to guess` and
returns 1. **A non-zero exit from `--apply` does NOT mean the tree is untouched.** Confirm the
zero with your own eyes first.

⛔ **If `git status` shows work in your paths you did not write, STOP** (hand-back #2). Both
the apply and its rollback would destroy it.

⛔ **`git checkout -- <paths>` is NOT a safe undo here**: it reverts to HEAD, discarding concurrent
uncommitted work. Undo with `git checkout <recorded-sha> -- <your paths>`, scoped. **Never a bare
`git checkout .`**: it takes four other tracks with it.

⚠ **Read `git diff --stat`.** Each file should show a small, roughly symmetric +/- count and the file
count should equal your census. **A file whose deletions equal its whole length was truncated**
(see hazards).

⚠ **If the survey counts moved between your dry run and your apply, another track moved your
targets.** Re-survey; do not apply.

## Step 9b — A codemod's own `--check` is necessary, not sufficient

**"Done" for a schema fold is a green FULL build/gate chain, never the codemod's own `--check`
alone**: an exact-shape matcher cannot see dead destructured names left in `edit.js`, a second
differently-shaped control for the same attribute family, or a variable used before assignment in
`render.php` (only PHPStan catches that).

- **Re-grep the WHOLE codebase for the old attribute names after every codemod run.**
- **Run the real build (`npm run build`, PHPStan included) before calling any block.json schema
  fold done.**
- **Never trust a hand-written regex reformat pass without re-reading `git diff`.**

## Step 10 — Prove the gate can fail

```bash
python plugins/sgs-blocks/scripts/<your-script>.py --self-test   # must exit 0
python plugins/sgs-blocks/scripts/<your-script>.py --check       # must exit 0 now
```

Then break one instance on purpose and run `--check` again. It must exit 1. **A gate you
have never seen fail is not a gate.**

⛔ **Restore by re-running `--fix --apply`, not by `git checkout`** (Step 9). **Then run
`--check` once more and require exit 0.** Do not commit until you have seen that second
zero: a deliberate break left in the tree is indistinguishable from a missed instance.

⚠ **After rebasing or merging `main`, re-run `--survey` AND `--check`.** A concurrent track
can add an instance of the shape you just eliminated, and your gate will then fail on their
commit.

## Step 11 — Deploy and LOOK. The gate is not the proof.

```bash
git status --porcelain                       # nothing of yours outstanding
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
```

⚠ **No rendered surface (developer tooling): this step is N/A; say so and substitute
provably-identical behaviour**: diff the tool's own output against a baseline recovered with
`git show <recorded-sha>:`. (D775.) ⚠ **A findings backlog has no `classify()` categories:** sample by
the MECHANISM that fixes the finding, one live check per mechanism touched (D778), derived from the
finding `key`'s tail, not its `kind` field (non-null on only one rule, `31-golden-colour-control`).

Then open a real page rendering an affected block and check the changed property's computed
value, **at least one instance per `classify()` category**, not one page.

⛔ **A green `--check` proves no instance was MISSED. It proves nothing about whether the
transform was RIGHT.** Closing on a green gate violates `CLAUDE.md` Rule 5. This method does
not replace Rule 5 or R-31-13.

⛔ **If the deploy aborts with `deployed-files-dirty`, do NOT reach for `--allow-dirty`**:
that flag was D336's trigger, a ~2.5-hour two-client-site outage, and the abort message
offers it without that context. Commit your paths, or declare `--payload <path>`. **If the
uncovered list names files you did not write, stop and hand back.**
