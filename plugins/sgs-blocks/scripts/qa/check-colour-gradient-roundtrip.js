#!/usr/bin/env node
'use strict';

/**
 * Text-colour gradient round-trip probe — does the FRONTEND actually paint a
 * `background-clip:text` gradient when a `{attr}Gradient` sibling is set, and
 * does a flat colour still paint normally when it is not?
 *
 * Built for the D948 golden-colour Phase 3 rollout (commit e17bea203 + 976c9d961).
 * One run covers a LIST of (block, attr) pairs.
 *
 * Per pair it authors TWO instances on one disposable probe page:
 *   (a) POSITIVE         — {attr}Gradient set to a real CSS gradient string
 *   (b) NEGATIVE CONTROL — the SAME base attr, {attr}Gradient left unset
 *
 * The negative control is the load-bearing half. Without it, an element that
 * always renders `background-clip:text` regardless of input (a stray CSS
 * rule, a copy-paste from another block) reads as a PASS and the probe proves
 * nothing about whether the gradient input actually drove the output.
 *
 * ⛔ NEVER fabricate a PASS. A pair with no fixture entry below is SKIPPED,
 * not silently assumed to work — most of these blocks need real repeater
 * content or live post data to render their text element at all, and a
 * probe that authored a bare attribute-only instance would find nothing to
 * measure and could not tell "correct" from "never rendered".
 * ⛔ FAIL CLOSED, same discipline as check-border-roundtrip.js: a missing
 * browser, missing credentials, or any assertion that could not run reports
 * NOT RUN and exits NON-ZERO in every mode.
 *
 * Usage:
 *   node scripts/qa/check-colour-gradient-roundtrip.js --pairs whatsapp-cta.labelColour,modal.triggerColour
 *   node scripts/qa/check-colour-gradient-roundtrip.js --all --check
 *   node scripts/qa/check-colour-gradient-roundtrip.js --self-test
 */

const fs = require( 'fs' );
const path = require( 'path' );

const SRC_BLOCKS = path.resolve( __dirname, '../../src/blocks' );
const ENV_PATH = path.resolve( __dirname, '../../../../.claude/secrets/sandybrown.env' );

// A real, valid two-stop gradient. Distinct hex stops so a probe that returned
// a single flat colour (gradient not actually applied) cannot be mistaken for
// a correctly-resolved gradient.
const GRADIENT = 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)';
const FLAT_SLUG = 'primary';

const ROOT_ID = 'sgs-colour-gradient-roundtrip-probe-root';

/* -------------------------------------------------------------------------
 * Pure, offline-testable core. Everything below the self-test is network.
 * ---------------------------------------------------------------------- */

function parseArgs( argv ) {
	const out = { pairs: [], all: false, check: false, selfTest: false };
	for ( let i = 0; i < argv.length; i++ ) {
		if ( argv[ i ] === '--check' ) {
			out.check = true;
		} else if ( argv[ i ] === '--self-test' ) {
			out.selfTest = true;
		} else if ( argv[ i ] === '--all' ) {
			out.all = true;
		} else if ( argv[ i ] === '--pairs' ) {
			out.pairs = String( argv[ ++i ] || '' )
				.split( ',' )
				.map( ( s ) => s.trim() )
				.filter( Boolean );
		} else if ( argv[ i ].startsWith( '--pairs=' ) ) {
			out.pairs = argv[ i ]
				.slice( '--pairs='.length )
				.split( ',' )
				.map( ( s ) => s.trim() )
				.filter( Boolean );
		}
	}
	return out;
}

function readBlockJson( dir ) {
	const p = path.join( SRC_BLOCKS, dir, 'block.json' );
	if ( ! fs.existsSync( p ) ) {
		return null;
	}
	return JSON.parse( fs.readFileSync( p, 'utf8' ) );
}

/**
 * FIXTURES — one entry per (block-dir, attr) pair this probe can actually
 * render deterministically from a bare block comment. Every pair wired in
 * commits e17bea203/976c9d961 that needs repeater content, live post data,
 * or a specific WP-nav-menu assignment to render its text element is
 * deliberately left OUT — a fabricated fixture that renders the WRONG
 * element would be worse than an honest SKIP. Selectors are relative to the
 * probe's own wrapper (`.wp-block-sgs-<dir>` for the block root, `<uid>` not
 * needed since the probe page has exactly one instance per pair).
 *
 *   attr       Flat colour attribute name.
 *   selector   CSS selector for the painted element, scoped inside the
 *              instance's own root — '' means the root wrapper itself.
 *   extraAttrs Extra attributes both instances need to render that element
 *              at all (merged under the colour attrs).
 *   hover      When true, the selector's colour is a :hover-state paint —
 *              the probe hovers the element before measuring.
 */
const FIXTURES = {
	modal: {
		attr: 'triggerColour',
		selector: '.sgs-modal__trigger',
		extraAttrs: { triggerText: 'Open probe modal' },
	},
	// Session 9 (2026-09-04) row — `.sgs-modal__close` renders unconditionally
	// (render.php:145, no guard), and its background lives on its own
	// `::after` layer (style.css:180 / block.json's own note), the same
	// "background on a separate layer" shape as pricing-table.ctaColour below.
	'modal.closeColourText': {
		attr: 'closeColourText',
		selector: '.sgs-modal__close',
		extraAttrs: { triggerText: 'Open probe modal' },
	},
	'nav-drawer': {
		attr: 'toggleCloseColour',
		selector: '.sgs-nav-drawer__close',
	},
	'business-info': {
		attr: 'textColour',
		selector: '',
	},
	form: {
		attr: 'submitColour',
		selector: '.sgs-form__button--submit',
	},
	'whatsapp-cta': {
		attr: 'labelColour',
		selector: '.sgs-whatsapp-cta__label',
		// render.php: `if ( ! $phone_number ) { return; }` — the block renders
		// NOTHING at all without this, regardless of colour attrs (found live,
		// 2026-09-04: a first probe run without it measured "0 wrappers found",
		// not a colour defect). The `.sgs-whatsapp-cta__label` span is ALSO
		// conditional — `if ( 'floating' !== $variant && $label )` — the
		// default variant ("floating") never renders it at all.
		extraAttrs: { phoneNumber: '441234567890', variant: 'inline', label: 'probe label' },
	},
	// Session 9 row — typed mode is the block's own default (sourceMode
	// unset), so the `.sgs-product-card__title` heading renders with no
	// extra attrs. Verifies the "new rule wins by source order over the old
	// custom-property mechanism" claim (render.php:222-225) live.
	'product-card.titleColour': {
		attr: 'titleColour',
		selector: '.sgs-product-card__title',
	},
	// Session 9 row — `plans` is a repeater; one bare entry is enough for
	// render.php's own per-plan defaults (`ctaText` defaults to "Get
	// started") to render the CTA. Background moved to a `::after` layer
	// (render.php ~L539, block.json's own note) specifically to free
	// ctaColour for this gradient sibling.
	'pricing-table.ctaColour': {
		attr: 'ctaColour',
		selector: '.sgs-pricing-table__cta',
		extraAttrs: { plans: [ {} ] },
	},
};

// Blocks wired this rollout but deliberately NOT probed here — named so the
// gap is visible, not silently absent from the FIXTURES table above.
const KNOWN_SKIPPED = {
	quote: 'textColourHover/textColourHoverGradient target the block ROOT, but the root has no text of its own — the body renders via InnerBlocks children and the attribution is a separately-styled child span carrying its OWN explicit attributionColour rule, which always wins over inherited colour from the parent regardless of :hover state. Live-verified 2026-09-04: a probe instance with attribution set measured the root gradient/colour resolving correctly on the ROOT element itself (bg-image, clip:text all correct), but the VISIBLE text stayed the flat attributionColour, unaffected by hover. This is a pre-existing limitation of the flat textColourHover mechanism (predates this rollout) — the gradient sibling faithfully extends the SAME root-targeted mechanism, so it inherits the same practical no-op-on-typical-content problem rather than introducing a new one. Needs a design decision (retarget to the attribution/body selectors, or accept as root-only for a rare no-attribution/no-body-styling case) before this pair can be usefully probed.',
	'post-grid': 'renders cards from real published posts on the target site — content the probe does not control, so a positive/negative pair cannot be authored deterministically',
	'process-steps': 'needs a populated `steps` repeater to render title/description text — no minimal fixture built yet',
	'product-card': 'tagTextColour only paints the trial-tag element in a specific variant configuration — no minimal fixture built yet',
	'trust-bar': 'needs a populated `items` repeater (badgeStyle text-only/image-badge) to render title/label text — no minimal fixture built yet',
	separator: 'needs contentMode="text" plus content to render `.sgs-separator__content` — no minimal fixture built yet',
	'nav-menu': 'burgerColour/submenuColour depend on a real assigned WP nav menu — no minimal fixture built yet',
};

/**
 * Classify one requested pair. `requested` is "block-dir" (looks up
 * `FIXTURES[dir]`, the original single-fixture-per-dir shape) or
 * "block-dir.attrOverride" (looks up `FIXTURES[requested]` FIRST, falling
 * back to `FIXTURES[dir]` — lets a block that gains a SECOND probeable
 * pair register it under a dotted key without disturbing its bare-dir
 * entry). `KNOWN_SKIPPED` is checked the same way: a dotted key can name a
 * per-attr skip reason distinct from the dir's blanket one.
 *
 * @param {string} requested "dir" or "dir.attr".
 * @return {Object} { id, ok, reason?, dir?, attr?, gradientAttr?, selector?, hover?, extraAttrs? }
 */
function classifyPair( requested ) {
	const id = requested;
	const dotIdx = requested.indexOf( '.' );
	const dir = dotIdx === -1 ? requested : requested.slice( 0, dotIdx );
	if ( KNOWN_SKIPPED[ requested ] ) {
		return { id, ok: false, reason: KNOWN_SKIPPED[ requested ] };
	}
	const fixture = FIXTURES[ requested ] || FIXTURES[ dir ];
	if ( ! fixture ) {
		if ( KNOWN_SKIPPED[ dir ] ) {
			return { id, ok: false, reason: KNOWN_SKIPPED[ dir ] };
		}
		return { id, ok: false, reason: 'no fixture registered for this block — not probed' };
	}
	const blockJson = readBlockJson( dir );
	if ( ! blockJson ) {
		return { id, ok: false, reason: `no block.json at src/blocks/${ dir }/` };
	}
	const gradientAttr = fixture.gradientAttr || `${ fixture.attr }Gradient`;
	const attrs = blockJson.attributes || {};
	if ( ! attrs[ fixture.attr ] ) {
		return { id, ok: false, reason: `block.json does not declare "${ fixture.attr }"` };
	}
	if ( ! attrs[ gradientAttr ] ) {
		return { id, ok: false, reason: `block.json does not declare "${ gradientAttr }" — not gradient-wired` };
	}
	return {
		id,
		ok: true,
		dir,
		attr: fixture.attr,
		gradientAttr,
		selector: fixture.selector,
		hover: !! fixture.hover,
		extraAttrs: fixture.extraAttrs || {},
	};
}

/**
 * Attribute payloads for one pair's positive instance and negative control.
 *
 * @param {Object} cls classifyPair() result (ok:true).
 * @return {{positive: Object, negative: Object}} Attribute payloads.
 */
function buildAttrPair( cls ) {
	const positive = Object.assign( {}, cls.extraAttrs, {
		[ cls.attr ]: FLAT_SLUG,
		[ cls.gradientAttr ]: GRADIENT,
	} );
	const negative = Object.assign( {}, cls.extraAttrs, {
		[ cls.attr ]: FLAT_SLUG,
		[ cls.gradientAttr ]: '',
	} );
	return { positive, negative };
}

/**
 * Full markup for one pair: positive instance then negative control.
 *
 * @param {Object} cls classifyPair() result.
 * @return {string} Markup for both instances.
 */
function buildBlockMarkup( cls ) {
	const { positive, negative } = buildAttrPair( cls );
	const slug = `sgs/${ cls.dir }`;
	return (
		`<!-- wp:${ slug } ${ JSON.stringify( positive ) } /-->\n` +
		`<!-- wp:${ slug } ${ JSON.stringify( negative ) } /-->`
	);
}

/**
 * Wrap every probed pair's markup in a `core/group` carrying a unique anchor
 * id — same page-frame-collision fix as check-border-roundtrip.js's
 * wrapInProbeRoot(): several SGS blocks (sgs/container in particular) also
 * render as part of the page frame (header/footer), so an unscoped query
 * could pick up an unrelated page-frame instance instead of the probe's own.
 *
 * @param {string} content Joined markup for every probed pair.
 * @return {string} `content` wrapped in an anchored `core/group`.
 */
function wrapInProbeRoot( content ) {
	return (
		`<!-- wp:group {"anchor":"${ ROOT_ID }"} -->\n` +
		`<div class="wp-block-group" id="${ ROOT_ID }">\n${ content }\n</div>\n` +
		'<!-- /wp:group -->'
	);
}

/**
 * Judge one pair from measured computed styles.
 *
 * @param {Object}      m Measurement — { positive, negative }, each either
 *                        null or { backgroundImage, color, webkitBackgroundClip }.
 * @return {{status: string, detail: string}} Verdict.
 */
function judgeBlock( m ) {
	if ( ! m || ! m.positive || ! m.negative ) {
		return {
			status: 'NOT RUN',
			detail:
				'could not measure both instances on the page ' +
				`(positive=${ m && m.positive ? 'found' : 'MISSING' }, ` +
				`negative=${ m && m.negative ? 'found' : 'MISSING' }).`,
		};
	}

	const p = m.positive;
	const n = m.negative;
	const fails = [];

	// Positive: a resolved gradient function, background-clip actually applied
	// to text, and the text colour itself made transparent so the gradient
	// paints through rather than a solid colour sitting on top of it.
	if ( ! /^(repeating-)?(linear|radial|conic)-gradient\(/.test( p.backgroundImage ) ) {
		fails.push( `positive background-image = "${ p.backgroundImage }", expected a resolved gradient() function` );
	}
	if ( p.webkitBackgroundClip !== 'text' ) {
		fails.push( `positive -webkit-background-clip = "${ p.webkitBackgroundClip }", expected "text"` );
	}
	if ( p.color !== 'rgba(0, 0, 0, 0)' ) {
		fails.push( `positive color = "${ p.color }", expected transparent (rgba(0, 0, 0, 0)) — the gradient is being painted UNDER a solid colour, not through it` );
	}

	// Negative control: no gradient function present, and the element still
	// paints a real (non-transparent) colour from the flat attribute — proves
	// the control did not accidentally inherit the positive's gradient AND
	// proves the flat-colour path still works after this rollout.
	if ( p.backgroundImage !== 'none' ) {
		if ( n.backgroundImage && /gradient\(/.test( n.backgroundImage ) ) {
			fails.push(
				`NEGATIVE CONTROL background-image = "${ n.backgroundImage }" — the control is painting a gradient it was never given`
			);
		}
	}
	if ( n.color === 'rgba(0, 0, 0, 0)' ) {
		fails.push( 'NEGATIVE CONTROL color = transparent — the flat colour is not rendering, only the gradient path works' );
	}

	const observed =
		`positive[bg-image=${ p.backgroundImage } clip=${ p.webkitBackgroundClip } color=${ p.color }] · ` +
		`control[bg-image=${ n.backgroundImage } clip=${ n.webkitBackgroundClip } color=${ n.color }]`;

	if ( fails.length ) {
		return { status: 'FAIL', detail: `${ fails.join( '; ' ) }. Observed: ${ observed }` };
	}
	return { status: 'PASS', detail: `gradient painted from the Gradient attribute, flat colour painted from the base attribute, control clean. Observed: ${ observed }` };
}

/* -------------------------------------------------------------------------
 * Self-test — offline, no network, no third-party module.
 * ---------------------------------------------------------------------- */

function selfTest() {
	const checks = [];
	const assert = ( name, cond, extra ) => {
		checks.push( { name, ok: !! cond, extra: extra || '' } );
	};

	// 1. classifyPair() refuses an unregistered dir.
	const noFixture = classifyPair( 'definitely-not-a-real-block' );
	assert( 'unregistered block is classified SKIPPED', noFixture.ok === false, noFixture.reason );

	// 2. classifyPair() refuses a KNOWN_SKIPPED dir with its stated reason,
	//    never silently promoting it into FIXTURES.
	const knownSkip = classifyPair( 'post-grid' );
	assert(
		'known-skipped block is classified SKIPPED with its documented reason',
		knownSkip.ok === false && knownSkip.reason === KNOWN_SKIPPED[ 'post-grid' ],
		knownSkip.reason
	);

	// 3. A registered fixture with a real block.json IS probeable.
	const good = classifyPair( 'whatsapp-cta' );
	assert(
		'whatsapp-cta is probeable with the expected attr/gradientAttr pair',
		good.ok === true && good.attr === 'labelColour' && good.gradientAttr === 'labelColourGradient',
		JSON.stringify( good )
	);

	// 4. buildAttrPair() differs from the negative control ONLY in the
	//    gradient attribute.
	const pair = buildAttrPair( good );
	const posKeys = Object.keys( pair.positive ).filter( ( k ) => k !== good.gradientAttr );
	const negKeys = Object.keys( pair.negative ).filter ( ( k ) => k !== good.gradientAttr );
	assert(
		'negative control differs from positive ONLY in the gradient attribute',
		JSON.stringify( posKeys.sort() ) === JSON.stringify( negKeys.sort() ) &&
			posKeys.every( ( k ) => pair.positive[ k ] === pair.negative[ k ] ) &&
			pair.positive[ good.gradientAttr ] !== pair.negative[ good.gradientAttr ] &&
			pair.negative[ good.gradientAttr ] === ''
	);

	// 5. buildBlockMarkup() emits parseable JSON for both instances with the
	//    expected gradient values.
	const markup = buildBlockMarkup( good );
	const comments = markup.match( /<!-- wp:[^\s]+ (\{.*?\}) \/-->/g ) || [];
	assert( 'markup builder emits exactly two block comments', comments.length === 2, markup );
	let bothParsed = true;
	const gradients = [];
	for ( const c of comments ) {
		const j = c.match( /<!-- wp:[^\s]+ (\{.*\}) \/-->/ );
		try {
			gradients.push( JSON.parse( j[ 1 ] )[ good.gradientAttr ] );
		} catch ( e ) {
			bothParsed = false;
		}
	}
	assert(
		'markup builder emits parseable JSON with GRADIENT set on one instance and empty on the other',
		bothParsed && gradients.includes( GRADIENT ) && gradients.includes( '' ),
		JSON.stringify( gradients )
	);

	// 6. wrapInProbeRoot() carries the ROOT_ID and encloses the content.
	const wrapped = wrapInProbeRoot( '<!-- wp:sgs/probe {} /-->' );
	assert(
		'wrapInProbeRoot emits an anchored group carrying ROOT_ID and containing the content',
		wrapped.includes( `id="${ ROOT_ID }"` ) &&
			wrapped.indexOf( `id="${ ROOT_ID }"` ) < wrapped.indexOf( '<!-- wp:sgs/probe' ) &&
			wrapped.trim().endsWith( '<!-- /wp:group -->' ),
		wrapped
	);

	// 7. NEGATIVE CONTROL of the checker itself — a fabricated measurement
	//    that SHOULD fail must be reported as FAIL.
	const wrongBg = judgeBlock( {
		positive: { backgroundImage: 'none', webkitBackgroundClip: 'border-box', color: 'rgb(1, 2, 3)' },
		negative: { backgroundImage: 'none', webkitBackgroundClip: 'border-box', color: 'rgb(1, 2, 3)' },
	} );
	assert( 'checker FAILS a positive instance with no gradient applied at all', wrongBg.status === 'FAIL', wrongBg.detail );

	const notTransparent = judgeBlock( {
		positive: { backgroundImage: 'linear-gradient(90deg, red, blue)', webkitBackgroundClip: 'text', color: 'rgb(1, 2, 3)' },
		negative: { backgroundImage: 'none', webkitBackgroundClip: 'border-box', color: 'rgb(1, 2, 3)' },
	} );
	assert(
		'checker FAILS a positive instance where the text colour is not transparent (gradient hidden under a solid colour)',
		notTransparent.status === 'FAIL',
		notTransparent.detail
	);

	// 8. A leaking negative control must FAIL even though the positive is perfect.
	const leaky = judgeBlock( {
		positive: { backgroundImage: 'linear-gradient(90deg, red, blue)', webkitBackgroundClip: 'text', color: 'rgba(0, 0, 0, 0)' },
		negative: { backgroundImage: 'linear-gradient(90deg, red, blue)', webkitBackgroundClip: 'text', color: 'rgba(0, 0, 0, 0)' },
	} );
	assert(
		'checker FAILS when the NEGATIVE CONTROL also paints a gradient',
		leaky.status === 'FAIL' && /NEGATIVE CONTROL/.test( leaky.detail ),
		leaky.detail
	);

	// 9. A negative control rendering transparent text (flat colour broken) FAILS.
	const flatBroken = judgeBlock( {
		positive: { backgroundImage: 'linear-gradient(90deg, red, blue)', webkitBackgroundClip: 'text', color: 'rgba(0, 0, 0, 0)' },
		negative: { backgroundImage: 'none', webkitBackgroundClip: 'border-box', color: 'rgba(0, 0, 0, 0)' },
	} );
	assert(
		'checker FAILS when the NEGATIVE CONTROL renders transparent text (the flat-colour path is broken)',
		flatBroken.status === 'FAIL' && /flat colour is not rendering/.test( flatBroken.detail ),
		flatBroken.detail
	);

	// 10. The all-correct case PASSES.
	const correct = judgeBlock( {
		positive: { backgroundImage: 'linear-gradient(90deg, rgb(255, 0, 0), rgb(0, 0, 255))', webkitBackgroundClip: 'text', color: 'rgba(0, 0, 0, 0)' },
		negative: { backgroundImage: 'none', webkitBackgroundClip: 'border-box', color: 'rgb(31, 122, 122)' },
	} );
	assert( 'checker PASSES a correct measurement', correct.status === 'PASS', correct.detail );

	// 11. Unmeasurable instances are NOT RUN, never PASS and never FAIL.
	const unmeasured = judgeBlock( { positive: null, negative: null } );
	assert( 'unmeasurable instances are NOT RUN (not a pass)', unmeasured.status === 'NOT RUN', unmeasured.detail );

	// 12. CLI parsing.
	const a = parseArgs( [ '--pairs', 'whatsapp-cta,modal', '--check' ] );
	assert( '--pairs csv + --check parse correctly', a.check === true && a.pairs.length === 2 && a.pairs[ 0 ] === 'whatsapp-cta' );
	const b = parseArgs( [ '--all' ] );
	assert( '--all parses', b.all === true && b.pairs.length === 0 );

	let passed = 0;
	for ( const c of checks ) {
		process.stdout.write( `  ${ c.ok ? 'ok  ' : 'FAIL' }  ${ c.name }${ c.ok ? '' : `\n        ${ c.extra }` }\n` );
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
		appPwd: env.WP_APP_PWD_SANDYBROWN,
	};
}

function authHeader( creds ) {
	return 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );
}

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
			`[colour-gradient-roundtrip] WARNING: failed to delete probe page ${ pageId }: ` +
				`${ res.status } ${ res.statusText } — delete it manually.\n`
		);
	}
}

/**
 * Measure one pair's two instances, in document order — SCOPED to the
 * probe's own `#rootId` wrapper, same page-frame-collision guard as
 * check-border-roundtrip.js's measureInstances().
 *
 * @param {Object}  page     Playwright page.
 * @param {string}  wrapCls  Wrapper class, e.g. "wp-block-sgs-whatsapp-cta".
 * @param {string}  innerSel Selector for the painted element, relative to the
 *                           wrapper root; '' measures the wrapper itself.
 * @param {string}  rootId   The probe's own wrapper anchor id (ROOT_ID).
 * @param {boolean} hover    Whether to dispatch a hover before measuring.
 * @return {Promise<Object>} { found, positive, negative }
 */
async function measureInstances( page, wrapCls, innerSel, rootId, hover ) {
	if ( hover ) {
		// Hover BOTH instances in turn before the single evaluate() read below —
		// getComputedStyle reflects live :hover state only while the pointer is
		// actually over the element, so each hover+read must happen together.
		const wrappers = await page.$$( `#${ rootId } .${ wrapCls }` );
		const result = { found: wrappers.length, positive: null, negative: null };
		for ( let i = 0; i < wrappers.length && i < 2; i++ ) {
			await wrappers[ i ].hover();
			await page.waitForTimeout( 50 );
			const measured = await wrappers[ i ].evaluate( ( el, sel ) => {
				const target = sel ? el.querySelector( sel ) : el;
				if ( ! target ) {
					return null;
				}
				const cs = getComputedStyle( target );
				return {
					backgroundImage: cs.backgroundImage,
					webkitBackgroundClip: cs.webkitBackgroundClip || cs.backgroundClip,
					color: cs.color,
				};
			}, innerSel );
			if ( i === 0 ) {
				result.positive = measured;
			} else {
				result.negative = measured;
			}
		}
		return result;
	}
	return page.evaluate(
		( { cls, sel, root } ) => {
			const rootEl = document.getElementById( root );
			const wrappers = rootEl ? Array.from( rootEl.querySelectorAll( '.' + cls ) ) : [];
			const read = ( wrapperEl ) => {
				if ( ! wrapperEl ) {
					return null;
				}
				const target = sel ? wrapperEl.querySelector( sel ) : wrapperEl;
				if ( ! target ) {
					return null;
				}
				const cs = getComputedStyle( target );
				return {
					backgroundImage: cs.backgroundImage,
					webkitBackgroundClip: cs.webkitBackgroundClip || cs.backgroundClip,
					color: cs.color,
				};
			};
			return { found: wrappers.length, positive: read( wrappers[ 0 ] ), negative: read( wrappers[ 1 ] ) };
		},
		{ cls: wrapCls, sel: innerSel, root: rootId }
	);
}

const results = [];
const record = ( id, status, detail ) => {
	results.push( { id, status, detail } );
	const tag =
		status === 'PASS' ? 'PASS   ' : status === 'FAIL' ? 'FAIL   ' : status === 'SKIPPED' ? 'SKIPPED' : 'NOT RUN';
	process.stdout.write( `  ${ tag }  ${ id }\n           ${ detail }\n` );
};

function summarise( checkMode ) {
	const pass = results.filter( ( r ) => r.status === 'PASS' ).length;
	const fail = results.filter( ( r ) => r.status === 'FAIL' ).length;
	const notRun = results.filter( ( r ) => r.status === 'NOT RUN' ).length;
	const skipped = results.filter( ( r ) => r.status === 'SKIPPED' ).length;

	process.stdout.write( `\nPASS ${ pass } · FAIL ${ fail } · NOT RUN ${ notRun } · SKIPPED ${ skipped }\n` );
	if ( skipped ) {
		process.stdout.write( 'ℹ SKIPPED = no fixture built for this pair yet. It is NOT a pass; it was never probed.\n' );
	}
	if ( notRun ) {
		process.stdout.write( '⛔ A NOT RUN assertion is NOT a pass. It is reported as unproven, deliberately.\n' );
	}

	if ( notRun > 0 || ( checkMode && fail > 0 ) ) {
		process.exitCode = 1;
	}
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );

	if ( args.selfTest ) {
		process.stdout.write( '[colour-gradient-roundtrip] self-test (offline)\n\n' );
		selfTest();
		return;
	}

	const requestedDirs = args.all ? Object.keys( FIXTURES ) : args.pairs;
	if ( ! requestedDirs.length ) {
		process.stderr.write(
			'[colour-gradient-roundtrip] NOT RUN: --pairs or --all is required.\n' +
				'  node scripts/qa/check-colour-gradient-roundtrip.js --pairs whatsapp-cta,modal [--check]\n' +
				'  node scripts/qa/check-colour-gradient-roundtrip.js --all [--check]\n'
		);
		process.exitCode = 1;
		return;
	}

	let chromium;
	try {
		// eslint-disable-next-line import/no-extraneous-dependencies
		( { chromium } = require( 'playwright' ) );
	} catch ( e ) {
		process.stderr.write(
			`[colour-gradient-roundtrip] NOT RUN: Playwright is unavailable (require("playwright") failed: ${ e.message }).\n` +
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
		process.stderr.write( `[colour-gradient-roundtrip] NOT RUN: ${ e.message }\n` );
		process.exitCode = 1;
		return;
	}

	process.stdout.write( `[colour-gradient-roundtrip] ${ requestedDirs.length } pair(s) requested\n\n` );

	const plans = requestedDirs.map( classifyPair );
	const probeable = plans.filter( ( p ) => p.ok );
	for ( const p of plans.filter( ( x ) => ! x.ok ) ) {
		record( p.id, 'SKIPPED', p.reason );
	}

	if ( ! probeable.length ) {
		process.stdout.write( '\nNo probeable pairs — nothing was measured.\n' );
		summarise( args.check );
		return;
	}

	const content = wrapInProbeRoot( probeable.map( buildBlockMarkup ).join( '\n' ) );

	let browser = null;
	let pageId = null;
	try {
		const created = await createPage(
			creds,
			`DELETE ME — colour gradient round-trip probe ${ new Date().toISOString() }`,
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

		for ( const p of probeable ) {
			const wrapCls = `wp-block-sgs-${ p.dir }`;
			try {
				const m = await measureInstances( page, wrapCls, p.selector, ROOT_ID, p.hover );
				if ( m.found < 2 ) {
					record(
						p.id,
						'NOT RUN',
						`found ${ m.found } .${ wrapCls } wrapper(s) on the probe page, need 2 (positive + negative control). Nothing measured.`
					);
					continue;
				}
				const verdict = judgeBlock( m );
				record( p.id, verdict.status, `[.${ wrapCls } ${ p.selector || '(root)' }] ${ verdict.detail }` );
			} catch ( e ) {
				record( p.id, 'NOT RUN', `measurement threw: ${ e.message }` );
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

if ( require.main === module ) {
	main();
}

module.exports = {
	parseArgs,
	readBlockJson,
	classifyPair,
	buildAttrPair,
	buildBlockMarkup,
	wrapInProbeRoot,
	judgeBlock,
	FIXTURES,
	KNOWN_SKIPPED,
};
