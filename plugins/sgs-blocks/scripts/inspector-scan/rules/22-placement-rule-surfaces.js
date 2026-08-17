'use strict';

// GROUND-TRUTH: spec=.claude/decisions.md D537 (read verbatim 2026-08-09) +
// .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"THE PLACEMENT RULE".
// source=file evidence=the SURFACES list below was not derived from a guess: every
// entry is a file this session actually had to amend when D537 was propagated
// (commits f5a31435 + d4d6d687), verified by `git show --stat` on both.
//
// WHY THIS RULE EXISTS. D537 amended inspector placement to TWO TIERS. The decision
// was recorded in decisions.md and NOWHERE ELSE — nine live surfaces went on teaching
// the retired single-tier framing, including a wired scanner whose own `fix:` message
// operators read. Propagating it took two commits and a two-reviewer panel, and the
// panel still found a surface the first pass missed (placement-reach.py's printed
// OUTPUT, caught only because a reviewer grepped case-insensitively where the author
// had not).
//
// Nothing prevented that, and nothing prevented the next drift either: the rule was
// stated in prose and enforced by nobody. A /qc pass on 2026-08-09 named exactly this
// as the one open smell — "would you have to intervene again? on durability, yes".
// This rule closes it. It does NOT check that the wording is elegant; it checks that
// every surface which STATES the rule still states the CURRENT one.
//
// TWO ASSERTIONS, deliberately different in kind:
//   1. PRESENCE — each declared surface must carry the canonical token. Catches a
//      surface that was rewritten and quietly lost the rule altogether.
//   2. ABSENCE  — no surface may carry an ASSERTIVE retired phrase. The banned list is
//      closed and deliberately narrow: each entry is a phrase that cannot occur in a
//      NEGATED sentence, so "not a single catch-all block-level panel" (the correct
//      current wording, present in four files) does not trip it. A broader ban on
//      "block-level panel" would false-positive on every corrected surface — the exact
//      "gate's evidence predicate too broad to mean anything" trap.
//
// ⛔ ADDING A SURFACE: if you write a NEW file that states the placement rule, add it to
// placement-rule-surfaces.json. A surface absent from that manifest is unguarded, and
// that is the failure mode this rule exists to prevent — not a hypothetical one, it is
// what happened on 2026-08-09.
//
// The surface list is a committed MANIFEST rather than a constant in this file for one
// concrete reason: the manifest path is resolved from ctx.repoRoot, so the self-test's
// fixture supplies its OWN manifest naming fixture-local files. A hardcoded list could
// only ever have been exercised against the real tree, i.e. it could never be made to
// fail, which is the exact property this rule was built to eliminate.

const path = require( 'path' );
const fs = require( 'fs' );
const { makeFinding } = require( '../core/finding' );

const MANIFEST_REL = path.join(
	'plugins', 'sgs-blocks', 'scripts', 'inspector-scan', 'placement-rule-surfaces.json'
);

// PRESENCE: the canonical token. Case-insensitive on purpose — the 2026-08-09 miss was
// a case-sensitive grep against a line printed in capitals.
const CANONICAL_RE = /TWO[\s-]TIERS?|TIER\s*2/i;

// ABSENCE: assertive statements of the RETIRED framing. Closed list; each phrase is
// one that cannot appear inside a negation of itself.
const RETIRED = [
	{ re: /the panel the rule does not yet design/i, why: 'the block-level panel is designed — D537 resolved it as tier 2 (property-family)' },
	{ re: /takes?\s+a\s+block-level\s+panel/i, why: 'controls with no element resolve to a property-family panel, not one catch-all' },
	{ re: /block-level\s+panel,\s*grouped\s+per/i, why: 'grouping is by property family, not by the control type\'s Tab field' },
	// ⛔ DELIBERATELY NOT BANNED: "behaviour → Settings; appearance → Styles".
	// It was in this list for one run and was a FALSE POSITIVE on its only two hits,
	// both in spec-35-control-type-contract.md: an `amended:` header reading "amended
	// FROM 'behaviour → Settings...' to the element-scoped model", and a section
	// reading "The RETIRED rule was ...". A phrase that must be QUOTED in order to
	// record that it is retired cannot be banned by substring — the ban fires on the
	// documentation of the retirement itself. It also matched inconsistently: the four
	// extension files carry the same phrase but line-wrapped, so the regex missed them
	// while catching the contract, i.e. it was both over- and under-inclusive at once.
	// The three patterns above survive because each is an ASSERTIVE construction that
	// does not occur inside a negation of itself — proven by the
	// `surface-negates-retired-phrase` fixture, which carries the corrected wording
	// ("not a single catch-all block-level panel") and must NOT flag.
];

module.exports = {
	id: '22-placement-rule-surfaces',
	checklistItem: 22,
	title: 'Every surface stating THE PLACEMENT RULE states the current (two-tier) one',
	scope: 'global',
	needs: [ 'text:placement-rule-surfaces' ],
	run( ctx ) {
		const root = ctx.repoRoot;
		if ( ! root ) return [];

		const findings = [];
		const manifestPath = path.join( root, MANIFEST_REL );

		// The manifest is load-bearing: delete it and this rule silently guards
		// nothing while still reporting green. Treat its absence as a finding, not
		// as "no surfaces to check".
		if ( ! fs.existsSync( manifestPath ) ) {
			return [
				makeFinding( {
					rule: this.id,
					block: null,
					file: manifestPath,
					severity: 'warn',
					detail: 'placement-rule-surfaces.json is missing — this rule guards nothing without it, and would otherwise report clean while every surface drifts unchecked.',
					fix: 'Restore plugins/sgs-blocks/scripts/inspector-scan/placement-rule-surfaces.json listing every file that states THE PLACEMENT RULE.',
					keyParts: [ 'manifest-missing' ],
				} ),
			];
		}

		let surfaces;
		try {
			const parsed = JSON.parse( fs.readFileSync( manifestPath, 'utf8' ) );
			surfaces = Array.isArray( parsed.surfaces ) ? parsed.surfaces : [];
		} catch ( e ) {
			return [
				makeFinding( {
					rule: this.id,
					block: null,
					file: manifestPath,
					severity: 'warn',
					detail: `placement-rule-surfaces.json is unparseable (${ e.message }) — the surface list cannot be read, so nothing is guarded.`,
					fix: 'Fix the JSON syntax. The file shape is { "surfaces": [ "<repo-root-relative path>", ... ] }.',
					keyParts: [ 'manifest-unparseable' ],
				} ),
			];
		}

		for ( const rel of surfaces ) {
			const full = path.join( root, rel );

			// A declared surface that no longer exists is itself a finding: it was
			// renamed or deleted and its binding to this rule silently severed.
			if ( ! fs.existsSync( full ) ) {
				findings.push(
					makeFinding( {
						rule: this.id,
						block: null,
						file: full,
						severity: 'warn',
						detail: `Declared placement-rule surface "${ rel }" does not exist — it was renamed or deleted, so this rule no longer guards it and the drift it would have caught is now invisible.`,
						fix: `Update the SURFACES list in scripts/inspector-scan/rules/22-placement-rule-surfaces.js to the file's new path, or remove the entry if the surface genuinely no longer states the rule.`,
						keyParts: [ rel, 'missing' ],
					} )
				);
				continue;
			}

			const text = ctx.text( full );
			if ( text == null ) continue;

			if ( ! CANONICAL_RE.test( text ) ) {
				findings.push(
					makeFinding( {
						rule: this.id,
						block: null,
						file: full,
						severity: 'warn',
						detail: `"${ rel }" states the placement rule but carries no two-tier marker — it was rewritten and lost the rule, or now describes it in wording this gate cannot recognise.`,
						fix: 'State the rule as TWO TIERS: tier 1 the element, tier 2 the property-family (see .claude/decisions.md D537). Controls that style nothing take one Settings panel, pinned first.',
						keyParts: [ rel, 'no-canonical-token' ],
					} )
				);
			}

			for ( const { re, why } of RETIRED ) {
				const hit = text.match( re );
				if ( ! hit ) continue;
				findings.push(
					makeFinding( {
						rule: this.id,
						block: null,
						file: full,
						severity: 'warn',
						detail: `"${ rel }" asserts the RETIRED placement framing: "${ hit[ 0 ] }" — ${ why }.`,
						fix: 'Restate per D537 (.claude/decisions.md): tier 1 is the element, tier 2 is the property-family from cluster-member-sets.json. Controls that style nothing take one pinned Settings panel. A negated mention ("not a single catch-all block-level panel") is fine and is not what this flags.',
						keyParts: [ rel, 'retired-framing' ],
					} )
				);
			}
		}
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/22-placement-rule-surfaces',
		mustFlag: [ 'surface-states-retired-rule', 'surface-lost-the-rule' ],
		mustNotFlag: [ 'surface-states-current-rule', 'surface-negates-retired-phrase' ],
	},
};
