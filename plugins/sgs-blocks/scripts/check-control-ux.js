/**
 * check-control-ux.js
 *
 * STRUCTURAL GUARD (Step 7a, 2026-06-11) — prevents the two editor anti-patterns
 * that produce a sub-standard inspector UX:
 *
 *   (a) RESPONSIVE-FAMILY-WITHOUT-SWITCHER
 *       A block.json declares a responsive attr family (X + XTablet and/or
 *       XMobile) AND the block's own edit code writes those attrs directly via
 *       setAttributes — WITHOUT routing through a shared component that owns the
 *       ResponsiveControl wrapper (TypographyControls, SpacingControl,
 *       ContainerWrapperControls, or any import from '../../components' /
 *       '../container/components'). Shared-component usage is COMPLIANT.
 *
 *   (b) UNIT-VIA-SELECTCONTROL
 *       The block's own edit source contains a SelectControl whose onChange
 *       callback writes an attribute whose name ends in 'Unit' (the "bulky
 *       SelectControl next to the input" anti-pattern). Shared-component usage
 *       is again exempt.
 *
 * DETECTION RULES:
 *
 *   Check (a): Responsive-family detection
 *     1. Read block.json: find all attrs X where both X and XTablet (or XMobile)
 *        are declared.
 *     2. Collect attrs written in the block's OWN edit.js via setAttributes (same
 *        collectControlledAttrs heuristics as check-dead-controls.js).
 *     3. If any Tablet/Mobile family member appears in both the controlled set AND
 *        the block's own source (not via shared-component import path):
 *          – and the block's own source imports NO shared-component that is known
 *            to own a ResponsiveControl (TypographyControls, SpacingControl,
 *            ContainerWrapperControls) AND has no direct ResponsiveControl import:
 *            → VIOLATION.
 *          – if the block imports a shared-component that writes these attrs AND
 *            those attrs only appear in edit.js as destructuring (not in
 *            setAttributes calls inside edit.js itself) → COMPLIANT.
 *        Conservative static analysis: if attrs appear in block.json but NEVER in
 *        the block's own setAttributes calls → 'unverifiable' (not a build fail;
 *        dead-control guard owns dead attrs). Dynamic-key construction
 *        (attributes[base+'Tablet']) is a known static blind spot — never
 *        false-positive on it.
 *
 *   Check (b): Unit-via-SelectControl detection
 *     Scan the block's own edit source (not shared components) for:
 *       <SelectControl … onChange={ … setAttributes( { …Unit… } ) … }
 *     Heuristic: find all setAttributes calls whose object literal contains a key
 *     matching /[A-Za-z]Unit$/ AND are enclosed within a SelectControl JSX
 *     element. A simpler regex-based approach: find SelectControl elements that
 *     contain an onChange prop that in turn calls setAttributes with a Unit key.
 *     Both the SelectControl opening tag and the setAttributes Unit key must
 *     appear within the SAME "proximity window" (100 chars) of the JSX — this
 *     catches the canonical pattern without AST parsing.
 *
 * SHARED-COMPONENT EXEMPTION:
 *   Imports from any of these paths indicate the block delegates to a shared
 *   component that is the canonical implementation:
 *     '../../components'
 *     '../../components/TypographyControls'
 *     '../../components/SpacingControl'
 *     '../../components/ResponsiveControl'
 *     '../container/components/ContainerWrapperControls'
 *     '../container/components'
 *   Blocks that import these and whose responsive/unit attrs only appear in
 *   destructuring (not in setAttributes calls in the block's own source) are
 *   compliant. If a block imports a shared component AND also writes its own
 *   duplicate control → it fails (belt-and-suspenders detection).
 *
 * BASELINE: scripts/control-ux-baseline.json
 *   Same format as dead-controls-baseline.json. Each entry: { check, block, attr,
 *   violation }. New violations in a baselined block/attr pair still fail the
 *   build — the baseline key is block:violation:attr (all three).
 *
 * Usage:
 *   node scripts/check-control-ux.js          # report (exit 0 unless net-new)
 *   node scripts/check-control-ux.js --check   # same, for prebuild/CI (exit 1 on net-new)
 *   node scripts/check-control-ux.js --json     # machine-readable findings
 *
 * Wired into `prebuild` / `prestart` in package.json alongside check-dead-controls.js.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const BASELINE_FILE = path.join( __dirname, 'control-ux-baseline.json' );

// ---------------------------------------------------------------------------
// Shared-component import paths that are the canonical owners of responsive
// controls and unit controls. If a block ONLY uses these paths for writing
// responsive/unit attrs, it is compliant for both checks.
// ---------------------------------------------------------------------------
const SHARED_COMPONENT_IMPORT_PATTERNS = [
	/from\s+['"]\.\.\/\.\.\/components['"]/,
	/from\s+['"]\.\.\/\.\.\/components\/TypographyControls['"]/,
	/from\s+['"]\.\.\/\.\.\/components\/SpacingControl['"]/,
	/from\s+['"]\.\.\/\.\.\/components\/ResponsiveControl['"]/,
	/from\s+['"]\.\.\/container\/components\/ContainerWrapperControls['"]/,
	/from\s+['"]\.\.\/container\/components['"]/,
];

// Component names used in JSX that indicate a shared-component usage.
const SHARED_COMPONENT_JSX_NAMES = [
	'TypographyControls',
	'SpacingControl',
	'ResponsiveControl',
	'ContainerWrapperControls',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

/**
 * Strip line + block comments. Same approach as check-dead-controls.js.
 */
function stripComments( src ) {
	return src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' )
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' )
		.replace( /^\s*#[^\n]*/gm, ' ' );
}

/**
 * Does the source import any shared component (for responsive/unit delegation)?
 */
function importsSharedComponent( src ) {
	return SHARED_COMPONENT_IMPORT_PATTERNS.some( ( re ) => re.test( src ) );
}

/**
 * Does the source USE (render) any shared component JSX element?
 * The component must appear as a JSX tag (<Foo ... or <Foo>) in the source.
 */
function usesSharedComponentJsx( src ) {
	return SHARED_COMPONENT_JSX_NAMES.some( ( name ) =>
		new RegExp( `<${ name }[\\s/>]` ).test( src )
	);
}

/**
 * Collect all attribute names written via setAttributes in the source.
 * Mirrors the heuristics from check-dead-controls.js (direct literals +
 * attrMap string values + update() pattern).
 */
function collectSetAttrsKeys( src ) {
	const keys = new Set();
	if ( ! src ) return keys;

	// Literal object keys inside setAttributes({ ... }).
	const setAttrRe = /setAttributes\(\s*\{\s*([^}]*)\}/g;
	let m;
	while ( ( m = setAttrRe.exec( src ) ) !== null ) {
		const body = m[ 1 ];
		const keyRe = /(?:^|[\s,])(?:['"]?)([A-Za-z_$][\w$]*)(?:['"]?)\s*:/g;
		let k;
		while ( ( k = keyRe.exec( body ) ) !== null ) {
			keys.add( k[ 1 ] );
		}
	}

	// attrMap / ATTR_MAP string values.
	const attrMapRe = /\b(?:attrMap|ATTR_MAP)\s*=\s*\{([^}]*)\}/g;
	while ( ( m = attrMapRe.exec( src ) ) !== null ) {
		const body = m[ 1 ];
		const valRe = /['"]([A-Za-z_$][\w$]*)['"]/g;
		let v;
		while ( ( v = valRe.exec( body ) ) !== null ) {
			keys.add( v[ 1 ] );
		}
	}

	// update('attrName', ...) helper pattern.
	const updateRe = /\bupdate\(\s*['"]([A-Za-z_$][\w$]*)['"]/g;
	while ( ( m = updateRe.exec( src ) ) !== null ) {
		keys.add( m[ 1 ] );
	}

	return keys;
}

/**
 * Collect responsive-family attr pairs from block.json attributes.
 * Returns an array of { base, tablet?, mobile? } for each base attr that has
 * at least one breakpoint sibling declared.
 *
 * Only considers attrs whose BASE is not itself a Tablet/Mobile variant
 * (i.e. base doesn't end in Tablet or Mobile).
 */
function collectResponsiveFamilies( attrs ) {
	const keys = new Set( Object.keys( attrs ) );
	const families = [];

	for ( const key of keys ) {
		// Skip if this key IS a breakpoint variant.
		if ( /Tablet$|Mobile$/.test( key ) ) continue;

		const hasTablet = keys.has( key + 'Tablet' );
		const hasMobile = keys.has( key + 'Mobile' );

		if ( hasTablet || hasMobile ) {
			families.push( {
				base: key,
				tablet: hasTablet ? key + 'Tablet' : null,
				mobile: hasMobile ? key + 'Mobile' : null,
			} );
		}
	}

	return families;
}

// ---------------------------------------------------------------------------
// Check (a) — RESPONSIVE-FAMILY-WITHOUT-SWITCHER
// ---------------------------------------------------------------------------

/**
 * For a given block, check whether any responsive attr family is written
 * directly in the block's own edit.js without routing through a shared
 * component that owns the ResponsiveControl.
 *
 * Returns an array of finding objects.
 */
function checkResponsiveSwitcher( blockName, blockDir, attrs ) {
	const findings = [];
	const editJs = stripComments( readIfExists( path.join( blockDir, 'edit.js' ) ) );
	if ( ! editJs ) return findings;

	// Collect all local component files in the block's own dir (components/ or *.js).
	let blockOwnSrc = editJs;
	const blockComponentsDir = path.join( blockDir, 'components' );
	if ( fs.existsSync( blockComponentsDir ) ) {
		for ( const f of fs.readdirSync( blockComponentsDir ) ) {
			if ( f.endsWith( '.js' ) ) {
				blockOwnSrc += '\n' + stripComments( readIfExists( path.join( blockComponentsDir, f ) ) );
			}
		}
	}

	// If the block's own source imports AND uses a shared component, those attrs
	// are delegated to the shared component — compliant.
	const delegatesViaShared = importsSharedComponent( blockOwnSrc ) && usesSharedComponentJsx( blockOwnSrc );

	// Attrs written directly via setAttributes in the block's own source.
	const ownSetAttrs = collectSetAttrsKeys( blockOwnSrc );

	// Responsive families from block.json.
	const families = collectResponsiveFamilies( attrs );

	for ( const family of families ) {
		const variants = [ family.tablet, family.mobile ].filter( Boolean );
		for ( const variant of variants ) {
			if ( ! ownSetAttrs.has( variant ) ) {
				// The variant is not written by the block's own code at all.
				// Conservative: skip — either it's dynamic-key (blind spot) or dead.
				// Dead-control guard owns that case.
				continue;
			}

			// The block's own code writes a Tablet/Mobile variant directly.
			// Is this writing inside a shared-component call? We check by verifying
			// whether the block delegates the entire family to a shared component
			// (imports + uses it) AND the base attr is NOT also in ownSetAttrs.
			// If the block delegates via shared AND still has own setAttributes for
			// the variant, that's a redundant direct control (violation).
			if ( delegatesViaShared ) {
				// Shared component is mounted. If the variant write is in the block's
				// own code (not inside a shared component file), it is a duplicate
				// direct control alongside the shared one → violation.
				// We report it; if it is intentional it goes in the baseline.
				findings.push( {
					check: 'control-ux',
					block: blockName,
					attr: variant,
					violation: 'RESPONSIVE-FAMILY-WITHOUT-SWITCHER',
					reason:
						`Block writes ${ variant } directly via setAttributes in its own edit.js ` +
						`even though a shared responsive component is also mounted. ` +
						`Either remove the direct control (delegate fully to the shared component) ` +
						`or wrap the direct control in <ResponsiveControl>.`,
				} );
			} else {
				// No shared-component delegation found. Direct write = violation.
				findings.push( {
					check: 'control-ux',
					block: blockName,
					attr: variant,
					violation: 'RESPONSIVE-FAMILY-WITHOUT-SWITCHER',
					reason:
						`Block declares responsive family ${ family.base }/${ variant } and writes ` +
						`${ variant } via setAttributes in its own edit.js without a ` +
						`<ResponsiveControl> wrapper or delegation to a shared component ` +
						`(TypographyControls/SpacingControl/ContainerWrapperControls).`,
				} );
			}
		}
	}

	return findings;
}

// ---------------------------------------------------------------------------
// Check (b) — UNIT-VIA-SELECTCONTROL
// ---------------------------------------------------------------------------

/**
 * For a given block, check whether any SelectControl in the block's own edit
 * source writes an attribute ending in 'Unit' via setAttributes.
 *
 * Detection heuristic:
 *   Find every setAttributes call that writes a key matching /[A-Za-z]Unit$/.
 *   Then check if that setAttributes call appears in proximity to a SelectControl
 *   JSX element (within the same slice of source, capturing the surrounding
 *   ~250 chars before the setAttributes call).
 *
 * Shared-component usage is exempt: if the only SelectControl+Unit writes come
 * from shared components (TypographyControls etc.) → compliant.
 *
 * Returns an array of finding objects.
 */
function checkUnitSelectControl( blockName, blockDir, attrs ) {
	const findings = [];
	const editJs = stripComments( readIfExists( path.join( blockDir, 'edit.js' ) ) );
	if ( ! editJs ) return findings;

	// Also scan block-local component files.
	let blockOwnSrc = editJs;
	const blockComponentsDir = path.join( blockDir, 'components' );
	if ( fs.existsSync( blockComponentsDir ) ) {
		for ( const f of fs.readdirSync( blockComponentsDir ) ) {
			if ( f.endsWith( '.js' ) ) {
				blockOwnSrc += '\n' + stripComments( readIfExists( path.join( blockComponentsDir, f ) ) );
			}
		}
	}

	const attrKeys = new Set( Object.keys( attrs ) );

	// Find all setAttributes({ ...Unit... }) calls in the block's own source.
	const setAttrRe = /setAttributes\(\s*\{\s*([^}]*)\}/g;
	let m;
	const unitWrites = [];

	while ( ( m = setAttrRe.exec( blockOwnSrc ) ) !== null ) {
		const matchIndex = m.index;
		const body = m[ 1 ];
		const keyRe = /(?:^|[\s,])(?:['"]?)([A-Za-z_$][\w$]*)(?:['"]?)\s*:/g;
		let k;
		while ( ( k = keyRe.exec( body ) ) !== null ) {
			const attrName = k[ 1 ];
			if ( /[A-Za-z]Unit$/.test( attrName ) && attrKeys.has( attrName ) ) {
				unitWrites.push( { attrName, matchIndex } );
			}
		}
	}

	for ( const { attrName, matchIndex } of unitWrites ) {
		// Grab the ~300 characters before the setAttributes call to find the
		// surrounding JSX context.
		const precedingSlice = blockOwnSrc.slice( Math.max( 0, matchIndex - 300 ), matchIndex );

		// Check: does SelectControl appear in the preceding slice?
		const selectControlInScope = /SelectControl/.test( precedingSlice );

		if ( ! selectControlInScope ) {
			// Not inside a SelectControl context — skip.
			continue;
		}

		// It IS inside a SelectControl. Now check if it's exempt via a shared
		// component: if the SelectControl that writes this Unit attr is itself
		// inside a shared-component file (which we've excluded from blockOwnSrc
		// since we only concatenate the block's own dir), it won't appear here.
		// Any match here is in block-own code → violation.
		findings.push( {
			check: 'control-ux',
			block: blockName,
			attr: attrName,
			violation: 'UNIT-VIA-SELECTCONTROL',
			reason:
				`Block has a SelectControl writing ${ attrName } via setAttributes in its own ` +
				`edit.js. Replace with a <UnitControl> (integrated unit-inside-input) or delegate ` +
				`to a shared component (TypographyControls/SpacingControl).`,
		} );
	}

	return findings;
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return [];
	}
	try {
		const data = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
		return Array.isArray( data.accepted ) ? data.accepted : [];
	} catch ( e ) {
		throw new Error( `Invalid control-ux-baseline.json: ${ e.message }` );
	}
}

function findingKey( f ) {
	// Key on block + violation + attr — a new violation type on a baselined block
	// still fails; a new attr on the same violation type in a baselined block also fails.
	return `${ f.block }:${ f.violation }:${ f.attr }`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	const checkMode = process.argv.includes( '--check' );
	const asJson = process.argv.includes( '--json' );
	const seedMode = process.argv.includes( '--seed' );

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => ( { name: d.name, dir: path.join( BLOCKS_DIR, d.name ) } ) );

	let allFindings = [];

	for ( const { name, dir } of blockDirs ) {
		const blockJsonPath = path.join( dir, 'block.json' );
		if ( ! fs.existsSync( blockJsonPath ) ) continue;

		let meta;
		try {
			meta = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
		} catch ( e ) {
			process.stderr.write( `[check-control-ux] Invalid block.json in ${ name }: ${ e.message }\n` );
			continue;
		}

		const attrs = meta.attributes || {};
		const blockName = meta.name || name;

		allFindings = allFindings.concat(
			checkResponsiveSwitcher( blockName, dir, attrs ),
			checkUnitSelectControl( blockName, dir, attrs )
		);
	}

	if ( seedMode ) {
		// Write every finding to the baseline (used once to seed initial state).
		const existing = loadBaseline();
		const existingKeys = new Set( existing.map( findingKey ) );
		const newEntries = allFindings
			.filter( ( f ) => ! existingKeys.has( findingKey( f ) ) )
			.map( ( f ) => ( {
				check: f.check,
				block: f.block,
				attr: f.attr,
				violation: f.violation,
				reason: `Baselined on seed run ${ new Date().toISOString().slice( 0, 10 ) }. Fix: ${ f.reason }`,
			} ) );
		const merged = [ ...existing, ...newEntries ];
		fs.writeFileSync(
			BASELINE_FILE,
			JSON.stringify( { _comment: 'Accepted control-ux violations (check-control-ux.js). Each entry is a known issue accepted with a reason. The guard fails the build on violations NOT listed here. Key shape: { check, block, attr, violation, reason }. To accept, add here; to fix, update the block + delete the entry.', accepted: merged }, null, '\t' ) + '\n'
		);
		process.stdout.write(
			`[check-control-ux] Seeded ${ newEntries.length } new baseline entries (total: ${ merged.length }).\n`
		);
		process.exit( 0 );
	}

	// Baseline subtraction.
	const baseline = new Set( loadBaseline().map( findingKey ) );
	const netNew = allFindings.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const accepted = allFindings.filter( ( f ) => baseline.has( findingKey( f ) ) );

	if ( asJson ) {
		process.stdout.write(
			JSON.stringify( { netNew, accepted, baselineSize: baseline.size }, null, 2 ) + '\n'
		);
	} else {
		if ( accepted.length ) {
			process.stdout.write(
				`[check-control-ux] ${ accepted.length } baselined violation(s) (accepted).\n`
			);
		}
		if ( netNew.length ) {
			process.stdout.write( `\n[check-control-ux] ${ netNew.length } net-new violation(s):\n\n` );
			for ( const f of netNew ) {
				process.stdout.write(
					`  BLOCK:     ${ f.block }\n` +
					`  ATTR:      ${ f.attr }\n` +
					`  VIOLATION: ${ f.violation }\n` +
					`  REASON:    ${ f.reason }\n\n`
				);
			}
		} else {
			process.stdout.write( '[check-control-ux] No net-new control-UX violations.\n' );
		}
	}

	if ( ( checkMode || seedMode === false ) && netNew.length > 0 ) {
		process.exit( 1 );
	}
}

main();
