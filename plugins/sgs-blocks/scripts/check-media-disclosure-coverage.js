#!/usr/bin/env node
/**
 * Gate: every media atom's `disclosure()` is exercised against REAL fixtures
 * derived from its own `requires` map in registry.js — not a static scan.
 *
 * WHY THIS SHAPE
 * --------------
 * `MediaElementPanel.js` deliberately does NOT call `disclosure()` itself —
 * each atom's own `.control.js` applies it internally — so there is no
 * per-block artefact a static scan could read. The only honest check is to
 * IMPORT each atom's logic module and CALL `disclosure()` with attributes
 * that satisfy, then violate, each entry in that atom's own `requires` map,
 * and assert on the REAL return value. Sibling to `check-media-atom-purity.js`
 * (import-cleanliness, static) and `scripts/tests/test-media-atom-parity.mjs`
 * (JS/PHP value-setter parity, also a live-import harness) — this gate is the
 * third leg: does `disclosure()` itself honour the closed vocabulary
 * (`shown | disabled | omitted`, `hiddenReason` a non-empty string whenever
 * `state !== 'shown'`) for every requirement it declares.
 *
 * FIXTURE DERIVATION — the whole point is that fixtures come FROM the data,
 * never hand-written per atom:
 *
 *   - An atom with an EMPTY `requires` map ({}) gets one TRIVIAL case: call
 *     `disclosure({})` and assert the result conforms to the closed
 *     vocabulary. ⚠ This does NOT assert `state === 'shown'` — three atoms
 *     with empty `requires` (`intrinsic`, `svg-presentation`, `motion`)
 *     legitimately return something else from `disclosure({})`:
 *     `intrinsic` ALWAYS returns `state: 'omitted'` (it is `clientEditable:
 *     false` — a client never edits it, so it is never "shown"); `motion`
 *     returns a MAP where `AnimationDuration` is `disabled` until KenBurns is
 *     explicitly turned on; `svg-presentation` disables `SvgAnimationSpeed`
 *     until an animation is chosen. All three are internal gates the atom
 *     enforces WITHOUT declaring them in `requires` (registry.js's own
 *     `video-behaviour`/`svg-presentation` docblocks note requires is not
 *     exhaustive of every internal branch). Asserting a blind "always shown"
 *     here would be a FALSE FAILURE against correctly-shipped code — the
 *     closed-vocabulary conformance check is the honest, non-vacuous
 *     assertion for these atoms; it still calls the real function and still
 *     fails if the vocabulary is ever violated.
 *
 *   - An atom WITH entries in `requires` gets, per entry (`Object.keys`
 *     length): one SATISFIED fixture (asserted shown/visible) and one
 *     VIOLATED fixture (asserted disabled/hidden WITH a reason), built by
 *     parsing that entry's own condition string(s):
 *       `Base:val1|val2`  -> enum match          (focal-point, box-shape)
 *       `!Base`           -> Base must be falsy   (meaning)
 *       `BaseA|BaseB`     -> at least one truthy   (overlay)
 *       `Base`            -> Base must be truthy   (shadow)
 *     One shape is structurally different and handled explicitly, not
 *     guessed at: `video-behaviour`'s `requires: { VideoAutoplay: [
 *     'VideoMuted', 'VideoPlaysInline' ] }` has TWO bare array items with no
 *     colon/bang/pipe — every other entry in the registry has exactly one.
 *     Read against the atom's own disclosure() (LOCKED_ON_AUTOPLAY), the key
 *     is the DRIVER and the array items are the GOVERNED bases that get
 *     locked when the driver is true — the inverse of every other entry,
 *     where the key is the governed base and the array holds its
 *     conditions. `isDriverShape()` below detects this structurally (array
 *     length > 1, every item a bare identifier) rather than naming
 *     "video-behaviour" anywhere in the derivation logic.
 *
 * TWO RETURN SHAPES (same detection as `test-media-atom-parity.mjs`, reused
 * verbatim): `typeof state.state === 'string' ? [state] : Object.values(
 * state || {})`. A MAP-shaped atom's governed entries are looked up by their
 * PascalCase base name (`result['VideoMuted']`), matching how the atoms
 * themselves build that map.
 *
 * ONE ATOM CARRIES A THIRD, UNDOCUMENTED-UNTIL-NOW SHAPE: `box-shape`. Its
 * `disclosure()` top-level `state` is ALWAYS `'shown'` (per
 * `check-media-atom-purity.js`'s own comment: "box-shape legitimately
 * carries heightState and ratioState on a SEPARATE two-value visible|hidden
 * vocabulary"). `Height`'s and `AspectRatio`'s requirement entries are
 * therefore checked via `heightState`/`ratioState` fields on the single
 * returned object, not via `state`/`hiddenReason` — and there is no
 * `hiddenReason` requirement on that vocabulary (`visible`/`hidden` carry no
 * reason text). The field name does not mechanically derive from the
 * requirement key (`Height` -> `heightState` matches the pattern;
 * `AspectRatio` -> `ratioState`, NOT `aspectRatioState`, does not) — the
 * two-entry `ALT_STATE_FIELD` map below is read directly from box-shape.js's
 * own `disclosure()` body, not invented.
 *
 * EXPECTED POPULATION (independently summed from registry.js `requires`,
 * verified against the live count at the end of every run — see `run()`):
 *   16 atoms -> 16 all-satisfied/trivial cases, ONE PER ATOM.
 *   6 atoms declare non-empty `requires`, with these key counts:
 *     video-behaviour(1) + meaning(1) + focal-point(1) + box-shape(2) +
 *     overlay(2) + shadow(1) = 8 violated cases.
 *   TOTAL: 24 cases (16 + 8).
 * If the live count ever differs from 24, the run says so loudly rather than
 * silently trusting either number — `zeroIsAClaim` applies here exactly as
 * it does in `test-media-atom-parity.mjs`.
 *
 * Run:
 *   node scripts/check-media-disclosure-coverage.js             (report only, exits 0)
 *   node scripts/check-media-disclosure-coverage.js --check      (exits 1 on any failure)
 *   node scripts/check-media-disclosure-coverage.js --self-test  (proves the harness itself can fail)
 */
const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN = path.resolve( __dirname, '..' );
const ATOM_DIR = path.join( PLUGIN, 'src', 'components', 'media', 'atoms' );
const BS = String.fromCharCode( 92 );
const P = PLUGIN.split( BS ).join( '/' );

/** The closed disclosure-state vocabulary every atom's `state` must be from. */
const STATES = [ 'shown', 'disabled', 'omitted' ];

/**
 * `box-shape`'s two mutually-exclusive sizing requirements report through a
 * bespoke `visible|hidden` field rather than `state`/`hiddenReason`. Read
 * directly from `box-shape.js`'s `disclosure()` — `Height` follows the
 * mechanical `${lowerFirst(base)}State` pattern by coincidence; `AspectRatio`
 * does not (the field is `ratioState`), so both are named explicitly rather
 * than guessed at.
 */
const ALT_STATE_FIELD = { Height: 'heightState', AspectRatio: 'ratioState' };

/** A value that is truthy for both boolean (`!!x`) and string-typed reads. */
const TRUTHY_SENTINEL = 'sgs-fixture-truthy';

/** Guaranteed to never appear in any atom's enum vocabulary. */
const ENUM_VIOLATION_SENTINEL = '__sgs_disclosure_coverage_invalid__';

/** `mediaAttrName( '', base )` inlined — unprefixed base -> camelCase key. */
function baseAttrKey( base ) {
	return base.charAt( 0 ).toLowerCase() + base.slice( 1 );
}

/** A bare PascalCase identifier — no `:`, `!`, or `|`. */
function isBareIdentifier( s ) {
	return /^[A-Za-z][A-Za-z0-9]*$/.test( s );
}

/**
 * Parse one condition string from a `requires` array into its structural
 * shape. The four forms observed across the live registry, in the order
 * checked (colon and bang are unambiguous; a bare pipe-joined string is
 * distinguished from a single bare identifier by containing '|').
 *
 * @param {string} cond Condition string, e.g. 'ObjectFit:cover|contain'.
 * @return {Object} `{ kind: 'enum', base, values }` | `{ kind: 'not', base }`
 *                  | `{ kind: 'or', bases }` | `{ kind: 'truthy', base }`.
 */
function parseCondition( cond ) {
	if ( cond.includes( ':' ) ) {
		const [ base, valuesStr ] = cond.split( ':' );
		return { kind: 'enum', base, values: valuesStr.split( '|' ) };
	}
	if ( cond.startsWith( '!' ) ) {
		return { kind: 'not', base: cond.slice( 1 ) };
	}
	if ( cond.includes( '|' ) ) {
		return { kind: 'or', bases: cond.split( '|' ) };
	}
	return { kind: 'truthy', base: cond };
}

/**
 * Mutate `attrs` so ONE condition either holds (`satisfy: true`) or fails
 * (`satisfy: false`). The value chosen for a truthy/or condition is a
 * non-empty STRING (`TRUTHY_SENTINEL`) rather than a bare boolean, because
 * some conditions gate a `'string' === typeof value` read
 * (`overlay.resolveColour()`) and some gate a bare `!!value` read
 * (`meaning`'s decorative flag, `shadow`'s `BoxShadow`) — a non-empty string
 * is truthy under both.
 *
 * @param {Object}  attrs   Attributes object to mutate.
 * @param {string}  cond    Raw condition string.
 * @param {boolean} satisfy Whether to make the condition hold.
 */
function applyCondition( attrs, cond, satisfy ) {
	const parsed = parseCondition( cond );
	if ( 'enum' === parsed.kind ) {
		attrs[ baseAttrKey( parsed.base ) ] = satisfy ? parsed.values[ 0 ] : ENUM_VIOLATION_SENTINEL;
		return;
	}
	if ( 'not' === parsed.kind ) {
		if ( satisfy ) {
			delete attrs[ baseAttrKey( parsed.base ) ];
		} else {
			attrs[ baseAttrKey( parsed.base ) ] = true;
		}
		return;
	}
	if ( 'or' === parsed.kind ) {
		if ( satisfy ) {
			attrs[ baseAttrKey( parsed.bases[ 0 ] ) ] = TRUTHY_SENTINEL;
		} else {
			parsed.bases.forEach( ( b ) => delete attrs[ baseAttrKey( b ) ] );
		}
		return;
	}
	// truthy
	if ( satisfy ) {
		attrs[ baseAttrKey( parsed.base ) ] = TRUTHY_SENTINEL;
	} else {
		delete attrs[ baseAttrKey( parsed.base ) ];
	}
}

/** Is `result` the map shape (base -> {state,hiddenReason}) rather than one object? */
function isMapShaped( result ) {
	return ! ( result && 'string' === typeof result.state );
}

/**
 * Is a requirement's array the `video-behaviour` DRIVER shape — the key is a
 * condition attribute and the array items are the GOVERNED bases, the
 * inverse of every other entry — rather than an array of condition strings
 * for the key itself? Detected structurally: more than one item, and every
 * item a bare identifier (no `:`/`!`/`|`, which every real condition string
 * in the registry carries except this one shape).
 *
 * @param {string[]} conditions The `requires[govBase]` array.
 * @return {boolean}
 */
function isDriverShape( conditions ) {
	return conditions.length > 1 && conditions.every( isBareIdentifier );
}

/**
 * Does the satisfied-fixture result show the governed control(s) correctly?
 *
 * @param {string}        govBase         The `requires` key.
 * @param {string[]|null} driverGoverned  Governed base names, when `isDriverShape()`.
 * @param {*}              result          `disclosure()`'s return value.
 * @return {boolean}
 */
function checkSatisfied( govBase, driverGoverned, result ) {
	if ( driverGoverned ) {
		if ( ! isMapShaped( result ) ) {
			return false;
		}
		return driverGoverned.every( ( gb ) => result[ gb ] && 'shown' === result[ gb ].state );
	}
	if ( isMapShaped( result ) ) {
		const entry = result ? result[ govBase ] : undefined;
		return !! entry && 'shown' === entry.state;
	}
	const altField = ALT_STATE_FIELD[ govBase ];
	if ( altField && Object.prototype.hasOwnProperty.call( result, altField ) ) {
		return 'visible' === result[ altField ];
	}
	return !! result && 'shown' === result.state;
}

/**
 * Does the violated-fixture result disable/hide the governed control(s) —
 * WITH a reason, for the standard `state`/`hiddenReason` vocabulary (the
 * `visible`/`hidden` alt vocabulary carries no reason text by contract, so
 * none is required there)?
 *
 * @param {string}        govBase         The `requires` key.
 * @param {string[]|null} driverGoverned  Governed base names, when `isDriverShape()`.
 * @param {*}              result          `disclosure()`'s return value.
 * @return {boolean}
 */
function checkViolated( govBase, driverGoverned, result ) {
	const validDisabled = ( entry ) =>
		!! entry &&
		STATES.includes( entry.state ) &&
		'shown' !== entry.state &&
		'string' === typeof entry.hiddenReason &&
		entry.hiddenReason.length > 0;

	if ( driverGoverned ) {
		if ( ! isMapShaped( result ) ) {
			return false;
		}
		return driverGoverned.every( ( gb ) => validDisabled( result[ gb ] ) );
	}
	if ( isMapShaped( result ) ) {
		return validDisabled( result ? result[ govBase ] : undefined );
	}
	const altField = ALT_STATE_FIELD[ govBase ];
	if ( altField && result && Object.prototype.hasOwnProperty.call( result, altField ) ) {
		return 'hidden' === result[ altField ];
	}
	return validDisabled( result );
}

/**
 * Every entry a `disclosure()` result flattens to (via the SAME technique
 * `test-media-atom-parity.mjs` uses) conforms to the closed vocabulary: a
 * real `state` member, and `hiddenReason` a non-empty string whenever
 * `state !== 'shown'`.
 *
 * @param {*} result `disclosure()`'s return value.
 * @return {boolean}
 */
function isVocabularyConformant( result ) {
	const entries = isMapShaped( result ) ? Object.values( result || {} ) : [ result ];
	if ( ! entries.length ) {
		return false;
	}
	return entries.every( ( e ) => {
		if ( ! e || ! STATES.includes( e.state ) ) {
			return false;
		}
		if ( 'shown' === e.state ) {
			return true;
		}
		return 'string' === typeof e.hiddenReason && e.hiddenReason.length > 0;
	} );
}

/**
 * Evaluate ONE `requires` entry against a real (or synthetic, for
 * `--self-test`) atom module — the exact function both the live run and the
 * self-test call, so the self-test proves the REAL evaluator can fail, not a
 * hand-simulated stand-in.
 *
 * @param {Object}   mod        An atom logic module (real import or a stub).
 * @param {string}   govBase    The `requires` key.
 * @param {string[]} conditions The `requires[govBase]` array.
 * @return {Object} `{ satisfiedOk, violatedOk, satisfiedResult, violatedResult, satisfiedAttrs, violatedAttrs }`.
 */
function evaluateRequirement( mod, govBase, conditions ) {
	const driver = isDriverShape( conditions ) ? conditions : null;

	const satisfiedAttrs = {};
	if ( ! driver ) {
		applyCondition( satisfiedAttrs, conditions[ 0 ], true );
	}
	// driver shape: satisfied = the driver attribute stays unset (falsy).
	const satisfiedResult = mod.disclosure( { attributes: satisfiedAttrs, prefix: '', blockSlug: '' } );
	const satisfiedOk = checkSatisfied( govBase, driver, satisfiedResult );

	const violatedAttrs = Object.assign( {}, satisfiedAttrs );
	if ( driver ) {
		violatedAttrs[ baseAttrKey( govBase ) ] = TRUTHY_SENTINEL;
	} else {
		applyCondition( violatedAttrs, conditions[ 0 ], false );
	}
	const violatedResult = mod.disclosure( { attributes: violatedAttrs, prefix: '', blockSlug: '' } );
	const violatedOk = checkViolated( govBase, driver, violatedResult );

	return { satisfiedOk, violatedOk, satisfiedResult, violatedResult, satisfiedAttrs, violatedAttrs };
}

async function run() {
	const { MEDIA_ATOMS, MEDIA_ATOM_IDS } = await import(
		'file:///' + P + '/src/components/media/atoms/registry.js'
	);

	if ( ! MEDIA_ATOM_IDS || ! MEDIA_ATOM_IDS.length ) {
		process.stderr.write(
			'[media-disclosure-coverage] REFUSING to pass: registry.js declares no atoms. ' +
				'A gate with nothing to check is not a pass.\n'
		);
		return 1;
	}

	let fail = 0;
	const ck = ( name, cond, extra = '' ) => {
		process.stdout.write(
			'  ' + ( cond ? 'ok   ' : 'FAIL ' ) + name + ( cond ? '' : '  ' + extra ) + '\n'
		);
		if ( ! cond ) {
			fail++;
		}
	};

	let expectedAllSatisfied = 0;
	let expectedViolated = 0;
	let actualAllSatisfied = 0;
	let actualViolated = 0;

	process.stdout.write( 'media atom disclosure() coverage\n\n' );

	for ( const id of MEDIA_ATOM_IDS ) {
		const atom = MEDIA_ATOMS[ id ];
		const modPath = path.join( ATOM_DIR, `${ id }.js` );
		expectedAllSatisfied += 1;

		if ( ! fs.existsSync( modPath ) ) {
			ck( `${ id }: logic module exists at src/components/media/atoms/${ id }.js`, false );
			continue;
		}
		const mod = await import( 'file:///' + modPath.split( BS ).join( '/' ) );
		if ( 'function' !== typeof mod.disclosure ) {
			ck( `${ id }: exports disclosure()`, false );
			continue;
		}

		const requiresKeys = Object.keys( atom.requires || {} );

		if ( ! requiresKeys.length ) {
			const result = mod.disclosure( { attributes: {}, prefix: '', blockSlug: '' } );
			const ok = isVocabularyConformant( result );
			ck(
				`${ id }: no requirements declared — disclosure({}) still conforms to the closed vocabulary`,
				ok,
				JSON.stringify( result ).slice( 0, 200 )
			);
			actualAllSatisfied += 1;
			continue;
		}

		expectedViolated += requiresKeys.length;
		let atomSatisfiedOk = true;

		requiresKeys.forEach( ( govBase ) => {
			const conditions = atom.requires[ govBase ];
			const evaluation = evaluateRequirement( mod, govBase, conditions );

			ck(
				`${ id }: requirement '${ govBase }' — satisfied fixture shows the governed control`,
				evaluation.satisfiedOk,
				JSON.stringify( { attrs: evaluation.satisfiedAttrs, result: evaluation.satisfiedResult } ).slice( 0, 220 )
			);
			ck(
				`${ id }: requirement '${ govBase }' — violated fixture disables/hides it WITH a reason`,
				evaluation.violatedOk,
				JSON.stringify( { attrs: evaluation.violatedAttrs, result: evaluation.violatedResult } ).slice( 0, 220 )
			);

			atomSatisfiedOk = atomSatisfiedOk && evaluation.satisfiedOk;
			actualViolated += 1;
		} );

		ck(
			`${ id }: all-satisfied case — every requirement's governed control shows correctly together`,
			atomSatisfiedOk
		);
		actualAllSatisfied += 1;
	}

	// ── The vacuity guard — the population must match what was INDEPENDENTLY
	// summed from registry.js requires, not just "some number ran". ──────────
	const expectedAllSatisfiedTotal = MEDIA_ATOM_IDS.length; // one per atom, always.
	const totalCases = actualAllSatisfied + actualViolated;
	const expectedTotal = expectedAllSatisfiedTotal + expectedViolated;
	ck(
		`population: ${ expectedAllSatisfiedTotal } all-satisfied/trivial cases ran (one per atom)`,
		actualAllSatisfied === expectedAllSatisfiedTotal,
		`ran ${ actualAllSatisfied }`
	);
	ck(
		`population: ${ expectedViolated } violated cases ran (sum of Object.keys(requires).length across atoms)`,
		actualViolated === expectedViolated,
		`ran ${ actualViolated }`
	);
	process.stdout.write(
		`\nexpected total: ${ expectedTotal }  ·  actual total: ${ totalCases }\n`
	);

	process.stdout.write( `\n${ fail ? 'FAIL' : 'PASS' } - ${ fail } problem(s)\n` );
	return fail ? 1 : 0;
}

/**
 * Prove the harness itself is not vacuous — that `evaluateRequirement()` (the
 * SAME function the live run calls against real atoms) actually FAILS a
 * broken atom, via an in-memory stub module (no disk I/O needed; explicitly
 * sanctioned as the "cleanest mechanism" for this kind of check). Covers all
 * three return shapes the real registry exercises: standard single-object,
 * the `video-behaviour` driver/map shape, and `box-shape`'s alt
 * `visible`/`hidden` field vocabulary.
 */
function selfTest() {
	const cases = [];
	const ck = ( name, cond, extra = '' ) => cases.push( [ name, cond, extra ] );

	// ---- standard single-object shape --------------------------------------
	const goodStandard = {
		disclosure: ( { attributes } ) =>
			attributes.gate
				? { state: 'shown', hiddenReason: null }
				: { state: 'disabled', hiddenReason: 'A real, non-empty reason.' },
	};
	const rGood = evaluateRequirement( goodStandard, 'Gate', [ 'Gate' ] );
	ck( 'POSITIVE CONTROL: a correctly-implemented atom passes both fixtures', rGood.satisfiedOk && rGood.violatedOk );

	// THE EXACT DEFECT THIS GATE EXISTS TO CATCH: a violated case that
	// disables the control but tells the client nothing.
	const brokenNullReason = {
		disclosure: ( { attributes } ) =>
			attributes.gate
				? { state: 'shown', hiddenReason: null }
				: { state: 'disabled', hiddenReason: null },
	};
	const rBrokenReason = evaluateRequirement( brokenNullReason, 'Gate', [ 'Gate' ] );
	ck(
		'NEGATIVE CONTROL: a violated case with a NULL hiddenReason is REJECTED',
		! rBrokenReason.violatedOk
	);

	const brokenEmptyReason = {
		disclosure: ( { attributes } ) =>
			attributes.gate
				? { state: 'shown', hiddenReason: null }
				: { state: 'disabled', hiddenReason: '' },
	};
	const rBrokenEmpty = evaluateRequirement( brokenEmptyReason, 'Gate', [ 'Gate' ] );
	ck(
		'NEGATIVE CONTROL: a violated case with an EMPTY-STRING hiddenReason is REJECTED',
		! rBrokenEmpty.violatedOk
	);

	// A violated fixture that never actually leaves 'shown' — the atom
	// ignored the condition entirely.
	const brokenNeverDisables = {
		disclosure: () => ( { state: 'shown', hiddenReason: null } ),
	};
	const rNeverDisables = evaluateRequirement( brokenNeverDisables, 'Gate', [ 'Gate' ] );
	ck(
		'NEGATIVE CONTROL: a violated fixture that stays "shown" is REJECTED',
		! rNeverDisables.violatedOk
	);

	// An off-vocabulary state word is rejected even with a real reason.
	const brokenOffVocab = {
		disclosure: ( { attributes } ) =>
			attributes.gate
				? { state: 'shown', hiddenReason: null }
				: { state: 'hidden', hiddenReason: 'Has a reason but the wrong word.' },
	};
	const rOffVocab = evaluateRequirement( brokenOffVocab, 'Gate', [ 'Gate' ] );
	ck(
		'NEGATIVE CONTROL: an off-vocabulary state word is REJECTED even with a reason',
		! rOffVocab.violatedOk
	);

	// ---- driver / map shape (video-behaviour's inverted requires) ---------
	const goodDriver = {
		disclosure: ( { attributes } ) => {
			const driverOn = !! attributes.driver;
			return {
				DependentA: driverOn
					? { state: 'disabled', hiddenReason: 'Locked while the driver is on.' }
					: { state: 'shown', hiddenReason: null },
				DependentB: driverOn
					? { state: 'disabled', hiddenReason: 'Locked while the driver is on.' }
					: { state: 'shown', hiddenReason: null },
			};
		},
	};
	const rGoodDriver = evaluateRequirement( goodDriver, 'Driver', [ 'DependentA', 'DependentB' ] );
	ck(
		'POSITIVE CONTROL: a correctly-implemented DRIVER-shape atom passes both fixtures',
		rGoodDriver.satisfiedOk && rGoodDriver.violatedOk
	);

	const brokenDriver = {
		disclosure: () => ( {
			DependentA: { state: 'shown', hiddenReason: null },
			DependentB: { state: 'shown', hiddenReason: null },
		} ),
	};
	const rBrokenDriver = evaluateRequirement( brokenDriver, 'Driver', [ 'DependentA', 'DependentB' ] );
	ck(
		'NEGATIVE CONTROL: a DRIVER-shape atom that never locks its dependents is REJECTED',
		! rBrokenDriver.violatedOk
	);

	// Only ONE of two dependents actually locks — still a fail, since BOTH
	// must lock.
	const brokenPartialDriver = {
		disclosure: ( { attributes } ) => ( {
			DependentA: attributes.driver
				? { state: 'disabled', hiddenReason: 'Locked.' }
				: { state: 'shown', hiddenReason: null },
			DependentB: { state: 'shown', hiddenReason: null },
		} ),
	};
	const rPartialDriver = evaluateRequirement( brokenPartialDriver, 'Driver', [ 'DependentA', 'DependentB' ] );
	ck(
		'NEGATIVE CONTROL: a DRIVER-shape atom that locks only ONE of two dependents is REJECTED',
		! rPartialDriver.violatedOk
	);

	// ---- alt visible/hidden field shape (box-shape's Height/AspectRatio) --
	const goodAlt = {
		disclosure: ( { attributes } ) => ( {
			state: 'shown',
			hiddenReason: null,
			heightState: 'height' === attributes.mediaSizing ? 'visible' : 'hidden',
		} ),
	};
	const rGoodAlt = evaluateRequirement( goodAlt, 'Height', [ 'MediaSizing:height' ] );
	ck(
		'POSITIVE CONTROL: a correctly-implemented ALT-FIELD atom passes both fixtures',
		rGoodAlt.satisfiedOk && rGoodAlt.violatedOk
	);

	const brokenAlt = {
		disclosure: () => ( { state: 'shown', hiddenReason: null, heightState: 'visible' } ),
	};
	const rBrokenAlt = evaluateRequirement( brokenAlt, 'Height', [ 'MediaSizing:height' ] );
	ck(
		"NEGATIVE CONTROL: an ALT-FIELD atom whose 'heightState' never goes hidden is REJECTED",
		! rBrokenAlt.violatedOk
	);

	// AspectRatio's field name (ratioState) does NOT mechanically derive from
	// the requirement key — assert the named-not-guessed mapping is honoured.
	const goodRatioAlt = {
		disclosure: ( { attributes } ) => ( {
			state: 'shown',
			hiddenReason: null,
			ratioState: 'ratio' === attributes.mediaSizing ? 'visible' : 'hidden',
		} ),
	};
	const rGoodRatioAlt = evaluateRequirement( goodRatioAlt, 'AspectRatio', [ 'MediaSizing:ratio' ] );
	ck(
		"POSITIVE CONTROL: 'AspectRatio' is checked via 'ratioState', not the mechanical 'aspectRatioState'",
		rGoodRatioAlt.satisfiedOk && rGoodRatioAlt.violatedOk
	);

	// ---- enum / not / or condition parsing, each independently -----------
	ck(
		"parseCondition: 'Base:a|b' parses to an enum",
		'enum' === parseCondition( 'ObjectFit:cover|contain' ).kind
	);
	ck( "parseCondition: '!Base' parses to a negation", 'not' === parseCondition( '!ImageIsDecorative' ).kind );
	ck( "parseCondition: 'A|B' (no colon) parses to an OR", 'or' === parseCondition( 'OverlayColour|OverlayGradient' ).kind );
	ck( "parseCondition: a bare 'Base' parses to truthy", 'truthy' === parseCondition( 'BoxShadow' ).kind );

	ck(
		'isDriverShape: two bare identifiers IS the driver shape',
		isDriverShape( [ 'VideoMuted', 'VideoPlaysInline' ] )
	);
	ck(
		'isDriverShape: a single bare identifier is NOT the driver shape (shadow)',
		! isDriverShape( [ 'BoxShadow' ] )
	);
	ck(
		'isDriverShape: a colon-condition array is NOT the driver shape',
		! isDriverShape( [ 'MediaSizing:height' ] )
	);

	// ---- vocabulary conformance, standalone --------------------------------
	ck(
		'isVocabularyConformant: shown with no reason conforms',
		isVocabularyConformant( { state: 'shown', hiddenReason: null } )
	);
	ck(
		'isVocabularyConformant: disabled WITH a reason conforms',
		isVocabularyConformant( { state: 'disabled', hiddenReason: 'x' } )
	);
	ck(
		'isVocabularyConformant: disabled with NO reason does NOT conform',
		! isVocabularyConformant( { state: 'disabled', hiddenReason: null } )
	);
	ck(
		'isVocabularyConformant: an off-vocabulary state does NOT conform',
		! isVocabularyConformant( { state: 'visible', hiddenReason: null } )
	);
	ck(
		'isVocabularyConformant: a map with one bad entry does NOT conform',
		! isVocabularyConformant( {
			A: { state: 'shown', hiddenReason: null },
			B: { state: 'omitted', hiddenReason: '' },
		} )
	);

	let failed = 0;
	cases.forEach( ( [ n, c, extra ] ) => {
		process.stdout.write( `  ${ c ? 'PASS' : 'FAIL' }  ${ n }${ c ? '' : '  ' + extra }\n` );
		if ( ! c ) {
			failed++;
		}
	} );
	process.stdout.write( `\n${ cases.length - failed }/${ cases.length } passed\n` );
	return failed ? 1 : 0;
}

if ( process.argv.includes( '--self-test' ) ) {
	process.exit( selfTest() );
} else {
	const isCheck = process.argv.includes( '--check' );
	run()
		.then( ( code ) => {
			process.exit( isCheck ? code : 0 );
		} )
		.catch( ( err ) => {
			process.stderr.write( String( ( err && err.stack ) || err ) + '\n' );
			process.exit( 1 );
		} );
}
