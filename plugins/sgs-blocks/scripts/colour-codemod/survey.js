'use strict';

/**
 * survey.js — the CENSUS half of the colour-conformance triad (D542).
 *
 * WHY THIS EXISTS. rule 31 already answers "which rows are wrong?" (388
 * findings across 61 blocks). It does NOT answer "which of those can a codemod
 * fix without guessing?", and that is the only question deciding whether this
 * is one script or fifteen agent dispatches. D542 is explicit: if an item
 * touches more than ~3 blocks the first deliverable is the detector, not the
 * edit — and the survey runs BEFORE the design, not after it.
 *
 * IT WRITES NOTHING. Census only. The --fix half is deliberately not in this
 * file yet: a fixer written before its own census has no way to know what it
 * should be refusing.
 *
 * AUTOFIXABILITY IS GATED ON THE BLOCK'S OWN EMISSION CAPABILITY. Adding a hover
 * state or a gradient path is two mechanical edits (edit.js + block.json). The
 * THIRD edit — emitting the actual CSS rule — needs a real SELECTOR.
 *
 * ⛔ DO NOT USE block_attributes.derived_selector FOR THIS. Its name is a trap.
 * An earlier version of this survey classified on it and reported 58%
 * autofixable; that number was WRONG. Verified by grepping the tree: ZERO of its
 * values exist as classes anywhere — `.sgs-button__letterSpacing`,
 * `.sgs-card-grid__gap`, even the plausible-looking `.sgs-accordion__header` all
 * return 0 files. It is a synthetic per-attribute identifier, not a CSS emit
 * target.
 *
 * The clinching case: sgs/accordion.headerColour does not render in
 * sgs/accordion AT ALL. block.json:279 passes it via providesContext
 * ("sgs/accordionHeaderColour") to the CHILD block sgs/accordion-item, which
 * owns the real class .sgs-accordion-item__header. A selector can live in a
 * DIFFERENT BLOCK, so no per-attribute column could encode it.
 *
 * So capability is read from the block's OWN render.php: does it already call a
 * colour helper (and therefore already have a scoped selector in hand), and does
 * it already emit state-aware CSS? Anything else is refused with a named reason
 * — the same refuse-rather-than-guess rule migrate-tier-object.py applies to
 * its UNCLEAR class.
 *
 * Reuses core/golden.js + core/sources.js wholesale. collectIndirectRowSources
 * in particular cost a 33-row undercount to get right (product-card, nav-menu
 * and social-icons build their rows prop indirectly and scored ZERO before it
 * existed). It must never be reimplemented alongside the original.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const { SourceCache } = require( '../inspector-scan/core/sources' );
const {
	collectIndirectRowSources,
	jsxName,
	findJsxAttr,
	jsxAttrExpr,
	unwrapRowObject,
	objProp,
	stringLiteralValue,
	booleanLiteralValue,
	normalStateAttrName,
	statesArrayHasGradient,
	slugify,
	resolveMechanismFromCssProperty,
	describeRow,
} = require( '../inspector-scan/core/golden' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );
const EXPORTER = path.join(
	PLUGIN_ROOT,
	'scripts',
	'inspector-scan',
	'export-colour-css-property.py'
);

/**
 * Rich DB rows. Fails CLOSED — a silent empty map here would classify every
 * row as NEEDS-DATA and read as "nothing is auto-fixable", which is
 * indistinguishable from a correct answer. Same guard rule 31 already carries.
 */
function loadDbRows() {
	const out = execFileSync( 'python', [ EXPORTER, '--rich' ], { encoding: 'utf8' } );
	if ( ! out || ! out.trim() ) {
		throw new Error(
			'survey: exporter returned nothing — refusing to treat every row as unresolved.'
		);
	}
	return JSON.parse( out );
}

/**
 * Can this attribute's EXISTING paint path carry a gradient?
 *
 * ⛔ THIS IS THE QUESTION THE FIRST TWO VERSIONS OF THIS SURVEY DID NOT ASK, and it
 * cost a whole task. `AUTOFIXABLE:helper-at-existing-selector` only ever established
 * that the block emits colour SOMEWHERE it owns. Task 2 was scoped at 38 rows on that
 * verdict and delivered 2, because 19 of 24 gradient rows paint through a CSS CUSTOM
 * PROPERTY holding a colour (`--sgs-mm-card`, `--sgs-tab-text`). A custom property
 * holding a colour cannot carry a gradient — a gradient is `background-image`, a
 * different CSS property. Those rows were correctly refused by the fixer, but the
 * census had already promised them. A census that over-promises is worse than one that
 * under-counts: it scopes work that cannot be delivered.
 *
 * BIASED CONSERVATIVE ON PURPOSE: returns false unless extensibility is PROVEN.
 * Under-promising costs a re-measure; over-promising costs a task.
 *
 * Two hops, because that is the shape the tree actually uses (verified):
 *   $nav_bg = isset( $attributes['navBg'] ) ? (string) $attributes['navBg'] : '';
 *   ... sgs_background_paint_decl( $nav_bg, $nav_bg_gradient )
 */
const GRADIENT_CAPABLE_HELPERS = [
	'sgs_background_paint_decl',
	'sgs_border_gradient_css',
	'sgs_resolve_text_colour_or_gradient',
];

function gradientExtensibility( php, attr ) {
	if ( ! php || ! attr ) return { extensible: false, reason: 'no-render-source' };

	// No regex-escaping needed anywhere below: an attribute name is always a plain
	// JS identifier and a PHP local is always [A-Za-z_][A-Za-z0-9_]*. An earlier
	// version carried escape() calls "for safety" and the escaping itself was the
	// only thing that broke — unnecessary defence against impossible input.
	const HELPERS = GRADIENT_CAPABLE_HELPERS.join( '|' );

	// Hop 1 — the attribute read directly as a gradient-capable helper's argument.
	const direct = new RegExp( '(' + HELPERS + ')\\([^)]*attributes\\[\\s*[\'"]' + attr + '[\'"]' );
	if ( direct.test( php ) ) return { extensible: true, reason: 'direct-helper-arg' };

	// Hop 2 — the attribute is bound to a local $var; is THAT var passed to one?
	const bind = new RegExp(
		'\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=[^;\\n]*attributes\\[\\s*[\'"]' + attr + '[\'"]',
		'g'
	);
	const vars = [];
	let m;
	while ( ( m = bind.exec( php ) ) !== null ) vars.push( m[ 1 ] );

	for ( const v of vars ) {
		if ( new RegExp( '(' + HELPERS + ')\\([^)]*\\$' + v + '\\b' ).test( php ) ) {
			return { extensible: true, reason: 'helper-via-local-var' };
		}
	}

	// Negative evidence — NAME the blocker, so a refusal is actionable, not a shrug.
	for ( const v of vars ) {
		if ( new RegExp( '--sgs-[a-z0-9-]+\\s*:[^;]*\\$' + v + '\\b' ).test( php ) ) {
			return { extensible: false, reason: 'paints-via-colour-valued-custom-property' };
		}
	}
	for ( const v of vars ) {
		if ( new RegExp( 'sgs_text_colour_decl\\([^)]*\\$' + v + '\\b' ).test( php ) ) {
			return { extensible: false, reason: 'text-colour-decl-takes-no-gradient' };
		}
	}
	return { extensible: false, reason: 'no-gradient-capable-paint-path-found' };
}

function blockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter( ( n ) => fs.existsSync( path.join( BLOCKS_DIR, n, 'block.json' ) ) )
		.sort();
}

/** Every colour ROW in one edit.js, mirroring rule 31's own walk exactly. */
function rowsInFile( cache, file ) {
	const rows = [];
	if ( ! fs.existsSync( file ) ) return rows;

	const { pushedRows, declaredArrays } = collectIndirectRowSources(
		( visitors ) => cache.traverse( file, visitors ),
		unwrapRowObject
	);

	function resolveArrayLike( node, depth ) {
		if ( ! node || depth > 6 ) return [];
		if ( node.type === 'ArrayExpression' ) {
			return node.elements.flatMap( ( el ) =>
				el && el.type === 'SpreadElement'
					? resolveArrayLike( el.argument, depth + 1 )
					: [ el ]
			);
		}
		if ( node.type === 'Identifier' ) {
			if ( pushedRows[ node.name ] ) return pushedRows[ node.name ];
			if ( declaredArrays[ node.name ] ) {
				return resolveArrayLike( declaredArrays[ node.name ], depth + 1 );
			}
			return [];
		}
		if ( node.type === 'ConditionalExpression' ) {
			return resolveArrayLike( node.consequent, depth + 1 ).concat(
				resolveArrayLike( node.alternate, depth + 1 )
			);
		}
		if (
			node.type === 'CallExpression' &&
			node.callee &&
			node.callee.type === 'MemberExpression' &&
			node.callee.property &&
			node.callee.property.name === 'filter'
		) {
			return resolveArrayLike( node.callee.object, depth + 1 );
		}
		return [];
	}

	cache.traverse( file, {
		JSXOpeningElement( p ) {
			const node = p.node;
			const name = jsxName( node );
			if ( ! name ) return;
			const line = node.loc ? node.loc.start.line : 0;

			if ( name === 'SgsColourPanel' ) {
				const rowsExpr = jsxAttrExpr( node, 'rows' );
				if ( ! rowsExpr ) return;
				// describeRow normalises BOTH shapes — a literal row object and a
				// colour-variant helper CALL (fillRow({...})). Reading only
				// ObjectExpressions here is what made an adopted row VANISH from the
				// census (255 -> 254) while still rendering perfectly: the count fell,
				// which reads like progress. One shared normaliser so rule 31 and this
				// survey can never disagree about what a row is.
				for ( const el of resolveArrayLike( rowsExpr, 0 ) ) {
					const d = describeRow( el );
					if ( ! d ) continue;
					rows.push( {
						rowKey: d.rowKey || 'row-line-' + line,
						line: d.line || line,
						statesCount: d.statesCount,
						attr: d.attrName,
						hasGradient: d.hasGradient,
						via: d.viaHelper ? 'helper:' + d.viaHelper : 'SgsColourPanel',
					} );
				}
				return;
			}

			if ( name === 'DesignTokenPicker' ) {
				const statesExpr = jsxAttrExpr( node, 'states' );
				const labelExpr = jsxAttrExpr( node, 'label' );
				let labelText = null;
				if (
					labelExpr &&
					labelExpr.type === 'CallExpression' &&
					labelExpr.arguments[ 0 ] &&
					labelExpr.arguments[ 0 ].type === 'StringLiteral'
				) {
					labelText = labelExpr.arguments[ 0 ].value;
				}
				const isArr = statesExpr && statesExpr.type === 'ArrayExpression';
				rows.push( {
					rowKey: labelText ? slugify( labelText ) : 'standalone-line-' + line,
					line,
					statesCount: isArr ? statesExpr.elements.length : 1,
					attr: isArr ? normalStateAttrName( statesExpr ) : null,
					hasGradient: isArr
						? statesArrayHasGradient( statesExpr )
						: !! findJsxAttr( node, 'gradientValue' ) ||
						  !! findJsxAttr( node, 'onGradientChange' ),
					via: 'DesignTokenPicker',
				} );
			}
		},
	} );

	return rows;
}

function main() {
	const db = loadDbRows();
	const cache = new SourceCache();
	const results = [];

	for ( const dir of blockDirs() ) {
		const slug = 'sgs/' + dir;
		const editFile = path.join( BLOCKS_DIR, dir, 'edit.js' );
		const renderFile = path.join( BLOCKS_DIR, dir, 'render.php' );
		const php = fs.existsSync( renderFile ) ? fs.readFileSync( renderFile, 'utf8' ) : '';
		const wrapperRouted = /SGS_Container_Wrapper::render/.test( php );
		// Does this block already hold a scoped selector it emits colour CSS at?
		// That, not a DB column, is what makes the render half mechanical.
		const emitsColour = [
			'sgs_text_colour_decl',
			'sgs_background_paint_decl',
			'sgs_border_gradient_css',
			'sgs_emit_state_colour_css',
			'sgs_colour_value',
		].some( ( h ) => php.includes( h + '(' ) );
		const emitsState = php.includes( 'sgs_emit_state_colour_css' ) || php.includes( ':hover' );

		for ( const row of rowsInFile( cache, editFile ) ) {
			const dbRow = row.attr && db[ slug ] ? db[ slug ][ row.attr ] : null;
			const cssProperty = dbRow ? dbRow.css_property : null;
			const selector = dbRow ? dbRow.derived_selector : null;
			// resolveMechanismFromCssProperty returns { mechanisms: [...], unresolved }
			// — an ARRAY, plural. Reading a singular `.mechanism` off it yields
			// undefined, which is falsy, which silently classified EVERY row as
			// NEEDS-DATA:no-css_property and reported 0% autofixable. Verified the
			// real shape by calling the function, not by assuming it.
			// It is plural on purpose: one css_property can legitimately map to more
			// than one mechanism (css_property 'color' is shared by genuine text and
			// by SVG-icon fill-via-currentColor).
			const mech = resolveMechanismFromCssProperty( cssProperty );
			const mechanisms = mech.unresolved ? [] : mech.mechanisms || [];
			const mechanism = mechanisms.length ? mechanisms.join( '|' ) : null;

			const needsHover = row.statesCount < 2;
			// Shadow has no gradient form — exempt BY MECHANISM, never per block.
			const needsGradient = ! row.hasGradient && ! mechanisms.includes( 'shadow' );

			let verdict;
			if ( ! needsHover && ! needsGradient ) {
				verdict = 'CONFORMANT';
			} else if ( ! row.attr ) {
				verdict = 'REFUSED:unresolvable-attr';
			} else if ( ! mechanism ) {
				verdict = 'REFUSED:no-css_property';
			} else if ( needsGradient && ! gradientExtensibility( php, row.attr ).extensible ) {
				// A row needing a GRADIENT is only autofixable if its EXISTING paint
				// path can actually carry one. This is the check whose absence scoped
				// Task 2 at 38 rows and delivered 2: 19 of 24 gradient rows paint via a
				// colour-valued CSS custom property, which cannot hold a gradient.
				// The reason is carried in the verdict so a refusal is actionable.
				verdict =
					'REFUSED:gradient-not-extensible:' +
					gradientExtensibility( php, row.attr ).reason;
			} else if ( emitsState ) {
				// Block already emits state-aware colour CSS at its own selector:
				// a shared helper adds the hover variant at that SAME selector.
				verdict = 'AUTOFIXABLE:helper-at-existing-selector';
			} else if ( emitsColour ) {
				// Selector exists but no state machinery yet — mechanical, but it
				// wires in the state emitter rather than reusing one.
				verdict = 'AUTOFIXABLE:wire-state-emitter';
			} else if ( wrapperRouted ) {
				verdict = 'AUTOFIXABLE:wrapper-emits';
			} else {
				verdict = 'REFUSED:block-emits-no-colour-css';
			}

			results.push( {
				block: slug,
				...row,
				cssProperty,
				mechanism,
				selector,
				wrapperRouted,
				emitsColour,
				emitsState,
				needsHover,
				needsGradient,
				verdict,
			} );
		}
	}

	if ( process.argv.includes( '--json' ) ) {
		process.stdout.write( JSON.stringify( { rows: results }, null, 1 ) );
		return;
	}

	const counts = {};
	for ( const r of results ) counts[ r.verdict ] = ( counts[ r.verdict ] || 0 ) + 1;
	const nonConf = results.filter( ( r ) => r.verdict !== 'CONFORMANT' );
	const blocks = new Set( results.map( ( r ) => r.block ) ).size;

	console.log(
		'\ncolour-conformance SURVEY — ' + results.length + ' colour rows across ' + blocks + ' blocks\n'
	);
	Object.entries( counts )
		.sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
		.forEach( ( [ k, v ] ) => console.log( '  ' + String( v ).padStart( 4 ) + '  ' + k ) );

	const fixable = Object.entries( counts ).filter( ( [ k ] ) => k.startsWith( 'AUTOFIXABLE' ) ).reduce( ( a, [ , v ] ) => a + v, 0 );
	const pct = nonConf.length ? Math.round( ( fixable / nonConf.length ) * 100 ) : 0;
	console.log(
		'\n  of ' + nonConf.length + ' non-conformant rows, ' + fixable +
		' are AUTOFIXABLE (' + pct + '%)'
	);
	console.log( '  the rest are REFUSED with a named reason — never guessed.\n' );

	const byBlock = {};
	for ( const r of nonConf ) {
		byBlock[ r.block ] = byBlock[ r.block ] || { fix: 0, data: 0 };
		if ( r.verdict.startsWith( 'AUTOFIXABLE' ) ) byBlock[ r.block ].fix++;
		else byBlock[ r.block ].data++;
	}
	console.log( '  top blocks (autofixable / needs-data):' );
	Object.entries( byBlock )
		.sort( ( a, b ) => b[ 1 ].fix + b[ 1 ].data - ( a[ 1 ].fix + a[ 1 ].data ) )
		.slice( 0, 12 )
		.forEach( ( [ b, c ] ) =>
			console.log(
				'    ' + b.padEnd( 26 ) + String( c.fix ).padStart( 3 ) + ' / ' + c.data
			)
		);
	console.log();
}

main();
