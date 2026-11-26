/**
 * migrate-spacing-panel.js
 *
 * The fix half of `check-spacing-panel.js` (Stage E2, item 3): moves every hand-built Padding and Margin pair (a
 * `ResponsiveOverride` around an `SgsBoxControl` that reads the block's own `padding` / `margin` tier object) onto the
 * shared Spacing panel (`components/ResponsiveBoxControls.js`).
 *
 * Per file: each pair is removed (with the JSX comment directly above it that talks about padding or margin, and the
 * `ToolsPanelItem` that wraps it); a panel left with nothing but whitespace, comments and rules is replaced by
 * `<ResponsiveBoxControls attributes={ attributes } setAttributes={ setAttributes } />`; a panel that keeps other
 * controls stays and the shared panel is inserted right after it, in the same inspector group. Imports the file no
 * longer needs are dropped and `ResponsiveBoxControls` is imported beside the file's other component imports.
 * A file that does not fit (a value other than `attributes.padding` / `attributes.margin`, a panel in a conditional, a
 * mount in a helper that does not hold `attributes`) is listed as "manual" and left untouched.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/migrate-spacing-panel.js                  # dry run: what each file would become
 *   node scripts/migrate-spacing-panel.js --apply          # write the files
 *   node scripts/migrate-spacing-panel.js --self-test
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const scan = require( './lib/jsx-scan' );

const { PLUGIN, SRC } = scan;
const EXEMPT = JSON.parse( fs.readFileSync( path.join( __dirname, 'data', 'spacing-panel-exemptions.json' ), 'utf8' ) );
const PANELS = new Set( [ 'PanelBody', 'ToolsPanel' ] );
const DROPPABLE = [ 'PanelBody', 'ToolsPanel', 'ToolsPanelItem', 'SgsBoxControl', 'ResponsiveOverride', 'BOX_UNITS', 'normaliseResponsiveBox', 'spacingDefaultsFor' ];
const MOUNT = 'ResponsiveBoxControls';

const labelOf = ( el ) => {
	const p = scan.prop( el, 'label' );
	if ( 'string' === p.kind ) {
		return p.value;
	}
	const e = p.node && p.node.value && p.node.value.expression;
	return e && 'CallExpression' === e.type && e.arguments[ 0 ] && 'StringLiteral' === e.arguments[ 0 ].type ? e.arguments[ 0 ].value : null;
};

/** `{ attributes.padding }` or `{ padding }` gives 'padding'; anything else null. */
function ownAttr( text, roEl ) {
	const p = scan.prop( roEl, 'value' );
	if ( ! p.node || ! p.node.value ) {
		return null;
	}
	const m = text.slice( p.node.value.start, p.node.value.end ).match( /^\{\s*(?:attributes\.)?(padding|margin)\s*\}$/ );
	return m ? m[ 1 ] : null;
}

const isBlank = ( child ) =>
	( 'JSXText' === child.type && ! child.value.trim() ) ||
	( 'JSXExpressionContainer' === child.type && 'JSXEmptyExpression' === child.expression.type ) ||
	( 'JSXElement' === child.type && 'hr' === scan.jsxName( child ) );

/** Start offset of a removal, extended back over the comment container directly above that mentions the box. */
function removalStart( parent, target ) {
	const kids = parent.children;
	const i = kids.indexOf( target );
	for ( let j = i - 1; j >= 0; j-- ) {
		const k = kids[ j ];
		if ( 'JSXText' === k.type && ! k.value.trim() ) {
			continue;
		}
		if ( 'JSXExpressionContainer' === k.type && 'JSXEmptyExpression' === k.expression.type ) {
			const body = ( k.expression.innerComments || [] ).map( ( c ) => c.value ).join( ' ' );
			if ( /padding|margin|spacing|box-object|box object/i.test( body ) ) {
				return k.start;
			}
		}
		break;
	}
	return target.start;
}

/** Edits for one file, or { manual: reason }. */
function plan( text ) {
	const ast = scan.parse( text );
	const mounts = [];
	let blocker = null;
	scan.walkJsx( ast, ( el, ancestors ) => {
		if ( 'SgsBoxControl' !== scan.jsxName( el ) ) {
			return;
		}
		const label = labelOf( el );
		if ( ! label || ! /^(padding|margin)$/i.test( label.trim() ) ) {
			return;
		}
		const ro = scan.closestJsx( ancestors, ( e ) => 'ResponsiveOverride' === scan.jsxName( e ) );
		const panel = scan.closestJsx( ancestors, ( e ) => PANELS.has( scan.jsxName( e ) ) );
		if ( ! ro || ! panel ) {
			blocker = blocker || `${ label } is not a ResponsiveOverride inside a panel`;
			return;
		}
		const attr = ownAttr( text, ro );
		if ( ! attr || attr !== label.trim().toLowerCase() ) {
			blocker = blocker || `${ label } reads ${ attr || 'a value other than the block\'s own padding / margin' }`;
			return;
		}
		if ( ! /setAttributes\s*\(\s*\{\s*(padding|margin)\s*:/.test( text.slice( ro.start, ro.end ) ) ) {
			blocker = blocker || `${ label }'s onChange does not call setAttributes( { ${ attr}: … } )`;
			return;
		}
		const fnText = ( () => {
			// The outermost function around the mount is the component; render callbacks inside it see its names.
			const outer = ancestors.find( ( a ) => /Function/.test( a.type ) );
			return outer ? text.slice( outer.start, outer.end ) : '';
		} )();
		if ( ! /\battributes\b/.test( fnText ) || ! /\bsetAttributes\b/.test( fnText ) ) {
			blocker = blocker || 'the enclosing function does not hold attributes and setAttributes';
			return;
		}
		const item = scan.closestJsx( ancestors, ( e ) => 'ToolsPanelItem' === scan.jsxName( e ) && e.start >= panel.start && e.start <= ro.start && e.end >= ro.end );
		const target = item && item.start > panel.start ? item : ro;
		mounts.push( { attr, ro, panel, target, ancestors } );
	} );
	if ( ! mounts.length ) {
		return { manual: 'no pair found' };
	}
	if ( blocker ) {
		return { manual: blocker };
	}
	const edits = [];
	const panels = [ ...new Set( mounts.map( ( m ) => m.panel ) ) ].sort( ( a, b ) => a.start - b.start );
	let inserted = false;
	for ( const panel of panels ) {
		const mine = mounts.filter( ( m ) => m.panel === panel );
		const removed = new Set( mine.map( ( m ) => m.target ) );
		// A removed target's JSX parent is the panel or a wrapper; only a direct child of the panel counts.
		const direct = mine.every( ( m ) => panel.children.includes( m.target ) );
		if ( ! direct ) {
			return { manual: `a pair sits in a wrapper inside "${ panel.openingElement.name.name }" rather than directly in it` };
		}
		const rest = panel.children.filter( ( c ) => ! removed.has( c ) && ! isBlank( c ) );
		const panelParent = ( () => {
			const m0 = mine[ 0 ];
			const i = m0.ancestors.indexOf( panel );
			return i > 0 ? m0.ancestors[ i - 1 ] : null;
		} )();
		if ( ! rest.length ) {
			// The comment above a replaced panel describes the controls it held: it goes with them.
			const from = panelParent && panelParent.children && panelParent.children.includes( panel ) ? removalStart( panelParent, panel ) : panel.start;
			if ( ! inserted ) {
				edits.push( { start: from, end: panel.end, text: null, replacePanel: true } );
				inserted = true;
			} else {
				edits.push( { start: from, end: panel.end, text: '', dropPanel: true } );
			}
			continue;
		}
		// Two pairs can share one ToolsPanelItem: remove each target once.
		for ( const target of new Set( mine.map( ( m ) => m.target ) ) ) {
			edits.push( { start: removalStart( panel, target ), end: target.end, text: '' } );
		}
		if ( ! inserted ) {
			if ( ! panelParent || ! [ 'JSXElement', 'JSXFragment' ].includes( panelParent.type ) ) {
				return { manual: 'the panel sits in a conditional or expression, so a sibling cannot be added' };
			}
			edits.push( { start: panel.end, end: panel.end, text: null, insertAfter: true } );
			inserted = true;
		}
	}
	return { edits, mounts: mounts.length, panels: panels.length };
}

/** The shared panel's JSX at an indent. */
const mountJsx = ( indent ) => `<${ MOUNT }\n${ indent }\tattributes={ attributes }\n${ indent }\tsetAttributes={ setAttributes }\n${ indent }/>`;

/** Apply the edits to text. */
function applyEdits( text, edits ) {
	let out = text;
	const sorted = edits.slice().sort( ( a, b ) => b.start - a.start || b.end - a.end );
	for ( const e of sorted ) {
		const lineStart = out.lastIndexOf( '\n', e.start - 1 ) + 1;
		const indent = out.slice( lineStart, e.start ).match( /^\t*/ )[ 0 ];
		let rep = e.text;
		if ( e.replacePanel ) {
			rep = mountJsx( indent );
		} else if ( e.insertAfter ) {
			rep = `\n${ indent }${ mountJsx( indent ) }`;
		}
		if ( '' === rep && ! e.dropPanel ) {
			// Remove the whole line(s) the element occupied.
			const before = out.slice( 0, e.start );
			const after = out.slice( e.end );
			const trimmedBefore = before.replace( /[ \t]*$/, '' );
			const trimmedAfter = after.replace( /^[ \t]*\n/, '' );
			out = trimmedBefore + ( /\n$/.test( trimmedBefore ) ? '' : '\n' ) + trimmedAfter;
			continue;
		}
		if ( e.dropPanel ) {
			const before = out.slice( 0, e.start ).replace( /[ \t]*$/, '' );
			const after = out.slice( e.end ).replace( /^[ \t]*\n/, '' );
			out = before + after;
			continue;
		}
		out = out.slice( 0, e.start ) + rep + out.slice( e.end );
	}
	return out;
}

/** Fix the import block: drop what is no longer used, import the shared panel. */
function fixImports( text ) {
	const ast = scan.parse( text );
	const decls = ast.program.body.filter( ( n ) => 'ImportDeclaration' === n.type );
	const bodyOutsideImports = ( name ) => {
		let rest = text;
		for ( const d of decls.slice().sort( ( a, b ) => b.start - a.start ) ) {
			rest = rest.slice( 0, d.start ) + rest.slice( d.end );
		}
		return new RegExp( `(?<![\\w$.])${ name.replace( /\$/g, '\\$' ) }(?![\\w$])` ).test( rest );
	};
	const edits = [];
	let componentsDecl = null;
	let siblingDir = null;
	for ( const d of decls ) {
		const src = d.source.value;
		if ( /^\..*\/components(\/index)?$/.test( src ) ) {
			componentsDecl = d;
		}
		const m = src.match( /^(.*\/components)\/(SgsBoxControl|ResponsiveOverride|ResponsiveBoxControl)$/ );
		if ( m ) {
			siblingDir = m[ 1 ];
		}
		const m2 = src.match( /^(\.\/)(SgsBoxControl|ResponsiveOverride)$/ );
		if ( m2 ) {
			siblingDir = '.';
		}
	}
	const fmt = ( specs, src ) => {
		const one = `import { ${ specs.join( ', ' ) } } from '${ src }';`;
		return one.length <= 80 ? one : `import {\n\t${ specs.join( ',\n\t' ) },\n} from '${ src }';`;
	};
	const specText = ( s ) => text.slice( s.start, s.end );
	for ( const d of decls ) {
		const keep = d.specifiers.filter( ( s ) => ! ( DROPPABLE.includes( s.local.name ) && ! bodyOutsideImports( s.local.name ) ) );
		if ( keep.length === d.specifiers.length ) {
			continue;
		}
		if ( ! keep.length ) {
			edits.push( { start: d.start, end: d.end + ( text[ d.end ] === '\n' ? 1 : 0 ), text: '' } );
		} else if ( d.specifiers.some( ( s ) => 'ImportSpecifier' !== s.type ) ) {
			// default + named: keep the default, rebuild the named list.
			const def = keep.find( ( s ) => 'ImportDefaultSpecifier' === s.type );
			const named = keep.filter( ( s ) => 'ImportSpecifier' === s.type ).map( specText );
			edits.push( { start: d.start, end: d.end, text: `import ${ def ? def.local.name : '' }${ def && named.length ? ', ' : '' }${ named.length ? `{ ${ named.join( ', ' ) } }` : '' } from '${ d.source.value }';` } );
		} else {
			edits.push( { start: d.start, end: d.end, text: fmt( keep.map( specText ), d.source.value ) } );
		}
	}
	let out = text;
	for ( const e of edits.sort( ( a, b ) => b.start - a.start ) ) {
		out = out.slice( 0, e.start ) + e.text + out.slice( e.end );
	}
	// Import the shared panel.
	if ( ! /\bResponsiveBoxControls\b/.test( out.split( '\n' ).filter( ( l ) => /^import\b|^\t[\w$]+,?$|^} from/.test( l ) ).join( '\n' ) ) ) {
		const ast2 = scan.parse( out );
		const decls2 = ast2.program.body.filter( ( n ) => 'ImportDeclaration' === n.type );
		const cd = decls2.find( ( d ) => /^\..*\/components(\/index)?$/.test( d.source.value ) );
		if ( cd && cd.specifiers.every( ( s ) => 'ImportSpecifier' === s.type ) ) {
			const names = cd.specifiers.map( ( s ) => out.slice( s.start, s.end ) ).concat( [ MOUNT ] );
			out = out.slice( 0, cd.start ) + fmt( names, cd.source.value ) + out.slice( cd.end );
		} else {
			const last = decls2[ decls2.length - 1 ];
			const dir = siblingDir || ( componentsDecl ? componentsDecl.source.value.replace( /\/index$/, '' ) : null );
			const rel = dir ? `${ dir }/${ MOUNT }` : null;
			if ( ! rel ) {
				return { text: out, importNote: 'could not place the ResponsiveBoxControls import' };
			}
			out = out.slice( 0, last.end ) + `\nimport ${ MOUNT } from '${ rel }';` + out.slice( last.end );
		}
	}
	return { text: out };
}

/** Plan and (optionally) write one file. */
function migrateText( text ) {
	const p = plan( text );
	if ( p.manual ) {
		return { manual: p.manual };
	}
	const crlf = text.includes( '\r\n' );
	let t = crlf ? text.replace( /\r\n/g, '\n' ) : text;
	const p2 = plan( t );
	t = applyEdits( t, p2.edits ).replace( /\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n' );
	const f = fixImports( t );
	t = f.text;
	try {
		scan.parse( t );
	} catch ( e ) {
		return { manual: `the edit left a syntax error: ${ e.message }` };
	}
	return { text: crlf ? t.replace( /\n/g, '\r\n' ) : t, mounts: p2.mounts, panels: p2.panels, note: f.importNote };
}

function targets() {
	const survey = require( 'child_process' ).spawnSync( process.execPath, [ path.join( __dirname, 'check-spacing-panel.js' ), '--survey', '--json', path.join( process.env.TEMP || require( 'os' ).tmpdir(), 'sp-survey.json' ) ], { encoding: 'utf8' } );
	void survey;
	const j = JSON.parse( fs.readFileSync( path.join( process.env.TEMP || require( 'os' ).tmpdir(), 'sp-survey.json' ), 'utf8' ) );
	const files = new Set();
	for ( const m of j.mounts ) {
		if ( 'SgsBoxControl' === m.control && ! EXEMPT.files[ m.file ] && ! EXEMPT.attributes[ `${ m.file }::${ m.attr }` ] && /^(padding|margin)$/.test( m.attr ) && ! EXEMPT.blocks[ m.block ] && 'ResponsiveBoxControls' !== m.control ) {
			files.add( m.file );
		}
	}
	return [ ...files ].sort();
}

function selfTest() {
	const failures = [];
	const ok = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	process.stdout.write( '[migrate-spacing-panel --self-test]\n\n' );
	const pair = ( indent ) =>
		[ 'padding', 'margin' ]
			.map(
				( a ) =>
					`${ indent }<ResponsiveOverride\n${ indent }\tvalue={ attributes.${ a } }\n${ indent }\tonChange={ ( obj ) => setAttributes( { ${ a }: obj } ) }\n${ indent }>\n${ indent }\t{ ( { ownValue, setOwnValue } ) => (\n${ indent }\t\t<SgsBoxControl label={ __( '${ a[ 0 ].toUpperCase() + a.slice( 1 ) }', 'sgs-blocks' ) } values={ ownValue } units={ BOX_UNITS } onChange={ setOwnValue } />\n${ indent }\t) }\n${ indent }</ResponsiveOverride>`
			)
			.join( '\n' );
	const head = "import { PanelBody } from '@wordpress/components';\nimport { SgsBoxControl, ResponsiveOverride, SgsLengthControl } from '../../components';\nimport { BOX_UNITS } from '../../components/ResponsiveBoxControl';\n";
	const only = `${ head }export const Edit = ( { attributes, setAttributes } ) => (\n\t<InspectorControls group="styles">\n\t\t<PanelBody title="Spacing" initialOpen={ false }>\n${ pair( '\t\t\t' ) }\n\t\t</PanelBody>\n\t</InspectorControls>\n);\n`;
	const a = migrateText( only );
	ok( 'a panel holding only the pair is replaced by the shared panel', a.text && /<ResponsiveBoxControls/.test( a.text ) && ! /PanelBody title/.test( a.text ) );
	ok( 'the dropped imports go and the shared one is added to the components import', a.text && /import \{ SgsLengthControl, ResponsiveBoxControls \} from '..\/..\/components';/.test( a.text ) && ! /BOX_UNITS/.test( a.text ) );
	const shared = `${ head }export const Edit = ( { attributes, setAttributes } ) => (\n\t<InspectorControls group="styles">\n\t\t<PanelBody title="Wrapper" initialOpen={ false }>\n\t\t\t<SgsLengthControl label="Gap" />\n${ pair( '\t\t\t' ) }\n\t\t</PanelBody>\n\t</InspectorControls>\n);\n`;
	const b = migrateText( shared );
	ok( 'a panel with other controls keeps them and gains the shared panel after it', b.text && /<SgsLengthControl label="Gap" \/>/.test( b.text ) && /<\/PanelBody>\n\t\t<ResponsiveBoxControls/.test( b.text ) && ! /ResponsiveOverride/.test( b.text.replace( /import[^\n]*\n/g, '' ) ) );
	ok( 'the result still parses and has no pair left', b.text && ! /SgsBoxControl label/.test( b.text ) );
	const odd = migrateText( only.replace( 'attributes.padding', 'attributes.somethingElse' ) );
	ok( 'a value other than the block\'s own padding is left manual', Boolean( odd.manual ) );
	const cond = migrateText( `${ head }export const Edit = ( { attributes, setAttributes } ) => (\n\t<X>\n\t\t{ show && (\n\t\t\t<PanelBody title="Wrapper">\n\t\t\t\t<SgsLengthControl label="Gap" />\n${ pair( '\t\t\t\t' ) }\n\t\t\t</PanelBody>\n\t\t) }\n\t</X>\n);\n` );
	ok( 'a panel inside a conditional that keeps other controls is left manual', Boolean( cond.manual ) );
	process.stdout.write( 0 === failures.length ? '\n[migrate-spacing-panel --self-test] ALL ASSERTIONS PASS.\n' : `\n[migrate-spacing-panel --self-test] ${ failures.length } FAILURE(S).\n` );
	process.exit( 0 === failures.length ? 0 : 1 );
}

function main() {
	if ( process.argv.includes( '--self-test' ) ) {
		selfTest();
		return;
	}
	const apply = process.argv.includes( '--apply' );
	const only = process.argv.includes( '--only' ) ? process.argv[ process.argv.indexOf( '--only' ) + 1 ] : null;
	let manual = 0;
	let changed = 0;
	for ( const file of targets() ) {
		if ( only && ! file.includes( only ) ) {
			continue;
		}
		const abs = path.join( PLUGIN, file );
		const r = migrateText( fs.readFileSync( abs, 'utf8' ) );
		if ( r.manual ) {
			manual++;
			process.stdout.write( `MANUAL ${ file }: ${ r.manual }\n` );
			continue;
		}
		changed++;
		process.stdout.write( `${ apply ? 'WROTE ' : 'would ' } ${ file }: ${ r.mounts } mount(s) in ${ r.panels } panel(s)${ r.note ? ` (${ r.note })` : '' }\n` );
		if ( apply ) {
			fs.writeFileSync( abs, r.text, 'utf8' );
		}
	}
	process.stdout.write( `${ changed } file(s) ${ apply ? 'written' : 'would change' }, ${ manual } manual\n` );
	void SRC;
}

main();
