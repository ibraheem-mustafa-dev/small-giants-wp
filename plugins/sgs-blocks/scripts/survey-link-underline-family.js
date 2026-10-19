#!/usr/bin/env node
'use strict';

/**
 * survey-link-underline-family.js: every block that underlines the links inside its text declares the whole
 * link-underline setting set, wires it into its inspector and its canvas preview, and is registered (Spec 32 FR-32-24).
 *
 * The set, per link prefix P (`''` for the block's own text, `desc`, `attribution`, `quote`, `description`):
 *   {P}LinkUnderline (enum '', none, always, hover, sweep), {P}LinkUnderlineThickness, {P}LinkUnderlineColour,
 *   {P}LinkUnderlineColourHover, {P}LinkUnderlineOffset.
 *
 *   --survey [--json]   census: each block and prefix, and what is declared, claimed, wired and registered
 *   --fix [--apply]     unified diff (or, with --apply, the write) of: the missing block.json attributes, the widened
 *                       enum, the `supports.sgs.elements` claims (base and hover), the `<LinkUnderlineControl>` props,
 *                       the `linkUnderlinePreviewCss(` keys and their destructured names in edit.js, the
 *                       attr-classification-overrides.json rows, and a `none`/`always` mode list in a render.php that
 *                       lacks `hover`
 *   --check             exit 1 while any block lacks a sibling, a claim, a prop, a key, a render call or an override row;
 *                       while a registry lacks the new suffixes; or while the three enumerations of the family disagree
 *   --self-test         the rules against built-in fixtures (no repository file is read or written)
 *   --block <dir>       limit --survey and --fix to one block folder (repeatable)
 *
 * The family is read from block.json (any attribute named `linkUnderline` or ending in `LinkUnderline`) and reconciled
 * against two dumb enumerations: render.php files that call `sgs_link_underline_css(` and src files that mount
 * `<LinkUnderlineControl` or call `linkUnderlinePreviewCss(`. EXPECTED_BLOCKS and EXPECTED_PREFIX_COUNT declare the
 * population, so a block added or lost is a decision, not an accident. Anything the rules cannot place is listed as
 * unrecognised and never guessed.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const os = require( 'os' );
const { spawnSync } = require( 'child_process' );
const babelParser = require( '@babel/parser' );

const PLUGIN_ROOT = path.resolve( __dirname, '..' );
const SRC_DIR = path.join( PLUGIN_ROOT, 'src' );
const BLOCKS_DIR = path.join( SRC_DIR, 'blocks' );
const REGISTRY_FILES = {
	overrides: path.join( __dirname, 'attr-classification-overrides.json' ),
	deadControls: path.join( __dirname, 'check-dead-controls.js' ),
	suffixes: path.join( __dirname, 'data', 'property-suffixes.json' ),
	clusters: path.join( __dirname, 'consistency', 'cluster-member-sets.json' ),
	settings: path.join( __dirname, 'consistency', 'setting-registry.json' ),
};

// The population the family is declared to have (plan 2026-10-19-control-gaps-build.md, Design G11).
const EXPECTED_BLOCKS = [ 'business-info', 'collapsible-text', 'heading', 'icon-list', 'label', 'product-card', 'quote', 'testimonial', 'text', 'timeline' ];
const EXPECTED_PREFIX_COUNT = 11;

const MODES = [ '', 'none', 'always', 'hover', 'sweep' ];
const MODES_JSON = '[ ' + MODES.map( ( m ) => JSON.stringify( m ) ).join( ', ' ) + ' ]';

// The three attributes G11 adds beside {P}LinkUnderline and {P}LinkUnderlineThickness.
const NEW = [
	{
		prop: 'colour',
		handler: 'onColourChange',
		suffix: 'Colour',
		claim: 'css:text-decoration-color-link',
		state: false,
		cssProperty: 'text-decoration-color',
		role: 'color',
		description: "The link underline's colour for always, hover and sweep (a palette slug or any CSS colour); empty draws it in the link's own colour. sgs_link_underline_css().",
	},
	{
		prop: 'colourHover',
		handler: 'onColourHoverChange',
		suffix: 'ColourHover',
		claim: 'css:text-decoration-color-link',
		state: true,
		cssProperty: 'text-decoration-color',
		role: 'color',
		description: "The link underline's colour while the link is hovered or focused with the keyboard (a palette slug or any CSS colour); empty keeps the colour it has at rest. sgs_link_underline_css().",
	},
	{
		prop: 'offset',
		handler: 'onOffsetChange',
		suffix: 'Offset',
		claim: 'css:text-decoration-offset-link',
		state: false,
		cssProperty: 'text-underline-offset',
		role: 'typography',
		description: "Gap between the link text and its underline for always and hover (a CSS length); empty uses the browser's. The sweep is a background line, so it ignores the gap. sgs_link_underline_css().",
	},
];
const NEW_SUFFIXES = NEW.map( ( n ) => n.suffix );
const REGISTRY_SUFFIXES = [ 'LinkUnderline', 'LinkUnderlineThickness', ...NEW_SUFFIXES.map( ( s ) => 'LinkUnderline' + s ) ];
const THICKNESS_CLAIM = 'css:text-decoration-thickness-link';
const MODE_CLAIM = 'css:text-decoration-link';
const NAME_RE = /^(?:(.+)L|l)inkUnderline$/;

const posix = ( p ) => p.split( path.sep ).join( '/' );
const rel = ( abs ) => posix( path.relative( PLUGIN_ROOT, abs ) );
const attrKey = ( prefix, suffix ) => ( prefix ? `${ prefix }LinkUnderline${ suffix }` : `linkUnderline${ suffix }` );

// ─── JSON text scanner (positions, so edits keep the file's own layout) ─────

function skipWs( text, i ) {
	let k = i;
	while ( k < text.length && /\s/.test( text[ k ] ) ) {
		k++;
	}
	return k;
}

function scanString( text, i ) {
	let k = i + 1;
	while ( k < text.length && '"' !== text[ k ] ) {
		k += '\\' === text[ k ] ? 2 : 1;
	}
	return k + 1;
}

function scanValueEnd( text, i ) {
	const c = text[ i ];
	if ( '"' === c ) {
		return scanString( text, i );
	}
	if ( '{' === c || '[' === c ) {
		return children( text, i ).close + 1;
	}
	let k = i;
	while ( k < text.length && ! /[\s,\]}]/.test( text[ k ] ) ) {
		k++;
	}
	return k;
}

/** The direct children of the object or array opening at `open`: { key|null, keyStart, valStart, valEnd }. */
function children( text, open ) {
	const isObject = '{' === text[ open ];
	const items = [];
	let i = skipWs( text, open + 1 );
	while ( i < text.length && '}' !== text[ i ] && ']' !== text[ i ] ) {
		const item = { key: null, keyStart: i, valStart: i, valEnd: i };
		if ( isObject ) {
			const keyEnd = scanString( text, i );
			item.key = JSON.parse( text.slice( i, keyEnd ) );
			i = skipWs( text, keyEnd );
			i = skipWs( text, i + 1 );
			item.valStart = i;
		}
		item.valEnd = scanValueEnd( text, item.valStart );
		items.push( item );
		i = skipWs( text, item.valEnd );
		if ( ',' === text[ i ] ) {
			i = skipWs( text, i + 1 );
		}
	}
	return { close: i, items };
}

const child = ( text, open, key ) => children( text, open ).items.find( ( it ) => it.key === key );

function descend( text, open, keys ) {
	let node = { valStart: open };
	for ( const key of keys ) {
		node = child( text, node.valStart, key );
		if ( ! node ) {
			return null;
		}
	}
	return node;
}

function lineIndent( text, pos ) {
	const start = text.lastIndexOf( '\n', pos - 1 ) + 1;
	let k = start;
	while ( k < text.length && ( ' ' === text[ k ] || '\t' === text[ k ] ) ) {
		k++;
	}
	return text.slice( start, k );
}

const indentUnit = ( indent ) => ( indent.includes( '\t' ) ? '\t' : '  ' );

// ─── block.json ─────────────────────────────────────────────────────────────

function planBlockJson( dir, text ) {
	const findings = [];
	const unrecognised = [];
	const edits = [];
	const json = JSON.parse( text );
	const attrs = json.attributes || {};
	const prefixes = Object.keys( attrs )
		.map( ( k ) => k.match( NAME_RE ) )
		.filter( Boolean )
		.map( ( m ) => m[ 1 ] || '' );
	const elementsNode = descend( text, text.indexOf( '{' ), [ 'supports', 'sgs', 'elements' ] );
	const attrsNode = child( text, text.indexOf( '{' ), 'attributes' );

	for ( const prefix of prefixes ) {
		const note = ( kind, detail, fixable ) => findings.push( { block: dir, prefix, file: 'block.json', kind, detail, fixable } );
		const modeKey = attrKey( prefix, '' );
		const thicknessKey = attrKey( prefix, 'Thickness' );
		const thicknessItem = child( text, attrsNode.valStart, thicknessKey );
		if ( ! thicknessItem ) {
			unrecognised.push( { block: dir, prefix, file: 'block.json', kind: 'no-thickness-attr', detail: `${ thicknessKey } is not declared, so there is no anchor for the new attributes` } );
			continue;
		}

		// The mode enum and the two descriptions that list the modes.
		const modeItem = child( text, attrsNode.valStart, modeKey );
		const enumItem = child( text, modeItem.valStart, 'enum' );
		if ( ! enumItem || JSON.stringify( attrs[ modeKey ].enum ) !== JSON.stringify( MODES ) ) {
			if ( enumItem ) {
				note( 'enum', `${ modeKey } enum is ${ JSON.stringify( attrs[ modeKey ].enum ) }, not ${ JSON.stringify( MODES ) }`, true );
				edits.push( { start: enumItem.valStart, end: enumItem.valEnd, text: MODES_JSON } );
				const desc = child( text, modeItem.valStart, 'description' );
				if ( desc && text.slice( desc.valStart, desc.valEnd ).includes( 'always, or sweep' ) ) {
					edits.push( { start: desc.valStart, end: desc.valEnd, text: text.slice( desc.valStart, desc.valEnd ).replace( 'always, or sweep', 'always, hover (an underline on hover and keyboard focus), or sweep' ) } );
				}
				const tDesc = child( text, thicknessItem.valStart, 'description' );
				if ( tDesc && text.slice( tDesc.valStart, tDesc.valEnd ).includes( 'for always and sweep' ) ) {
					edits.push( { start: tDesc.valStart, end: tDesc.valEnd, text: text.slice( tDesc.valStart, tDesc.valEnd ).replace( 'for always and sweep', 'for always, hover and sweep' ) } );
				}
			} else {
				unrecognised.push( { block: dir, prefix, file: 'block.json', kind: 'no-enum', detail: `${ modeKey } declares no enum` } );
			}
		}

		// The three sibling attributes.
		const missing = NEW.filter( ( n ) => ! attrs[ attrKey( prefix, n.suffix ) ] );
		if ( missing.length ) {
			const ind = lineIndent( text, thicknessItem.keyStart );
			const u = indentUnit( ind );
			const body = missing
				.map( ( n ) => {
					note( 'attr-missing', `${ attrKey( prefix, n.suffix ) } is not declared`, true );
					return `,\n${ ind }"${ attrKey( prefix, n.suffix ) }": {\n${ ind }${ u }"type": "string",\n${ ind }${ u }"default": "",\n${ ind }${ u }"description": ${ JSON.stringify( n.description ) }\n${ ind }}`;
				} )
				.join( '' );
			edits.push( { start: thicknessItem.valEnd, end: thicknessItem.valEnd, text: body } );
		}

		// The manifest claims on the element that already claims the mode.
		const element = elementsNode && children( text, elementsNode.valStart ).items.find( ( it ) => {
			const el = json.supports.sgs.elements[ it.key ];
			return el && el.attrMap && el.attrMap[ MODE_CLAIM ] === modeKey;
		} );
		if ( ! element ) {
			unrecognised.push( { block: dir, prefix, file: 'block.json', kind: 'no-element', detail: `no supports.sgs.elements entry maps ${ MODE_CLAIM } to ${ modeKey }` } );
			continue;
		}
		const el = json.supports.sgs.elements[ element.key ];
		const mapItem = child( text, element.valStart, 'attrMap' );
		const anchor = child( text, mapItem.valStart, THICKNESS_CLAIM ) || child( text, mapItem.valStart, MODE_CLAIM );
		const aInd = lineIndent( text, anchor.keyStart );
		const baseMissing = NEW.filter( ( n ) => ! n.state && el.attrMap[ n.claim ] !== attrKey( prefix, n.suffix ) );
		if ( baseMissing.length ) {
			baseMissing.forEach( ( n ) => note( 'claim-missing', `elements.${ element.key }.attrMap lacks ${ n.claim }: ${ attrKey( prefix, n.suffix ) }`, true ) );
			edits.push( { start: anchor.valEnd, end: anchor.valEnd, text: baseMissing.map( ( n ) => `,\n${ aInd }"${ n.claim }": "${ attrKey( prefix, n.suffix ) }"` ).join( '' ) } );
		}
		const hoverNew = NEW.find( ( n ) => n.state );
		const hoverKey = attrKey( prefix, hoverNew.suffix );
		const hoverMap = el.states && el.states.hover && el.states.hover.attrMap;
		if ( ! hoverMap || hoverMap[ hoverNew.claim ] !== hoverKey ) {
			note( 'claim-missing', `elements.${ element.key }.states.hover.attrMap lacks ${ hoverNew.claim }: ${ hoverKey }`, true );
			if ( hoverMap ) {
				const hoverItem = child( text, child( text, element.valStart, 'states' ).valStart, 'hover' );
				const hm = child( text, hoverItem.valStart, 'attrMap' );
				const last = children( text, hm.valStart ).items.slice( -1 )[ 0 ];
				edits.push( { start: last.valEnd, end: last.valEnd, text: `,\n${ lineIndent( text, last.keyStart ) }"${ hoverNew.claim }": "${ hoverKey }"` } );
			} else if ( el.states ) {
				unrecognised.push( { block: dir, prefix, file: 'block.json', kind: 'states-without-hover', detail: `elements.${ element.key }.states has no hover attrMap to extend` } );
			} else {
				const u = indentUnit( aInd );
				const eInd = lineIndent( text, mapItem.keyStart );
				const states = `,\n${ eInd }"states": {\n${ eInd }${ u }"hover": {\n${ eInd }${ u }${ u }"attrMap": {\n${ eInd }${ u }${ u }${ u }"${ hoverNew.claim }": "${ hoverKey }"\n${ eInd }${ u }${ u }}\n${ eInd }${ u }}\n${ eInd }}`;
				edits.push( { start: mapItem.valEnd, end: mapItem.valEnd, text: states } );
			}
		}
	}
	return { edits, findings, unrecognised, prefixes: [ ...new Set( prefixes ) ] };
}

// ─── edit.js ────────────────────────────────────────────────────────────────

function parseJs( source ) {
	return babelParser.parse( source, { sourceType: 'module', plugins: [ 'jsx' ], errorRecovery: false } );
}

function walkAst( node, visit ) {
	if ( ! node || 'object' !== typeof node ) {
		return;
	}
	if ( Array.isArray( node ) ) {
		node.forEach( ( n ) => walkAst( n, visit ) );
		return;
	}
	if ( 'string' === typeof node.type ) {
		visit( node );
	}
	for ( const key of Object.keys( node ) ) {
		if ( 'loc' !== key && 'extra' !== key ) {
			walkAst( node[ key ], visit );
		}
	}
}

/** The whitespace that precedes `pos` on its own line as '\n' + indent, or ' ' when the node follows others on a line. */
function separatorBefore( source, pos ) {
	let i = pos;
	while ( i > 0 && ( ' ' === source[ i - 1 ] || '\t' === source[ i - 1 ] ) ) {
		i--;
	}
	return i > 0 && '\n' === source[ i - 1 ] ? '\n' + source.slice( i, pos ) : ' ';
}

const IDENT_RE = /^[A-Za-z_$][\w$]*$/;
const lastSegment = ( expr ) => expr.split( '.' ).pop();

function planEditJs( dir, source, prefixes ) {
	const findings = [];
	const unrecognised = [];
	const edits = [];
	let ast;
	try {
		ast = parseJs( source );
	} catch ( e ) {
		return { edits, findings, unrecognised: [ { block: dir, prefix: null, file: 'edit.js', kind: 'parse-error', detail: e.message } ], coverage: { control: new Set(), preview: new Set() } };
	}
	const controls = [];
	const calls = [];
	const patternProps = new Map();
	// A block whose canvas preview IS its render.php (ServerSideRender) needs no preview twin.
	let serverRendered = false;
	walkAst( ast, ( n ) => {
		if ( 'JSXOpeningElement' === n.type && n.name && 'LinkUnderlineControl' === n.name.name ) {
			controls.push( n );
		} else if ( 'JSXOpeningElement' === n.type && n.name && 'ServerSideRender' === n.name.name ) {
			serverRendered = true;
		} else if ( 'CallExpression' === n.type && n.callee && 'linkUnderlinePreviewCss' === n.callee.name ) {
			calls.push( n );
		} else if ( 'ObjectPattern' === n.type ) {
			n.properties.forEach( ( p ) => {
				if ( 'ObjectProperty' === p.type && p.shorthand && 'Identifier' === p.key.type ) {
					patternProps.set( p.key.name, p );
				}
			} );
		}
	} );
	const coverage = { control: new Set(), preview: new Set() };
	const text = ( node ) => source.slice( node.start, node.end );
	const need = new Map(); // identifier -> thickness identifier, to destructure

	const addNeed = ( ident, thicknessIdent ) => {
		if ( IDENT_RE.test( ident ) && ! patternProps.has( ident ) && ! need.has( ident ) ) {
			need.set( ident, thicknessIdent );
		}
	};
	const bad = ( kind, detail, prefix ) => unrecognised.push( { block: dir, prefix: prefix ?? null, file: 'edit.js', kind, detail } );

	controls.forEach( ( ctl ) => {
		const attr = ( name ) => ctl.attributes.find( ( a ) => 'JSXAttribute' === a.type && a.name.name === name );
		const mode = attr( 'mode' );
		const thickness = attr( 'thickness' );
		const onThickness = attr( 'onThicknessChange' );
		if ( ! mode || ! thickness || ! onThickness || 'JSXExpressionContainer' !== mode.value?.type ) {
			bad( 'control-shape', '<LinkUnderlineControl> without mode, thickness and onThicknessChange props' );
			return;
		}
		const modeExpr = text( mode.value.expression );
		if ( ! NAME_RE.test( lastSegment( modeExpr ) ) ) {
			bad( 'control-shape', `<LinkUnderlineControl mode={ ${ modeExpr } }> does not read a LinkUnderline attribute` );
			return;
		}
		const m = lastSegment( modeExpr ).match( NAME_RE );
		const prefix = m[ 1 ] || '';
		coverage.control.add( prefix );
		const dataAt = [];
		const handlerAt = [];
		NEW.forEach( ( n ) => {
			const wantedValue = text( thickness.value.expression ).replace( /Thickness/g, n.suffix );
			const have = attr( n.prop );
			if ( have ) {
				if ( 'JSXExpressionContainer' !== have.value?.type || text( have.value.expression ) !== wantedValue ) {
					findings.push( { block: dir, prefix, file: 'edit.js', kind: 'control-binding', detail: `<LinkUnderlineControl ${ n.prop }> is not bound to ${ wantedValue }`, fixable: false } );
				}
			} else {
				findings.push( { block: dir, prefix, file: 'edit.js', kind: 'control-prop', detail: `<LinkUnderlineControl> lacks ${ n.prop }`, fixable: true } );
				dataAt.push( n.prop + text( thickness ).slice( 'thickness'.length ).replace( /Thickness/g, n.suffix ) );
			}
			const handlerHave = attr( n.handler );
			if ( ! handlerHave ) {
				findings.push( { block: dir, prefix, file: 'edit.js', kind: 'control-prop', detail: `<LinkUnderlineControl> lacks ${ n.handler }`, fixable: true } );
				handlerAt.push( n.handler + text( onThickness ).slice( 'onThicknessChange'.length ).replace( /Thickness/g, n.suffix ) );
			}
			addNeed( wantedValue, text( thickness.value.expression ) );
		} );
		if ( dataAt.length ) {
			edits.push( { start: thickness.end, end: thickness.end, text: dataAt.map( ( t ) => separatorBefore( source, thickness.start ) + t ).join( '' ) } );
		}
		if ( handlerAt.length ) {
			edits.push( { start: onThickness.end, end: onThickness.end, text: handlerAt.map( ( t ) => separatorBefore( source, onThickness.start ) + t ).join( '' ) } );
		}
	} );

	calls.forEach( ( call ) => {
		const obj = call.arguments[ 1 ];
		if ( ! obj || 'ObjectExpression' !== obj.type ) {
			bad( 'preview-shape', 'linkUnderlinePreviewCss( … ) without an options object as its second argument' );
			return;
		}
		const prop = ( name ) => obj.properties.find( ( p ) => 'ObjectProperty' === p.type && p.key.name === name );
		const mode = prop( 'mode' );
		const thickness = prop( 'thickness' );
		if ( ! mode || ! thickness || thickness.shorthand ) {
			bad( 'preview-shape', 'linkUnderlinePreviewCss options without mode and a non-shorthand thickness' );
			return;
		}
		const modeExpr = text( mode.value );
		if ( ! NAME_RE.test( lastSegment( modeExpr ) ) ) {
			bad( 'preview-shape', `linkUnderlinePreviewCss mode: ${ modeExpr } does not read a LinkUnderline attribute` );
			return;
		}
		const prefix = lastSegment( modeExpr ).match( NAME_RE )[ 1 ] || '';
		coverage.preview.add( prefix );
		const thicknessValue = text( thickness.value );
		if ( ! thicknessValue.includes( 'Thickness' ) ) {
			bad( 'preview-shape', `linkUnderlinePreviewCss thickness: ${ thicknessValue } does not read a Thickness attribute`, prefix );
			return;
		}
		const add = [];
		NEW.forEach( ( n ) => {
			const wantedValue = thicknessValue.replace( /Thickness/g, n.suffix );
			const have = prop( n.prop );
			if ( have ) {
				if ( have.shorthand || text( have.value ) !== wantedValue ) {
					findings.push( { block: dir, prefix, file: 'edit.js', kind: 'preview-binding', detail: `linkUnderlinePreviewCss ${ n.prop } is not ${ wantedValue }`, fixable: false } );
				}
			} else {
				findings.push( { block: dir, prefix, file: 'edit.js', kind: 'preview-key', detail: `linkUnderlinePreviewCss lacks ${ n.prop }`, fixable: true } );
				add.push( `${ n.prop }: ${ wantedValue }` );
			}
			addNeed( wantedValue, thicknessValue );
		} );
		if ( add.length ) {
			const sep = separatorBefore( source, thickness.start );
			edits.push( { start: thickness.end, end: thickness.end, text: add.map( ( t ) => ',' + sep + t ).join( '' ) } );
		}
	} );

	// Destructured names the new bindings read.
	const byAnchor = new Map();
	need.forEach( ( thicknessIdent, ident ) => {
		const list = byAnchor.get( thicknessIdent ) || [];
		list.push( ident );
		byAnchor.set( thicknessIdent, list );
	} );
	byAnchor.forEach( ( idents, thicknessIdent ) => {
		const anchor = patternProps.get( thicknessIdent );
		if ( ! anchor ) {
			bad( 'undeclared-name', `${ idents.join( ', ' ) } is read but not declared, and ${ thicknessIdent } is not destructured to anchor it` );
			return;
		}
		idents.forEach( ( ident ) => findings.push( { block: dir, prefix: null, file: 'edit.js', kind: 'destructure', detail: `${ ident } is not destructured from the attributes`, fixable: true } ) );
		edits.push( { start: anchor.end, end: anchor.end, text: idents.map( ( i ) => ',' + separatorBefore( source, anchor.start ) + i ).join( '' ) } );
	} );

	prefixes.forEach( ( p ) => {
		if ( ! coverage.control.has( p ) ) {
			bad( 'no-control', `no <LinkUnderlineControl> reads the '${ p }' prefix`, p );
		}
		if ( ! serverRendered && ! coverage.preview.has( p ) ) {
			bad( 'no-preview', `no linkUnderlinePreviewCss( … ) call reads the '${ p }' prefix`, p );
		}
	} );
	return { edits, findings, unrecognised, coverage };
}

// ─── render.php ─────────────────────────────────────────────────────────────

/** Comments blanked, same length, so offsets survive. */
function phpCodeMask( source ) {
	return source
		.replace( /\/\*[\s\S]*?\*\//g, ( m ) => m.replace( /[^\n]/g, ' ' ) )
		.replace( /^[ \t]*\/\/.*$/gm, ( m ) => ' '.repeat( m.length ) );
}

function renderPrefixes( source ) {
	const code = phpCodeMask( source );
	const out = [];
	const re = /sgs_link_underline_css\(\s*\$attributes\s*,\s*'([A-Za-z]*)'/g;
	let m;
	while ( null !== ( m = re.exec( code ) ) ) {
		out.push( m[ 1 ] );
	}
	return out;
}

function planRender( dir, source, prefixes ) {
	const findings = [];
	const unrecognised = [];
	const edits = [];
	const called = new Set( renderPrefixes( source ) );
	prefixes.forEach( ( p ) => {
		if ( ! called.has( p ) ) {
			unrecognised.push( { block: dir, prefix: p, file: 'render.php', kind: 'no-render-call', detail: `render.php has no sgs_link_underline_css( $attributes, '${ p }', … ) call` } );
		}
	} );
	// A list of the modes that draw with text-decoration must include `hover`, so the theme's site-wide sweep is
	// switched off for it as for none and always.
	const code = phpCodeMask( source );
	if ( /LinkUnderline|linkUnderline/.test( code ) ) {
		const re = /array\(\s*'none',\s*'always'\s*\)/g;
		let m;
		while ( null !== ( m = re.exec( code ) ) ) {
			findings.push( { block: dir, prefix: null, file: 'render.php', kind: 'mode-list', detail: "array( 'none', 'always' ) lacks 'hover'", fixable: true } );
			edits.push( { start: m.index, end: m.index + m[ 0 ].length, text: "array( 'none', 'always', 'hover' )" } );
		}
	}
	return { edits, findings, unrecognised, called };
}

// ─── attr-classification-overrides.json ─────────────────────────────────────

function planOverrides( text, wanted ) {
	const findings = [];
	const unrecognised = [];
	const edits = [];
	const entriesNode = child( text, text.indexOf( '{' ), 'entries' );
	const rows = children( text, entriesNode.valStart ).items.map( ( it ) => ( { ...it, value: JSON.parse( text.slice( it.valStart, it.valEnd ) ) } ) );
	const bySlugAttr = new Map( rows.map( ( r ) => [ `${ r.value.slug }::${ r.value.attr }`, r ] ) );
	wanted.forEach( ( { dir, prefix } ) => {
		const slug = 'sgs/' + dir;
		const sibling = bySlugAttr.get( `${ slug }::${ attrKey( prefix, 'Thickness' ) }` );
		if ( ! sibling ) {
			unrecognised.push( { block: dir, prefix, file: 'attr-classification-overrides.json', kind: 'override-anchor', detail: `no override row for ${ attrKey( prefix, 'Thickness' ) } to copy css_element from` } );
			return;
		}
		const missing = NEW.filter( ( n ) => ! bySlugAttr.has( `${ slug }::${ attrKey( prefix, n.suffix ) }` ) );
		if ( ! missing.length ) {
			return;
		}
		const ind = lineIndent( text, sibling.keyStart );
		const u = indentUnit( ind );
		const element = sibling.value.fields.css_element;
		const body = missing
			.map( ( n ) => {
				findings.push( { block: dir, prefix, file: 'attr-classification-overrides.json', kind: 'override-missing', detail: `no override row for ${ attrKey( prefix, n.suffix ) }`, fixable: true } );
				const fields = [ [ 'css_property', n.cssProperty ], [ 'css_element', element ], [ 'role', n.role ] ];
				if ( n.state ) {
					fields.splice( 2, 0, [ 'css_state', 'hover' ] );
				}
				const why = `2026-10-19, G11 (Spec 32 FR-32-24). Paints ${ n.cssProperty } on a link in the ${ element } element (\`{selector} a\`) via sgs_link_underline_css(), called from render.php with the prefix '${ prefix }'. Same dynamic-key scanning gap as sgs/business-info.linkUnderline.`;
				return `,\n${ ind }{\n${ ind }${ u }"slug": ${ JSON.stringify( slug ) },\n${ ind }${ u }"attr": ${ JSON.stringify( attrKey( prefix, n.suffix ) ) },\n${ ind }${ u }"fields": {\n`
					+ fields.map( ( [ k, v ], i ) => `${ ind }${ u }${ u }${ JSON.stringify( k ) }: ${ JSON.stringify( v ) }${ i < fields.length - 1 ? ',' : '' }\n` ).join( '' )
					+ `${ ind }${ u }},\n${ ind }${ u }"_why": ${ JSON.stringify( why ) }\n${ ind }}`;
			} )
			.join( '' );
		edits.push( { start: sibling.valEnd, end: sibling.valEnd, text: body } );
	} );
	return { edits, findings, unrecognised };
}

// ─── Registries (checked, never written) ────────────────────────────────────

function checkRegistries( files ) {
	const problems = [];
	const dead = files.deadControls.match( /sgs_link_underline_css:\s*\[([^\]]*)\]/ );
	REGISTRY_SUFFIXES.forEach( ( s ) => {
		if ( ! dead || ! new RegExp( `'${ s }'` ).test( dead[ 1 ] ) ) {
			problems.push( `check-dead-controls.js: the sgs_link_underline_css list lacks '${ s }'` );
		}
	} );
	const suffixRows = JSON.parse( files.suffixes ).rows;
	[ [ 'LinkUnderlineColour', 'text-decoration-color' ], [ 'LinkUnderlineOffset', 'text-underline-offset' ] ].forEach( ( [ suffix, property ] ) => {
		if ( ! suffixRows.some( ( r ) => r[ 0 ] === suffix && r[ 2 ] === property ) ) {
			problems.push( `property-suffixes.json: no row ${ suffix } -> ${ property }` );
		}
	} );
	const members = [];
	walkJson( JSON.parse( files.clusters ), ( o ) => {
		if ( o && 'object' === typeof o && 'string' === typeof o.key && Array.isArray( o.suffixes ) ) {
			members.push( o );
		}
	} );
	[ [ 'css:text-decoration-color-link', 'LinkUnderlineColour' ], [ 'css:text-decoration-offset-link', 'LinkUnderlineOffset' ] ].forEach( ( [ key, suffix ] ) => {
		if ( ! members.some( ( m ) => m.key === key && m.suffixes.includes( suffix ) ) ) {
			problems.push( `cluster-member-sets.json: no member ${ key } with the suffix ${ suffix }` );
		}
	} );
	const settings = JSON.parse( files.settings );
	const keys = new Set();
	walkJson( settings, ( o ) => {
		if ( o && 'object' === typeof o && 'string' === typeof o.setting_key ) {
			keys.add( o.setting_key );
		}
	} );
	[ 'css:text-decoration-color-link', 'css:text-decoration-offset-link' ].forEach( ( key ) => {
		if ( ! keys.has( key ) ) {
			problems.push( `setting-registry.json: no setting ${ key }` );
		}
	} );
	return problems;
}

function walkJson( node, visit ) {
	visit( node );
	if ( node && 'object' === typeof node ) {
		Object.values( node ).forEach( ( v ) => walkJson( v, visit ) );
	}
}

// ─── The whole plan over a corpus ───────────────────────────────────────────

function applyEdits( source, edits ) {
	const eol = source.includes( '\r\n' ) ? '\r\n' : '\n';
	let out = source;
	[ ...edits ].sort( ( a, b ) => b.start - a.start ).forEach( ( e ) => {
		out = out.slice( 0, e.start ) + e.text.split( '\n' ).join( eol ) + out.slice( e.end );
	} );
	return out;
}

/**
 * @param {Object} corpus
 * @param {Array}  corpus.blocks    [{ dir, blockJson, editJs, renderPhp }] one per block that declares the family
 * @param {string} corpus.overrides attr-classification-overrides.json text
 * @return {{ files: Object, findings: Array, unrecognised: Array, rows: Array }}
 */
function plan( corpus ) {
	const files = {};
	const findings = [];
	const unrecognised = [];
	const rows = [];
	const wanted = [];
	corpus.blocks.forEach( ( b ) => {
		const json = planBlockJson( b.dir, b.blockJson );
		const edit = planEditJs( b.dir, b.editJs ?? '', json.prefixes );
		const render = planRender( b.dir, b.renderPhp ?? '', json.prefixes );
		files[ b.dir ] = { blockJson: json.edits, editJs: edit.edits, renderPhp: render.edits };
		[ json, edit, render ].forEach( ( r ) => {
			findings.push( ...r.findings );
			unrecognised.push( ...r.unrecognised );
		} );
		json.prefixes.forEach( ( prefix ) => {
			wanted.push( { dir: b.dir, prefix } );
			rows.push( { block: b.dir, prefix } );
		} );
	} );
	const overrides = planOverrides( corpus.overrides, wanted );
	findings.push( ...overrides.findings );
	unrecognised.push( ...overrides.unrecognised );
	return { files, overrides: overrides.edits, findings, unrecognised, rows };
}

// ─── Disk ───────────────────────────────────────────────────────────────────

function listFiles( dir, test ) {
	const out = [];
	if ( ! fs.existsSync( dir ) ) {
		return out;
	}
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const abs = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			if ( '__tests__' !== entry.name && 'node_modules' !== entry.name ) {
				out.push( ...listFiles( abs, test ) );
			}
		} else if ( test( entry.name ) ) {
			out.push( abs );
		}
	}
	return out.sort();
}

const read = ( abs ) => ( fs.existsSync( abs ) ? fs.readFileSync( abs, 'utf8' ) : '' );

function repoCorpus( only ) {
	const dirs = fs.readdirSync( BLOCKS_DIR, { withFileTypes: true } ).filter( ( d ) => d.isDirectory() ).map( ( d ) => d.name );
	const blocks = [];
	for ( const dir of dirs ) {
		const jsonText = read( path.join( BLOCKS_DIR, dir, 'block.json' ) );
		if ( ! jsonText ) {
			continue;
		}
		const attrs = Object.keys( JSON.parse( jsonText ).attributes || {} );
		if ( attrs.some( ( k ) => NAME_RE.test( k ) ) ) {
			blocks.push( {
				dir,
				blockJson: jsonText,
				editJs: read( path.join( BLOCKS_DIR, dir, 'edit.js' ) ),
				renderPhp: read( path.join( BLOCKS_DIR, dir, 'render.php' ) ),
			} );
		}
	}
	return { blocks, overrides: read( REGISTRY_FILES.overrides ), only };
}

/** The dumb enumerations the family is reconciled against. */
function crossCheck( corpus ) {
	const problems = [];
	const family = corpus.blocks.map( ( b ) => b.dir ).sort();
	if ( JSON.stringify( family ) !== JSON.stringify( [ ...EXPECTED_BLOCKS ].sort() ) ) {
		problems.push( `the block.json family is [${ family.join( ', ' ) }], expected [${ [ ...EXPECTED_BLOCKS ].sort().join( ', ' ) }]` );
	}
	const prefixCount = corpus.blocks.reduce( ( n, b ) => n + Object.keys( JSON.parse( b.blockJson ).attributes ).filter( ( k ) => NAME_RE.test( k ) ).length, 0 );
	if ( prefixCount !== EXPECTED_PREFIX_COUNT ) {
		problems.push( `${ prefixCount } link prefixes are declared, expected ${ EXPECTED_PREFIX_COUNT }` );
	}
	const renderBlocks = [];
	const mountBlocks = [];
	const strays = [];
	const sharedOk = [ 'components/LinkUnderlineControl.js', 'components/index.js', 'utils/link-underline.js', 'utils/index.js' ];
	listFiles( SRC_DIR, ( n ) => /\.(js|jsx|php)$/.test( n ) ).forEach( ( abs ) => {
		const relFile = posix( path.relative( SRC_DIR, abs ) );
		const source = read( abs );
		const block = ( relFile.match( /^blocks\/([^/]+)\// ) || [] )[ 1 ];
		if ( abs.endsWith( '.php' ) ) {
			if ( renderPrefixes( source ).length || /sgs_link_underline_css\(/.test( phpCodeMask( source ) ) ) {
				renderBlocks.push( block || relFile );
			}
		} else if ( /<LinkUnderlineControl|linkUnderlinePreviewCss\(/.test( source ) && ! sharedOk.includes( relFile ) ) {
			if ( block ) {
				mountBlocks.push( block );
			} else {
				strays.push( relFile );
			}
		}
	} );
	const uniq = ( list ) => [ ...new Set( list ) ].sort();
	if ( JSON.stringify( uniq( renderBlocks ) ) !== JSON.stringify( family ) ) {
		problems.push( `render.php files calling sgs_link_underline_css are [${ uniq( renderBlocks ).join( ', ' ) }], the family is [${ family.join( ', ' ) }]` );
	}
	if ( JSON.stringify( uniq( mountBlocks ) ) !== JSON.stringify( family ) ) {
		problems.push( `src files mounting the control or calling the preview twin are [${ uniq( mountBlocks ).join( ', ' ) }], the family is [${ family.join( ', ' ) }]` );
	}
	strays.forEach( ( s ) => problems.push( `${ s } mounts the control or calls the preview twin outside a block folder, so this survey does not wire it` ) );
	return problems;
}

// ─── Reports ────────────────────────────────────────────────────────────────

function unifiedDiff( relFile, before, after ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'lu-diff-' ) );
	try {
		fs.writeFileSync( path.join( dir, 'a' ), before );
		fs.writeFileSync( path.join( dir, 'b' ), after );
		const res = spawnSync( 'git', [ 'diff', '--no-index', '--no-color', '-U2', 'a', 'b' ], { cwd: dir, encoding: 'utf8' } );
		if ( 'string' === typeof res.stdout && res.stdout.includes( '@@' ) ) {
			return res.stdout
				.replace( /^diff --git .*\n(index .*\n)?/, '' )
				.replace( /^--- a\/a$/m, `--- a/${ relFile }` )
				.replace( /^\+\+\+ b\/b$/m, `+++ b/${ relFile }` )
				.trimEnd();
		}
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
	return `(no diff output for ${ relFile })`;
}

function writeAtomic( abs, text ) {
	const tmp = abs + '.tmp';
	fs.writeFileSync( tmp, text, { encoding: 'utf8' } );
	fs.renameSync( tmp, abs );
}

function printSurvey( result, crossProblems, registryProblems ) {
	const byKind = {};
	result.findings.forEach( ( f ) => {
		byKind[ f.kind ] = ( byKind[ f.kind ] || 0 ) + 1;
	} );
	console.log( `blocks: ${ new Set( result.rows.map( ( r ) => r.block ) ).size }, link prefixes: ${ result.rows.length }` );
	result.rows.forEach( ( r ) => {
		const mine = result.findings.filter( ( f ) => f.block === r.block && ( f.prefix === r.prefix || null === f.prefix ) );
		const bad = result.unrecognised.filter( ( f ) => f.block === r.block && ( f.prefix === r.prefix || null === f.prefix ) );
		console.log( `  ${ r.block.padEnd( 17 ) } prefix ${ JSON.stringify( r.prefix ).padEnd( 14 ) } to fix: ${ String( mine.length ).padStart( 2 ) }   unrecognised: ${ bad.length }` );
	} );
	console.log( 'findings by kind:' );
	Object.entries( byKind ).forEach( ( [ k, n ] ) => console.log( `  ${ k.padEnd( 18 ) } ${ n }` ) );
	console.log( `fixable: ${ result.findings.filter( ( f ) => f.fixable ).length }   not fixable by --fix: ${ result.findings.filter( ( f ) => ! f.fixable ).length }   unrecognised: ${ result.unrecognised.length }` );
	result.unrecognised.forEach( ( u ) => console.log( `  UNRECOGNISED ${ u.block }${ null === u.prefix ? '' : ` [${ u.prefix }]` } ${ u.file }: ${ u.kind } - ${ u.detail }` ) );
	crossProblems.forEach( ( p ) => console.log( `cross-check: ${ p }` ) );
	registryProblems.forEach( ( p ) => console.log( `registry: ${ p }` ) );
}

// ─── Self-test ──────────────────────────────────────────────────────────────

function selfTest() {
	const failures = [];
	const ok = ( cond, msg ) => {
		if ( ! cond ) {
			failures.push( msg );
		}
	};

	const blockJson = [
		'{',
		'\t"name": "sgs/fixture",',
		'\t"supports": {',
		'\t\t"sgs": {',
		'\t\t\t"elements": {',
		'\t\t\t\t"body": {',
		'\t\t\t\t\t"attrMap": {',
		'\t\t\t\t\t\t"css:text-decoration-link": "linkUnderline",',
		'\t\t\t\t\t\t"css:text-decoration-thickness-link": "linkUnderlineThickness",',
		'\t\t\t\t\t\t"css:color": "textColour"',
		'\t\t\t\t\t},',
		'\t\t\t\t\t"states": {',
		'\t\t\t\t\t\t"hover": {',
		'\t\t\t\t\t\t\t"attrMap": {',
		'\t\t\t\t\t\t\t\t"css:color": "textColourHover"',
		'\t\t\t\t\t\t\t}',
		'\t\t\t\t\t\t}',
		'\t\t\t\t\t}',
		'\t\t\t\t},',
		'\t\t\t\t"credit": {',
		'\t\t\t\t\t"attrMap": {',
		'\t\t\t\t\t\t"css:text-decoration-link": "creditLinkUnderline",',
		'\t\t\t\t\t\t"css:text-decoration-thickness-link": "creditLinkUnderlineThickness"',
		'\t\t\t\t\t}',
		'\t\t\t\t}',
		'\t\t\t}',
		'\t\t}',
		'\t},',
		'\t"attributes": {',
		'\t\t"linkUnderline": {',
		'\t\t\t"type": "string",',
		'\t\t\t"enum": [ "", "none", "always", "sweep" ],',
		'\t\t\t"default": "",',
		'\t\t\t"description": "How links are underlined: \'\' unchanged, none, always, or sweep (a line)."',
		'\t\t},',
		'\t\t"linkUnderlineThickness": {',
		'\t\t\t"type": "string",',
		'\t\t\t"default": "",',
		'\t\t\t"description": "Thickness of the link underline for always and sweep."',
		'\t\t},',
		'\t\t"creditLinkUnderline": {',
		'\t\t\t"type": "string",',
		'\t\t\t"enum": [ "", "none", "always", "sweep" ],',
		'\t\t\t"default": ""',
		'\t\t},',
		'\t\t"creditLinkUnderlineThickness": {',
		'\t\t\t"type": "string",',
		'\t\t\t"default": ""',
		'\t\t}',
		'\t}',
		'}',
		'',
	].join( '\n' );

	const editJs = [
		"import { LinkUnderlineControl } from '../../components';",
		"import { linkUnderlinePreviewCss } from '../../utils';",
		'export default function Edit( { attributes, setAttributes } ) {',
		'\tconst {',
		'\t\tlinkUnderline,',
		'\t\tlinkUnderlineThickness,',
		'\t\ttextColour,',
		'\t} = attributes;',
		"\tconst css = linkUnderlinePreviewCss( '.a', { mode: linkUnderline, thickness: linkUnderlineThickness, linkGradient: g } )",
		"\t\t+ linkUnderlinePreviewCss( '.b', {",
		'\t\t\tmode: attributes.creditLinkUnderline,',
		'\t\t\tthickness: attributes.creditLinkUnderlineThickness,',
		'\t\t} );',
		'\treturn (',
		'\t\t<>',
		'\t\t\t<LinkUnderlineControl',
		'\t\t\t\tmode={ linkUnderline }',
		'\t\t\t\tthickness={ linkUnderlineThickness }',
		'\t\t\t\tonModeChange={ ( val ) => setAttributes( { linkUnderline: val } ) }',
		'\t\t\t\tonThicknessChange={ ( val ) => setAttributes( { linkUnderlineThickness: val } ) }',
		'\t\t\t/>',
		'\t\t\t<LinkUnderlineControl mode={attributes.creditLinkUnderline} thickness={attributes.creditLinkUnderlineThickness} onModeChange={(v) => setAttributes({ creditLinkUnderline: v })} onThicknessChange={(v) => setAttributes({ creditLinkUnderlineThickness: v })} />',
		'\t\t</>',
		'\t);',
		'}',
		'',
	].join( '\n' );

	const renderPhp = [
		'<?php',
		'// sgs_link_underline_css( $attributes, \'ghost\', $sel ) is only named in a comment.',
		"$a = sgs_link_underline_css( $attributes, '', $sel );",
		"$b = sgs_link_underline_css( $attributes, 'credit', $sel2 );",
		"if ( in_array( $attributes['linkUnderline'] ?? '', array( 'none', 'always' ), true ) ) {",
		'}',
		'',
	].join( '\n' );

	const overrides = [
		'{',
		'\t"_doc": "fixture",',
		'\t"entries": [',
		'\t\t{',
		'\t\t\t"slug": "sgs/fixture",',
		'\t\t\t"attr": "linkUnderlineThickness",',
		'\t\t\t"fields": {',
		'\t\t\t\t"css_property": "text-decoration-thickness",',
		'\t\t\t\t"css_element": "body",',
		'\t\t\t\t"role": "typography"',
		'\t\t\t},',
		'\t\t\t"_why": "old"',
		'\t\t},',
		'\t\t{',
		'\t\t\t"slug": "sgs/fixture",',
		'\t\t\t"attr": "creditLinkUnderlineThickness",',
		'\t\t\t"fields": {',
		'\t\t\t\t"css_property": "text-decoration-thickness",',
		'\t\t\t\t"css_element": "credit",',
		'\t\t\t\t"role": "typography"',
		'\t\t\t},',
		'\t\t\t"_why": "old"',
		'\t\t}',
		'\t]',
		'}',
		'',
	].join( '\n' );

	const corpus = { blocks: [ { dir: 'fixture', blockJson, editJs, renderPhp } ], overrides };

	// 1. The old shape is found, with every kind of finding.
	const before = plan( corpus );
	const kinds = new Set( before.findings.map( ( f ) => f.kind ) );
	[ 'enum', 'attr-missing', 'claim-missing', 'control-prop', 'preview-key', 'destructure', 'mode-list', 'override-missing' ].forEach( ( k ) => ok( kinds.has( k ), `fixture: no '${ k }' finding` ) );
	ok( 2 === before.rows.length, `fixture: expected 2 prefixes, got ${ before.rows.length }` );
	ok( 0 === before.unrecognised.length, `fixture: unexpected unrecognised ${ JSON.stringify( before.unrecognised ) }` );
	ok( 6 === before.findings.filter( ( f ) => 'attr-missing' === f.kind ).length, 'fixture: expected 6 missing attributes' );
	ok( 6 === before.findings.filter( ( f ) => 'override-missing' === f.kind ).length, 'fixture: expected 6 missing override rows' );
	ok( ! before.findings.some( ( f ) => 'render.php' === f.file && 'mode-list' !== f.kind ), 'fixture: the commented-out call must not count as a render call' );

	// 2. Applying every edit yields valid files that re-plan clean (idempotence).
	const after = {
		blockJson: applyEdits( blockJson, before.files.fixture.blockJson ),
		editJs: applyEdits( editJs, before.files.fixture.editJs ),
		renderPhp: applyEdits( renderPhp, before.files.fixture.renderPhp ),
		overrides: applyEdits( overrides, before.overrides ),
	};
	let parsed = null;
	try {
		parsed = JSON.parse( after.blockJson );
		JSON.parse( after.overrides );
		parseJs( after.editJs );
	} catch ( e ) {
		failures.push( `fixture: a fixed file no longer parses: ${ e.message }` );
	}
	if ( parsed ) {
		ok( JSON.stringify( parsed.attributes.linkUnderline.enum ) === JSON.stringify( MODES ), 'fixture: enum not widened' );
		ok( parsed.supports.sgs.elements.credit.states.hover.attrMap[ 'css:text-decoration-color-link' ] === 'creditLinkUnderlineColourHover', 'fixture: a hover state was not created' );
		ok( parsed.supports.sgs.elements.body.states.hover.attrMap[ 'css:text-decoration-color-link' ] === 'linkUnderlineColourHover', 'fixture: the hover state was not extended' );
		ok( parsed.supports.sgs.elements.body.attrMap[ 'css:text-decoration-offset-link' ] === 'linkUnderlineOffset', 'fixture: the offset claim is missing' );
		ok( parsed.attributes.linkUnderline.description.includes( 'hover (an underline' ), 'fixture: the description was not extended' );
	}
	ok( /colour=\{ linkUnderlineColour \}/.test( after.editJs ) && /colourHover=\{attributes\.creditLinkUnderlineColourHover\}/.test( after.editJs ), 'fixture: control props not written in each file style' );
	ok( /\t\tlinkUnderlineOffset,\n/.test( after.editJs ), 'fixture: the destructure was not extended on its own lines' );
	ok( /\t\t\tcolour: attributes\.creditLinkUnderlineColour,\n/.test( after.editJs ), 'fixture: the multi-line preview keys were not written on their own lines' );
	ok( after.renderPhp.includes( "array( 'none', 'always', 'hover' )" ), 'fixture: the mode list was not extended' );
	const again = plan( { blocks: [ { dir: 'fixture', blockJson: after.blockJson, editJs: after.editJs, renderPhp: after.renderPhp } ], overrides: after.overrides } );
	ok( 0 === again.findings.length && 0 === again.unrecognised.length, `fixture: not idempotent: ${ JSON.stringify( again.findings.concat( again.unrecognised ) ) }` );
	const noEdits = [ again.overrides, ...Object.values( again.files.fixture ) ].every( ( e ) => 0 === e.length );
	ok( noEdits, 'negative control: a converted fixture must produce no edits' );
	ok( applyEdits( after.editJs, [] ) === after.editJs, 'negative control: no edits leave the file byte-identical' );

	// 3. Things the rules must refuse rather than guess.
	const noMode = plan( { blocks: [ { dir: 'fixture', blockJson, editJs: editJs.replace( '\t\t\t\tmode={ linkUnderline }\n', '' ), renderPhp } ], overrides } );
	ok( noMode.unrecognised.some( ( u ) => 'control-shape' === u.kind ), 'refusal: a control with no mode prop must be unrecognised' );
	const wrong = plan( { blocks: [ { dir: 'fixture', blockJson: after.blockJson, editJs: after.editJs.replace( 'colour={ linkUnderlineColour }', 'colour={ linkUnderlineThickness }' ), renderPhp: after.renderPhp } ], overrides: after.overrides } );
	ok( wrong.findings.some( ( f ) => 'control-binding' === f.kind ), 'detection: a prop bound to the wrong attribute must be a finding' );
	const noRender = plan( { blocks: [ { dir: 'fixture', blockJson: after.blockJson, editJs: after.editJs, renderPhp: "<?php\n$a = sgs_link_underline_css( $attributes, '', $s );\n" } ], overrides: after.overrides } );
	ok( noRender.unrecognised.some( ( u ) => 'no-render-call' === u.kind && 'credit' === u.prefix ), 'detection: a prefix with no render call must be listed' );
	const noOverrideAnchor = plan( { blocks: [ { dir: 'other', blockJson: after.blockJson, editJs: after.editJs, renderPhp: after.renderPhp } ], overrides: after.overrides } );
	ok( noOverrideAnchor.unrecognised.some( ( u ) => 'override-anchor' === u.kind ), 'refusal: no override row to copy from must be unrecognised' );

	// 4. Corpus control: the declared population exists on disk.
	EXPECTED_BLOCKS.forEach( ( b ) => ok( fs.existsSync( path.join( BLOCKS_DIR, b, 'block.json' ) ), `population: src/blocks/${ b }/block.json is gone` ) );

	failures.forEach( ( f ) => console.log( `SELF-TEST FAIL ${ f }` ) );
	console.log( failures.length ? `survey-link-underline-family self-test: ${ failures.length } failure(s)` : 'survey-link-underline-family self-test: ok' );
	return failures.length ? 1 : 0;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function main( argv ) {
	const has = ( f ) => argv.includes( f );
	const only = argv.flatMap( ( a, i ) => ( '--block' === a ? [ argv[ i + 1 ] ] : [] ) );
	if ( has( '--self-test' ) ) {
		return selfTest();
	}
	const corpus = repoCorpus( only );
	const crossProblems = crossCheck( corpus );
	const registryProblems = checkRegistries( {
		deadControls: read( REGISTRY_FILES.deadControls ),
		suffixes: read( REGISTRY_FILES.suffixes ),
		clusters: read( REGISTRY_FILES.clusters ),
		settings: read( REGISTRY_FILES.settings ),
	} );
	const scoped = { ...corpus, blocks: only.length ? corpus.blocks.filter( ( b ) => only.includes( b.dir ) ) : corpus.blocks };
	const result = plan( scoped );

	if ( has( '--survey' ) ) {
		if ( has( '--json' ) ) {
			console.log( JSON.stringify( { rows: result.rows, findings: result.findings, unrecognised: result.unrecognised, crossCheck: crossProblems, registry: registryProblems }, null, 2 ) );
		} else {
			printSurvey( result, crossProblems, registryProblems );
		}
		return 0;
	}
	if ( has( '--fix' ) ) {
		if ( result.unrecognised.length ) {
			console.log( `refusing to fix: ${ result.unrecognised.length } unrecognised site(s); run --survey and settle them first` );
			return 1;
		}
		const targets = [];
		scoped.blocks.forEach( ( b ) => {
			const e = result.files[ b.dir ];
			const base = `src/blocks/${ b.dir }/`;
			targets.push( [ base + 'block.json', b.blockJson, e.blockJson ], [ base + 'edit.js', b.editJs, e.editJs ], [ base + 'render.php', b.renderPhp, e.renderPhp ] );
		} );
		targets.push( [ rel( REGISTRY_FILES.overrides ), corpus.overrides, result.overrides ] );
		let wrote = 0;
		targets.filter( ( t ) => t[ 2 ].length ).forEach( ( [ file, source, edits ] ) => {
			const after = applyEdits( source, edits );
			if ( has( '--apply' ) ) {
				writeAtomic( path.join( PLUGIN_ROOT, file ), after );
				console.log( `wrote ${ file } (${ edits.length } edit(s))` );
			} else {
				console.log( unifiedDiff( file, source, after ) );
			}
			wrote++;
		} );
		if ( ! wrote ) {
			console.log( 'nothing to fix' );
		}
		return 0;
	}
	if ( has( '--check' ) ) {
		const bad = [
			...crossProblems,
			...registryProblems,
			...result.findings.map( ( f ) => `${ f.block }${ null === f.prefix ? '' : ` [${ f.prefix }]` } ${ f.file }: ${ f.detail }` ),
			...result.unrecognised.map( ( u ) => `${ u.block }${ null === u.prefix ? '' : ` [${ u.prefix }]` } ${ u.file }: ${ u.detail }` ),
		];
		bad.forEach( ( b ) => console.log( `FAIL ${ b }` ) );
		console.log( bad.length ? `survey-link-underline-family: ${ bad.length } finding(s)` : `survey-link-underline-family: ${ result.rows.length } link prefixes in ${ scoped.blocks.length } blocks declare, wire and register the whole underline set.` );
		return bad.length ? 1 : 0;
	}
	console.log( 'usage: survey-link-underline-family.js --survey [--json] | --fix [--apply] | --check | --self-test [--block <dir>]' );
	return 2;
}

if ( require.main === module ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}

module.exports = { plan, planBlockJson, planEditJs, planRender, planOverrides, checkRegistries, applyEdits, crossCheck };
