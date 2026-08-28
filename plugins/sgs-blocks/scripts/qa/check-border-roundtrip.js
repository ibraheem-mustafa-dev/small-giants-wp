#!/usr/bin/env node
'use strict';

/**
 * Border round-trip probe — does the FRONTEND actually paint the border the
 * block's `borderWidth` / `borderStyle` / `borderColour` attributes describe?
 *
 * Built for the SgsBorderControl rollout. One run covers a LIST of blocks.
 *
 * Per block it authors TWO instances on one disposable probe page:
 *   (a) POSITIVE         — width 4px, borderStyle "solid", borderColour <slug>
 *   (b) NEGATIVE CONTROL — the SAME width and colour, borderStyle "none"
 *
 * The negative control is the load-bearing half. Without it, a block whose
 * theme paints a border for unrelated reasons reads as a PASS and the probe
 * proves nothing about the attributes. The control must paint NO border.
 *
 * ⛔ NEVER fabricate a PASS.
 * ⛔ FAIL CLOSED. The colour harness this is modelled on
 *    (check-colour-editor-roundtrip.js) calls process.exit(0) when Playwright
 *    is missing unless --check was passed — a green run on a machine with no
 *    browser. This script does NOT do that: a missing browser, missing
 *    credentials, or ANY assertion that could not run reports NOT RUN and
 *    exits NON-ZERO in every mode.
 *
 * Usage:
 *   node scripts/qa/check-border-roundtrip.js --blocks sgs/button,sgs/container
 *   node scripts/qa/check-border-roundtrip.js --blocks sgs/quote --check
 *   node scripts/qa/check-border-roundtrip.js --self-test
 */

const fs = require( 'fs' );
const path = require( 'path' );

const SRC_BLOCKS = path.resolve( __dirname, '../../src/blocks' );
const ENV_PATH = path.resolve( __dirname, '../../../../.claude/secrets/sandybrown.env' );

// A slug that EXISTS in the palette. `secondary` does not — it computes to
// rgba(0,0,0,0) and reads exactly like a broken layer.
const SLUG = 'primary';
const PROBE_WIDTH = '4px';
const ON_STYLE = 'solid';
const OFF_STYLE = 'none';
const REQUIRED_ATTRS = [ 'borderWidth', 'borderStyle', 'borderColour' ];

/* -------------------------------------------------------------------------
 * Pure, offline-testable core. Everything below the self-test is network.
 * ---------------------------------------------------------------------- */

/**
 * @param {string[]} argv Raw process.argv.slice( 2 ).
 * @return {{blocks: string[], check: boolean, selfTest: boolean}} Parsed CLI.
 */
function parseArgs( argv ) {
	const out = { blocks: [], check: false, selfTest: false };
	for ( let i = 0; i < argv.length; i++ ) {
		if ( argv[ i ] === '--check' ) {
			out.check = true;
		} else if ( argv[ i ] === '--self-test' ) {
			out.selfTest = true;
		} else if ( argv[ i ] === '--blocks' ) {
			out.blocks = String( argv[ ++i ] || '' )
				.split( ',' )
				.map( ( s ) => s.trim() )
				.filter( Boolean );
		} else if ( argv[ i ].startsWith( '--blocks=' ) ) {
			out.blocks = argv[ i ]
				.slice( '--blocks='.length )
				.split( ',' )
				.map( ( s ) => s.trim() )
				.filter( Boolean );
		}
	}
	return out;
}

/**
 * Turn `sgs/button` into the on-disk block directory name.
 *
 * @param {string} slug Block slug.
 * @return {string} Directory name.
 */
function blockDirName( slug ) {
	return slug.includes( '/' ) ? slug.split( '/' ).pop() : slug;
}

/**
 * Read a block's own block.json. Attribute names and the borderStyle enum are
 * ALWAYS read from here — never hardcoded per block. The rollout is renaming
 * and re-enumerating attributes as it goes; a hardcoded table would measure
 * yesterday's contract.
 *
 * @param {string} slug Block slug, e.g. "sgs/button".
 * @return {Object|null} Parsed block.json, or null if absent.
 */
function readBlockJson( slug ) {
	const p = path.join( SRC_BLOCKS, blockDirName( slug ), 'block.json' );
	if ( ! fs.existsSync( p ) ) {
		return null;
	}
	return JSON.parse( fs.readFileSync( p, 'utf8' ) );
}

/**
 * Decide whether a block is probeable, and derive its probe values from its
 * OWN declared schema.
 *
 * A block that does not declare all three of borderWidth / borderStyle /
 * borderColour is SKIPPED — reported as skipped, never as passed. A skipped
 * assertion counted as a pass is worse than no gate at all.
 *
 * @param {string}      slug      Block slug.
 * @param {Object|null} blockJson Parsed block.json, or null.
 * @return {Object} { slug, ok, reason?, onStyle?, offStyle?, contentAttr? }
 */
function classifyBlock( slug, blockJson ) {
	if ( ! blockJson ) {
		return { slug, ok: false, reason: `no block.json at src/blocks/${ blockDirName( slug ) }/` };
	}
	const attrs = blockJson.attributes || {};
	const missing = REQUIRED_ATTRS.filter( ( a ) => ! attrs[ a ] );
	if ( missing.length ) {
		return {
			slug,
			ok: false,
			reason: `block.json does not declare ${ missing.join( ', ' ) } — not migrated to SgsBorderControl`,
		};
	}
	if ( attrs.borderWidth.type !== 'object' ) {
		return { slug, ok: false, reason: `borderWidth is type "${ attrs.borderWidth.type }", expected object` };
	}
	if ( attrs.borderStyle.type !== 'string' ) {
		return { slug, ok: false, reason: `borderStyle is type "${ attrs.borderStyle.type }", expected string` };
	}

	// The enum, when declared, is the contract. WP silently coerces an
	// out-of-enum value to the attribute default, so a probe that sent an
	// unlisted value would measure the DEFAULT and report a mystery failure.
	const en = attrs.borderStyle.enum;
	if ( Array.isArray( en ) ) {
		if ( ! en.includes( ON_STYLE ) ) {
			return {
				slug,
				ok: false,
				reason: `borderStyle enum does not allow "${ ON_STYLE }": ${ JSON.stringify( en ) }`,
			};
		}
		if ( ! en.includes( OFF_STYLE ) ) {
			return {
				slug,
				ok: false,
				reason: `borderStyle enum has no off value "${ OFF_STYLE }": ${ JSON.stringify( en ) }`,
			};
		}
	}

	// Give the block something to paint around where it takes plain text.
	let contentAttr = null;
	for ( const cand of [ 'content', 'text', 'label', 'heading' ] ) {
		if ( attrs[ cand ] && attrs[ cand ].type === 'string' ) {
			contentAttr = cand;
			break;
		}
	}

	return { slug, ok: true, onStyle: ON_STYLE, offStyle: OFF_STYLE, contentAttr };
}

/**
 * Does this block nest InnerBlocks? A self-closing comment on an InnerBlocks
 * block renders an empty wrapper; we want a child so there is a box to border.
 *
 * @param {string} slug Block slug.
 * @return {boolean} True when the block's editor code uses InnerBlocks.
 */
function usesInnerBlocks( slug ) {
	const dir = path.join( SRC_BLOCKS, blockDirName( slug ) );
	for ( const f of [ 'edit.js', 'index.js', 'save.js' ] ) {
		const p = path.join( dir, f );
		if ( fs.existsSync( p ) && /InnerBlocks|useInnerBlocksProps/.test( fs.readFileSync( p, 'utf8' ) ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Build the block-comment markup for one instance.
 *
 * ⛔ Attributes are serialised with JSON.stringify — never hand-escaped into
 * the comment. Hand-escaping is how a probe ends up asserting against markup
 * WordPress parsed differently from what the author intended.
 *
 * @param {string}  slug       Block slug.
 * @param {Object}  attrs      Attribute object.
 * @param {boolean} innerBlock Whether to nest a child block.
 * @return {string} Serialised block markup.
 */
function buildInstanceMarkup( slug, attrs, innerBlock ) {
	const json = JSON.stringify( attrs );
	if ( ! innerBlock ) {
		return `<!-- wp:${ slug } ${ json } /-->`;
	}
	return (
		`<!-- wp:${ slug } ${ json } -->\n` +
		'<!-- wp:sgs/text {"content":"border probe"} /-->\n' +
		`<!-- /wp:${ slug } -->`
	);
}

/**
 * Attribute payloads for one block's positive instance and negative control.
 *
 * @param {Object} cls classifyBlock() result (ok:true).
 * @return {{positive: Object, negative: Object}} Attribute payloads.
 */
function buildAttrPair( cls ) {
	const width = { top: PROBE_WIDTH, right: PROBE_WIDTH, bottom: PROBE_WIDTH, left: PROBE_WIDTH };
	const base = { borderWidth: width, borderColour: SLUG };
	const positive = Object.assign( {}, base, { borderStyle: cls.onStyle } );
	const negative = Object.assign( {}, base, { borderStyle: cls.offStyle } );
	if ( cls.contentAttr ) {
		positive[ cls.contentAttr ] = 'border probe POSITIVE';
		negative[ cls.contentAttr ] = 'border probe NEGATIVE CONTROL';
	}
	return { positive, negative };
}

/**
 * Full markup for one block: positive instance then negative control, in that
 * DOM order. The reader below keys on document order, so the order here is
 * load-bearing.
 *
 * @param {string} slug Block slug.
 * @param {Object} cls  classifyBlock() result.
 * @return {string} Markup for both instances.
 */
function buildBlockMarkup( slug, cls ) {
	const { positive, negative } = buildAttrPair( cls );
	const inner = usesInnerBlocks( slug );
	return buildInstanceMarkup( slug, positive, inner ) + '\n' + buildInstanceMarkup( slug, negative, inner );
}

/**
 * Judge one block from measured computed styles.
 *
 * Kept pure so --self-test can feed it a fabricated failing measurement and
 * prove the fail path actually fails. A checker only ever observed passing is
 * indistinguishable from a checker that cannot fail.
 *
 * @param {Object}      m              Measurement.
 * @param {Object|null} m.positive     { width, style, color } or null.
 * @param {Object|null} m.negative     { width, style, color } or null.
 * @param {string}      expectedColour Resolved rgb() for the palette slug.
 * @return {{status: string, detail: string}} Verdict.
 */
function judgeBlock( m, expectedColour ) {
	if ( ! m || ! m.positive || ! m.negative ) {
		return {
			status: 'NOT RUN',
			detail:
				'could not measure both instances on the page ' +
				`(positive=${ m && m.positive ? 'found' : 'MISSING' }, ` +
				`negative=${ m && m.negative ? 'found' : 'MISSING' }).`,
		};
	}
	if ( ! expectedColour || expectedColour === 'rgba(0, 0, 0, 0)' ) {
		return {
			status: 'NOT RUN',
			detail: `palette slug "${ SLUG }" resolved to ${ expectedColour } on the page — no usable expected colour.`,
		};
	}

	const p = m.positive;
	const n = m.negative;
	const fails = [];

	if ( p.width !== PROBE_WIDTH ) {
		fails.push( `positive border-top-width = ${ p.width }, expected ${ PROBE_WIDTH }` );
	}
	if ( p.style !== ON_STYLE ) {
		fails.push( `positive border-style = ${ p.style }, expected ${ ON_STYLE }` );
	}
	if ( p.color !== expectedColour ) {
		fails.push(
			`positive border-color = ${ p.color }, expected ${ expectedColour } ("${ SLUG }" resolved live)`
		);
	}

	// CSS forces a used width of 0px when border-style is none, so BOTH must
	// hold for the control to count as unpainted.
	if ( n.style !== 'none' ) {
		fails.push(
			`NEGATIVE CONTROL border-style = ${ n.style }, expected none — the control is painting a border`
		);
	}
	if ( n.width !== '0px' ) {
		fails.push(
			`NEGATIVE CONTROL border-top-width = ${ n.width }, expected 0px — the control is painting a border`
		);
	}

	const observed =
		`positive[${ p.width } ${ p.style } ${ p.color }] · ` +
		`control[${ n.width } ${ n.style } ${ n.color }] · expected colour ${ expectedColour }`;

	if ( fails.length ) {
		return { status: 'FAIL', detail: `${ fails.join( '; ' ) }. Observed: ${ observed }` };
	}
	return { status: 'PASS', detail: `border painted from attributes, control clean. Observed: ${ observed }` };
}

/* -------------------------------------------------------------------------
 * Self-test — offline, no network, no third-party module.
 * ---------------------------------------------------------------------- */

function selfTest() {
	const checks = [];
	const assert = ( name, cond, extra ) => {
		checks.push( { name, ok: !! cond, extra: extra || '' } );
	};

	// 1. The markup builder emits parseable JSON in EVERY block comment.
	const cls = {
		slug: 'sgs/probe',
		ok: true,
		onStyle: ON_STYLE,
		offStyle: OFF_STYLE,
		contentAttr: 'content',
	};
	for ( const inner of [ false, true ] ) {
		const pair = buildAttrPair( cls );
		const markup =
			buildInstanceMarkup( 'sgs/probe', pair.positive, inner ) +
			'\n' +
			buildInstanceMarkup( 'sgs/probe', pair.negative, inner );
		const comments = markup.match( /<!-- wp:[^\s]+ (\{.*?\}) \/?-->/g ) || [];
		let allParsed = comments.length >= 2;
		const parsedStyles = [];
		for ( const c of comments ) {
			const j = c.match( /<!-- wp:[^\s]+ (\{.*\}) \/?-->/ );
			try {
				parsedStyles.push( JSON.parse( j[ 1 ] ).borderStyle );
			} catch ( e ) {
				allParsed = false;
			}
		}
		assert(
			`markup builder emits parseable JSON in every block comment (innerBlocks=${ inner })`,
			allParsed && parsedStyles.includes( ON_STYLE ) && parsedStyles.includes( OFF_STYLE ),
			`comments=${ comments.length } styles=${ JSON.stringify( parsedStyles ) }`
		);
	}

	// 2. Width/colour are IDENTICAL across the pair; only style differs.
	const pair = buildAttrPair( cls );
	assert(
		'negative control differs from positive ONLY in borderStyle',
		JSON.stringify( pair.positive.borderWidth ) === JSON.stringify( pair.negative.borderWidth ) &&
			pair.positive.borderColour === pair.negative.borderColour &&
			pair.positive.borderStyle !== pair.negative.borderStyle
	);

	// 3. A block missing a required attribute is SKIPPED, not PASSED.
	const missing = classifyBlock( 'sgs/fake', {
		attributes: { borderWidth: { type: 'object' }, borderStyle: { type: 'string' } },
	} );
	assert( 'block missing borderColour is classified SKIPPED (ok:false)', missing.ok === false, missing.reason );

	// 4. A block with no block.json at all is SKIPPED.
	const absent = classifyBlock( 'sgs/does-not-exist-anywhere', null );
	assert( 'block with no block.json is classified SKIPPED', absent.ok === false, absent.reason );

	// 5. An enum that forbids "solid" is SKIPPED, not silently coerced.
	const badEnum = classifyBlock( 'sgs/fake', {
		attributes: {
			borderWidth: { type: 'object' },
			borderStyle: { type: 'string', enum: [ 'none', 'dashed' ] },
			borderColour: { type: 'string' },
		},
	} );
	assert( 'borderStyle enum without "solid" is classified SKIPPED', badEnum.ok === false, badEnum.reason );

	// 6. A fully-declared block IS probeable.
	const good = classifyBlock( 'sgs/fake', {
		attributes: {
			borderWidth: { type: 'object' },
			borderStyle: { type: 'string', enum: [ 'none', 'solid' ] },
			borderColour: { type: 'string' },
			content: { type: 'string' },
		},
	} );
	assert(
		'fully-declared block is probeable and picks a content attr',
		good.ok === true && good.contentAttr === 'content',
		JSON.stringify( good )
	);

	const EXPECT = 'rgb(31, 122, 122)';

	// 7. NEGATIVE CONTROL of the checker itself — fabricated measurements that
	//    SHOULD fail must be reported as FAIL. Without this, the checker could
	//    be returning PASS unconditionally and nothing here would notice.
	const wrongColour = judgeBlock(
		{
			positive: { width: '4px', style: 'solid', color: 'rgb(1, 2, 3)' },
			negative: { width: '0px', style: 'none', color: 'rgb(1, 2, 3)' },
		},
		EXPECT
	);
	assert(
		'checker FAILS a positive instance painting the wrong colour',
		wrongColour.status === 'FAIL',
		wrongColour.detail
	);

	const wrongWidth = judgeBlock(
		{
			positive: { width: '1px', style: 'solid', color: EXPECT },
			negative: { width: '0px', style: 'none', color: EXPECT },
		},
		EXPECT
	);
	assert(
		'checker FAILS a positive instance painting the wrong width',
		wrongWidth.status === 'FAIL',
		wrongWidth.detail
	);

	const noBorder = judgeBlock(
		{
			positive: { width: '0px', style: 'none', color: EXPECT },
			negative: { width: '0px', style: 'none', color: EXPECT },
		},
		EXPECT
	);
	assert(
		'checker FAILS a positive instance painting NO border at all',
		noBorder.status === 'FAIL',
		noBorder.detail
	);

	// 8. A leaking negative control must FAIL even though the positive is perfect.
	const leakyControl = judgeBlock(
		{
			positive: { width: '4px', style: 'solid', color: EXPECT },
			negative: { width: '4px', style: 'solid', color: EXPECT },
		},
		EXPECT
	);
	assert(
		'checker FAILS when the NEGATIVE CONTROL paints a border',
		leakyControl.status === 'FAIL' && /NEGATIVE CONTROL/.test( leakyControl.detail ),
		leakyControl.detail
	);

	// 9. The all-correct case PASSES — otherwise the checker is vacuously strict.
	const correct = judgeBlock(
		{
			positive: { width: '4px', style: 'solid', color: EXPECT },
			negative: { width: '0px', style: 'none', color: EXPECT },
		},
		EXPECT
	);
	assert( 'checker PASSES a correct measurement', correct.status === 'PASS', correct.detail );

	// 10. Unmeasurable instances are NOT RUN, never PASS and never FAIL.
	const unmeasured = judgeBlock( { positive: null, negative: null }, EXPECT );
	assert( 'unmeasurable instances are NOT RUN (not a pass)', unmeasured.status === 'NOT RUN', unmeasured.detail );

	// 11. An unresolvable palette slug is NOT RUN, not a bogus colour FAIL.
	const noColour = judgeBlock(
		{
			positive: { width: '4px', style: 'solid', color: 'rgba(0, 0, 0, 0)' },
			negative: { width: '0px', style: 'none', color: 'rgba(0, 0, 0, 0)' },
		},
		'rgba(0, 0, 0, 0)'
	);
	assert( 'unresolvable palette slug is NOT RUN, not a bogus FAIL', noColour.status === 'NOT RUN', noColour.detail );

	// 12. CLI parsing.
	const a = parseArgs( [ '--blocks', 'sgs/button,sgs/container', '--check' ] );
	assert(
		'--blocks csv + --check parse correctly',
		a.check === true && a.blocks.length === 2 && a.blocks[ 0 ] === 'sgs/button'
	);
	const b = parseArgs( [ '--blocks=sgs/quote' ] );
	assert(
		'--blocks=... form parses',
		b.blocks.length === 1 && b.blocks[ 0 ] === 'sgs/quote' && b.check === false
	);

	let passed = 0;
	for ( const c of checks ) {
		process.stdout.write(
			`  ${ c.ok ? 'ok  ' : 'FAIL' }  ${ c.name }${ c.ok ? '' : `\n        ${ c.extra }` }\n`
		);
		if ( c.ok ) {
			passed++;
		}
	}
	process.stdout.write( `\n${ passed }/${ checks.length } assertions passed\n` );
	process.exitCode = passed === checks.length ? 0 : 1;
}

/* -------------------------------------------------------------------------
 * Live probe.
 * ---------------------------------------------------------------------- */

/**
 * Credentials for the canary. Gitignored, always present.
 *
 * @return {Object} { url, user, pwd, appPwd }
 */
function loadEnv() {
	const txt = fs.readFileSync( ENV_PATH, 'utf8' );
	const env = {};
	for ( const line of txt.split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/ );
		if ( m ) {
			env[ m[ 1 ] ] = m[ 2 ].replace( /^["']|["']$/g, '' );
		}
	}
	for ( const key of [ 'WP_URL_SANDYBROWN', 'WP_USER_SANDYBROWN', 'WP_APP_PWD_SANDYBROWN' ] ) {
		if ( ! env[ key ] ) {
			throw new Error( `${ key } missing from ${ ENV_PATH }` );
		}
	}
	return {
		url: env.WP_URL_SANDYBROWN.replace( /\/$/, '' ),
		user: env.WP_USER_SANDYBROWN,
		pwd: env.WP_PWD_SANDYBROWN || '',
		appPwd: env.WP_APP_PWD_SANDYBROWN,
	};
}

function authHeader( creds ) {
	return 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );
}

/**
 * Create the probe page over REST.
 *
 * ⛔ The Basic auth header is not optional plumbing — it IS the user context.
 * A tool that writes post_content with no user attached runs through KSES as
 * nobody, and KSES silently strips CSS out of block attributes on save, so the
 * probe would then measure a page WordPress had quietly edited.
 *
 * @param {Object} creds   Credentials.
 * @param {string} title   Page title.
 * @param {string} content post_content.
 * @return {Promise<Object>} Created page JSON.
 */
async function createPage( creds, title, content ) {
	const res = await fetch( `${ creds.url }/wp-json/wp/v2/pages`, {
		method: 'POST',
		headers: { Authorization: authHeader( creds ), 'Content-Type': 'application/json' },
		body: JSON.stringify( { title, content, status: 'publish' } ),
	} );
	if ( ! res.ok ) {
		throw new Error( `create page failed: ${ res.status } ${ await res.text() }` );
	}
	return res.json();
}

async function trashPage( creds, pageId ) {
	if ( ! pageId ) {
		return;
	}
	const res = await fetch( `${ creds.url }/wp-json/wp/v2/pages/${ pageId }?force=true`, {
		method: 'DELETE',
		headers: { Authorization: authHeader( creds ) },
	} );
	if ( ! res.ok ) {
		process.stderr.write(
			`[border-roundtrip] WARNING: failed to delete probe page ${ pageId }: ` +
				`${ res.status } ${ res.statusText } — delete it manually.\n`
		);
	}
}

/**
 * Resolve a palette slug to its computed rgb() ON THE PAGE UNDER TEST.
 *
 * ⛔ NEVER hardcode the expected colour from theme/sgs-theme/theme.json.
 * Per-client colour lives in sites/<client>/theme-snapshot.json and is pushed
 * to wp_global_styles, which OVERRIDES theme.json. A hardcoded hex measures
 * the framework default, not the site — that already cost the colour gate one
 * false failure. Resolving through a probe element also avoids hex→rgb parsing:
 * the browser hands back the same rgb() string getComputedStyle reports.
 *
 * @param {Object} page Playwright page on the target document.
 * @param {string} slug Palette slug.
 * @return {Promise<string>} Computed colour.
 */
async function resolveSlug( page, slug ) {
	return page.evaluate( ( s ) => {
		const probe = document.createElement( 'span' );
		probe.style.color = `var(--wp--preset--color--${ s })`;
		probe.style.position = 'absolute';
		probe.style.opacity = '0';
		document.body.appendChild( probe );
		const resolved = getComputedStyle( probe ).color;
		probe.remove();
		return resolved;
	}, slug );
}

/**
 * Measure the two outermost instances of one block, in document order.
 *
 * Nested matches are filtered out: several SGS blocks render a same-class
 * element inside themselves, and a raw querySelectorAll would hand back the
 * inner one as "instance 2" — comparing a block against its own child.
 *
 * @param {Object} page      Playwright page.
 * @param {string} className Wrapper class, e.g. "wp-block-sgs-button".
 * @return {Promise<Object>} { found, positive, negative }
 */
async function measureInstances( page, className ) {
	return page.evaluate( ( cls ) => {
		const all = Array.from( document.querySelectorAll( '.' + cls ) );
		const outer = all.filter(
			( el ) => ! ( el.parentElement && el.parentElement.closest( '.' + cls ) )
		);
		const read = ( el ) => {
			if ( ! el ) {
				return null;
			}
			const cs = getComputedStyle( el );
			return {
				width: cs.borderTopWidth,
				style: cs.borderTopStyle,
				color: cs.borderTopColor,
				tag: el.tagName.toLowerCase(),
			};
		};
		return { found: outer.length, positive: read( outer[ 0 ] ), negative: read( outer[ 1 ] ) };
	}, className );
}

const results = [];
const record = ( id, status, detail ) => {
	results.push( { id, status, detail } );
	const tag =
		status === 'PASS'
			? 'PASS   '
			: status === 'FAIL'
			? 'FAIL   '
			: status === 'SKIPPED'
			? 'SKIPPED'
			: 'NOT RUN';
	process.stdout.write( `  ${ tag }  ${ id }\n           ${ detail }\n` );
};

function summarise( checkMode ) {
	const pass = results.filter( ( r ) => r.status === 'PASS' ).length;
	const fail = results.filter( ( r ) => r.status === 'FAIL' ).length;
	const notRun = results.filter( ( r ) => r.status === 'NOT RUN' ).length;
	const skipped = results.filter( ( r ) => r.status === 'SKIPPED' ).length;

	process.stdout.write( `\nPASS ${ pass } · FAIL ${ fail } · NOT RUN ${ notRun } · SKIPPED ${ skipped }\n` );
	if ( skipped ) {
		process.stdout.write(
			'ℹ SKIPPED = the block does not declare borderWidth/borderStyle/borderColour. ' +
				'It is NOT a pass; it was never probed.\n'
		);
	}
	if ( notRun ) {
		process.stdout.write( '⛔ A NOT RUN assertion is NOT a pass. It is reported as unproven, deliberately.\n' );
	}

	// Never process.exit() after browser.close() on Windows — libuv throws
	// UV_HANDLE_CLOSING and corrupts the exit code. Set exitCode instead.
	// NOT RUN exits non-zero in EVERY mode (fail closed); FAIL gates on --check.
	if ( notRun > 0 || ( checkMode && fail > 0 ) ) {
		process.exitCode = 1;
	}
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );

	if ( args.selfTest ) {
		process.stdout.write( '[border-roundtrip] self-test (offline)\n\n' );
		selfTest();
		return;
	}

	if ( ! args.blocks.length ) {
		process.stderr.write(
			'[border-roundtrip] NOT RUN: --blocks is required.\n' +
				'  node scripts/qa/check-border-roundtrip.js --blocks sgs/button,sgs/container [--check]\n'
		);
		process.exitCode = 1;
		return;
	}

	// ⛔ FAIL CLOSED. No browser means the gate did not run; it must never be
	// mistaken for a clean run, in ANY mode.
	let chromium;
	try {
		// eslint-disable-next-line import/no-extraneous-dependencies
		( { chromium } = require( 'playwright' ) );
	} catch ( e ) {
		process.stderr.write(
			`[border-roundtrip] NOT RUN: Playwright is unavailable (require("playwright") failed: ${ e.message }).\n` +
				'  npm install --save-dev playwright && npx playwright install chromium\n' +
				'  Exiting NON-ZERO in every mode — an unrun gate is not a passing gate.\n'
		);
		process.exitCode = 1;
		return;
	}

	let creds;
	try {
		creds = loadEnv();
	} catch ( e ) {
		process.stderr.write( `[border-roundtrip] NOT RUN: ${ e.message }\n` );
		process.exitCode = 1;
		return;
	}

	process.stdout.write( `[border-roundtrip] ${ args.blocks.length } block(s) requested\n\n` );

	// Classify first — a block that never declares the attributes must not be
	// authored onto the page at all.
	const plans = args.blocks.map( ( slug ) => {
		try {
			return classifyBlock( slug, readBlockJson( slug ) );
		} catch ( e ) {
			return { slug, ok: false, reason: `block.json unreadable: ${ e.message }` };
		}
	} );
	const probeable = plans.filter( ( p ) => p.ok );
	for ( const p of plans.filter( ( x ) => ! x.ok ) ) {
		record( p.slug, 'SKIPPED', p.reason );
	}

	if ( ! probeable.length ) {
		process.stdout.write( '\nNo probeable blocks — nothing was measured.\n' );
		summarise( args.check );
		return;
	}

	const content = probeable.map( ( p ) => buildBlockMarkup( p.slug, p ) ).join( '\n' );

	let browser = null;
	let pageId = null;
	try {
		const created = await createPage(
			creds,
			`DELETE ME — border round-trip probe ${ new Date().toISOString() }`,
			content
		);
		pageId = created.id;
		process.stdout.write(
			`  probe page id=${ pageId }  ${ created.link }\n` +
				'  (auto-deleted at the end of this run; delete it manually if the run is killed)\n\n'
		);

		browser = await chromium.launch( { headless: true } );
		const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
		const page = await context.newPage();
		await page.goto( created.link, { waitUntil: 'domcontentloaded', timeout: 45000 } );
		await page.waitForTimeout( 800 );

		const expectedColour = await resolveSlug( page, SLUG );

		for ( const p of probeable ) {
			const className = `wp-block-${ p.slug.replace( '/', '-' ) }`;
			try {
				const m = await measureInstances( page, className );
				if ( m.found < 2 ) {
					record(
						p.slug,
						'NOT RUN',
						`found ${ m.found } outermost .${ className } element(s) on the probe page, need 2 ` +
							'(positive + negative control). Nothing measured.'
					);
					continue;
				}
				const verdict = judgeBlock( m, expectedColour );
				record( p.slug, verdict.status, `[.${ className } <${ m.positive.tag }>] ${ verdict.detail }` );
			} catch ( e ) {
				record( p.slug, 'NOT RUN', `measurement threw: ${ e.message }` );
			}
		}

		await context.close();
	} catch ( e ) {
		record( 'HARNESS', 'NOT RUN', `harness threw: ${ e.message }` );
	} finally {
		if ( browser ) {
			await browser.close().catch( () => {} );
		}
		await trashPage( creds, pageId );
	}

	summarise( args.check );
}

// Only run when executed directly. Requiring this file exposes the pure core
// so a caller can classify real blocks without hand-rolling a replay of it —
// every wrong answer this repo has chased came from a reconstruction that
// skipped a step the real function performs.
if ( require.main === module ) {
	main();
}

module.exports = {
	parseArgs,
	blockDirName,
	readBlockJson,
	classifyBlock,
	usesInnerBlocks,
	buildInstanceMarkup,
	buildAttrPair,
	buildBlockMarkup,
	judgeBlock,
};
