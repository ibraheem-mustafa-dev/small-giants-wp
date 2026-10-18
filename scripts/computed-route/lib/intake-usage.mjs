// What a draft uses, as capability IDs (clone coverage plan step 1.6), so intake can raise a seen-but-unsupported row
// for each one the coverage map does not cover.
//
// The file read is the method (draftUsage). It reads, from the export's own files:
//   - the census's stamped template (lib/intake-census-template.mjs::draftSources): every element with its attributes,
//     decoded the runtime's way (`sc-raw-*` tags, `sc-camel-*` names), its inline style, and its state styles
//     (`style-hover`, `style-focus`, `style-after` and the rest: CSS under that pseudo-class or pseudo-element);
//   - every <style> body, and every stylesheet a helmet <link> loads from the export folder;
//   - the logic class and each helmet script, from their syntax trees (the census's own parser): CSS in strings and
//     string concatenations, style assignments, HTML or SVG markup written as strings (shadow DOM templates), and
//     elements made in code (`React.createElement` and its aliases, `document.createElement`, `createElementNS`);
//   - every SVG or CSS asset file the draft's files name (an SVG a script fetches and injects).
// The runtime read is the check (collectUsage, run in the draft page at each census visit): the stylesheets and the
// elements the running page shows that the draft owns (inside an import host, stamped, or in a shadow root of one),
// never the runtime's own shell. usageCheck names every capability only the running page showed, so a gap in the file
// read is reported, never silently trusted.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { groupSlug } from './capabilities.mjs';
import { parseLogic, walkAst } from './intake-census-logic.mjs';
import { decode, realTag } from './intake-census-template.mjs';
import { scanTags } from './intake-ast.mjs';

const require = createRequire( import.meta.url );
const csstree = require( 'css-tree' );
const MDN = require( 'mdn-data/css' );
const BCD = require( '@mdn/browser-compat-data' );
const BCD_GLOBALS = new Set( Object.keys( BCD.html.global_attributes ).filter( ( k ) => '__compat' !== k ) );
// The draft runtime's own elements (the census reads them as constructs) and attributes (its stamping marks; `ref` and
// `on*` are census constructs too; `key` is the runtime's list identity).
const RUNTIME_TAG = /^(?:sc|dc|x)-|^helmet$/;
const RUNTIME_ATTR = /^(?:data-dc-|data-sc-|sc-(?!camel-))|^(?:ref|key)$|^on/;
// The presentational hints (data/presentational-hints.json, from the WHATWG Rendering section): `<element>.<attribute>`
// → the CSS properties the browser turns that attribute into (`td.align` → text-align).
const HINTS = new Map( JSON.parse( fs.readFileSync( new URL( '../data/presentational-hints.json', import.meta.url ), 'utf8' ) ).entries.map( ( e ) => [ `${ e.element }.${ e.attribute }`, e.css ] ) );

// React props a template writes for an HTML attribute (the draft runtime renders through React).
const REACT_PROP = { defaultValue: 'value', defaultChecked: 'checked', className: 'class', htmlFor: 'for' };
const EMBED_TAGS = new Set( [ 'iframe', 'embed', 'object' ] );
const LEGACY_PSEUDO_ELEMENTS = new Set( [ 'before', 'after', 'first-line', 'first-letter' ] );
const MARKUP = /<[a-z][\w-]*[\s/>]/i;
const ASSET = /\.(?:svg|css)$/i;

// A usage tally: id → { count, draftId (the first place it was seen), props? (a CSS property group's properties the
// draft used, by their standard names) }.
export const tally = () => new Map();
const note = ( t, id, draftId, prop = null ) => {
	const u = t.get( id ) || { count: 0, draftId: String( draftId ) };
	u.count++;
	prop && ( u.props = new Set( [ ...( u.props || [] ), prop ] ) );
	t.set( id, u );
};

// The spec a URL names: its first path segment without a level (`drafts.csswg.org/css-text-4/#…` → css-text,
// `w3c.github.io/svgwg/…` → svgwg).
const specSlug = ( url ) => {
	try {
		const u = new URL( url );
		return ( u.pathname.split( '/' ).filter( Boolean )[ 0 ] || u.hostname ).replace( /-\d+$/, '' );
	} catch {
		return null;
	}
};
const specsOf = ( prop ) => [].concat( BCD.css.properties[ prop ]?.__compat?.spec_url || [] ).map( specSlug ).filter( Boolean );
// Spec → the mdn-data groups of the properties it defines that sit in one group only (css-position → CSS Positioned
// Layout), learned from the data, so a property mdn-data files under several groups can be credited to its own.
const SPEC_GROUPS = new Map();
for ( const [ prop, p ] of Object.entries( MDN.properties ) ) {
	if ( 1 === p.groups?.length ) {
		specsOf( prop ).forEach( ( s ) => SPEC_GROUPS.set( s, new Set( [ ...( SPEC_GROUPS.get( s ) || [] ), p.groups[ 0 ] ] ) ) );
	}
}
// A vendor or old name → the standard property browser-compat-data records it as (`-webkit-font-smoothing` →
// font-smooth, `-webkit-backdrop-filter` → backdrop-filter).
const ALIAS = new Map();
for ( const [ prop, v ] of Object.entries( BCD.css.properties ) ) {
	for ( const s of Object.values( v.__compat?.support || {} ) ) {
		for ( const e of [].concat( s ) ) {
			e.alternative_name && ALIAS.set( e.alternative_name, prop );
			e.prefix && ALIAS.set( `${ e.prefix }${ prop }`, prop );
		}
	}
}

// The property group IDs of a CSS property, by mdn-data (a custom property is `--*`). A property in several groups
// counts toward the groups its own spec defines (`top` is Positioned Layout, not Anchor Positioning; `text-transform`
// is Text, not MathML), or all of them when its spec names none. A vendor name counts as its standard property; a
// property only browser-compat-data lists is its own ID, and one neither lists is `css-property:unlisted` (no
// browser applies it).
function propertyIds( prop ) {
	const name = prop.toLowerCase();
	const p = name.startsWith( '--' ) ? MDN.properties[ '--*' ] : MDN.properties[ name ];
	if ( ! p && ! BCD.css.properties[ name ] && ALIAS.has( name ) ) {
		return propertyIds( ALIAS.get( name ) );
	}
	if ( p?.groups?.length ) {
		const specs = specsOf( name );
		const own = p.groups.filter( ( g ) => specs.some( ( s ) => SPEC_GROUPS.get( s )?.has( g ) ) );
		return ( own.length ? own : p.groups ).map( ( g ) => `css-group:${ groupSlug( g ) }` );
	}
	return [ BCD.css.properties[ name ] || name.startsWith( '--' ) ? `css-property:${ name }` : 'css-property:unlisted' ];
}

// A property's standard name: a vendor or old name browser-compat-data records under a standard one becomes it.
export function standardName( prop ) {
	const name = String( prop ).toLowerCase();
	return ! MDN.properties[ name ] && ! BCD.css.properties[ name ] && ALIAS.has( name ) ? standardName( ALIAS.get( name ) ) : name;
}

// Notes a CSS property's capability IDs, recording the property itself on each property group it counts toward.
const noteProperty = ( t, prop, draftId ) => propertyIds( prop ).forEach( ( id ) => note( t, id, draftId, id.startsWith( 'css-group:' ) ? standardName( prop ) : null ) );

// The pseudo-class or pseudo-element ID of a selector name: a legacy one-colon pseudo-element (`:before`), or a name
// the inventory holds only as a pseudo-element, is the pseudo-element.
const pseudoId = ( name, known ) => ( LEGACY_PSEUDO_ELEMENTS.has( name ) || ( ! known.has( `css-pseudo-class:${ name }` ) && known.has( `css-pseudo-element:${ name }` ) ) ? `css-pseudo-element:${ name }` : `css-pseudo-class:${ name }` );

// Every capability a stylesheet text uses: at-rules, media features (under @media; min-/max- name the same feature),
// property groups, pseudo-classes and pseudo-elements, functions and units (custom property values parsed too, since
// a token file is mostly custom properties). `context` is css-tree's: 'stylesheet', or 'value' for a bare value a
// binding writes. Returns the parse problems, each naming `draftId`.
export function cssUsage( text, t, draftId, known = new Set(), context = 'stylesheet' ) {
	const problems = [];
	let ast;
	try {
		ast = csstree.parse( String( text || '' ), { context, parseCustomProperty: true, onParseError: ( e ) => problems.push( `${ draftId }: ${ e.message }` ) } );
	} catch ( e ) {
		return [ `${ draftId }: ${ e.message }` ];
	}
	const inMedia = [];
	csstree.walk( ast, {
		enter( n ) {
			if ( 'Atrule' === n.type ) {
				note( t, `css-at:${ n.name.toLowerCase() }`, draftId );
				inMedia.push( 'media' === n.name.toLowerCase() );
			} else if ( ( 'Feature' === n.type || 'MediaFeature' === n.type ) && inMedia.at( -1 ) ) {
				note( t, `css-media-feature:${ n.name.toLowerCase().replace( /^(?:min|max)-/, '' ) }`, draftId );
			} else if ( 'FeatureRange' === n.type && inMedia.at( -1 ) && 'Identifier' === n.left?.type ) {
				note( t, `css-media-feature:${ n.left.name.toLowerCase() }`, draftId );
			} else if ( 'Declaration' === n.type ) {
				noteProperty( t, n.property, draftId );
			} else if ( 'PseudoClassSelector' === n.type ) {
				note( t, pseudoId( n.name.toLowerCase(), known ), draftId );
			} else if ( 'PseudoElementSelector' === n.type ) {
				note( t, `css-pseudo-element:${ n.name.toLowerCase() }`, draftId );
			} else if ( 'Function' === n.type ) {
				note( t, `css-function:${ n.name.toLowerCase() }`, draftId );
			} else if ( 'Dimension' === n.type ) {
				note( t, `css-unit:${ n.unit.toLowerCase() }`, draftId );
			} else if ( 'Percentage' === n.type ) {
				note( t, 'css-unit:percent', draftId );
			}
		},
		leave( n ) {
			if ( 'Atrule' === n.type ) {
				inMedia.pop();
			}
		},
	} );
	return problems;
}

// The embed ID of a URL: its host without `www.`, shortened to the closest inventory host (`player.vimeo.com` →
// `vimeo.com`); null for a relative, data or blob URL.
export function embedId( url, known = new Set() ) {
	let host;
	try {
		const u = new URL( url );
		if ( ! /^https?:$/.test( u.protocol ) ) {
			return null;
		}
		host = u.hostname.toLowerCase().replace( /^www\./, '' );
	} catch {
		return null;
	}
	for ( let h = host; h.includes( '.' ); h = h.slice( h.indexOf( '.' ) + 1 ) ) {
		if ( known.has( `embed:${ h }` ) ) {
			return `embed:${ h }`;
		}
	}
	return known.has( 'embed:other' ) ? 'embed:other' : `embed:${ host }`;
}

// Every capability a declaration list uses (an inline style or a state style). A declaration whose value is bound
// (`{{ }}`) names its property only: the value is the logic's, read there (codeUsage). Returns parse problems.
export function declarationsUsage( text, t, draftId, known = new Set() ) {
	const problems = [];
	const fixed = [];
	for ( const d of String( text || '' ).split( /;(?![^{]*\}\})/ ) ) {
		const at = d.indexOf( ':' );
		const prop = at > 0 ? d.slice( 0, at ).trim() : '';
		if ( d.includes( '{{' ) && /^-{0,2}[a-z][a-z0-9-]*$/i.test( prop ) ) {
			noteProperty( t, prop, draftId );
		} else if ( d.trim() ) {
			fixed.push( d );
		}
	}
	if ( fixed.length ) {
		problems.push( ...cssUsage( `x{${ fixed.join( ';' ) }}`, t, draftId, known ) );
	}
	return problems;
}

// The inventory's own-case name of an SVG element given in any case (`lineargradient` → `linearGradient`), or null.
const svgName = ( name, known ) => [ ...known ].find( ( id ) => id.startsWith( 'svg:' ) && id.slice( 4 ).toLowerCase() === String( name ).toLowerCase() )?.slice( 4 ) ?? null;
// Whether a tag is SVG by its name alone: an SVG element's name that names no HTML element (`circle`, not `a`).
const svgOnly = ( name, known ) => Boolean( svgName( name, known ) ) && ! known.has( `html:${ String( name ).toLowerCase() }` );

// Every capability one element uses: its tag (`svg` is an SVG element's own-case name, or true with `tag` holding it;
// a custom element is its tag alone), its attributes (global or its own; data-* as one; aria-* and role as ARIA; an SVG
// element's ARIA only), its state styles (`style-<state>`: that pseudo-class or pseudo-element, and the CSS), its input
// type, its embed host, its inline style, and the CSS a presentational attribute becomes (`<td align>`: text
// alignment, by the WHATWG presentational hints). A bound value (`{{ }}`) is never parsed. Returns parse problems.
export function elementUsage( { tag, attrs = [], svg = null }, t, draftId, known = new Set() ) {
	const real = realTag( String( tag || '' ) );
	const lower = real.toLowerCase();
	if ( ! lower || RUNTIME_TAG.test( lower ) || lower.includes( ':' ) ) {
		// A runtime element, or another vocabulary's element (an SVG file's `c2pa:manifest` metadata).
		return [];
	}
	const custom = ! svg && lower.includes( '-' );
	const svgId = svg && `svg:${ 'string' === typeof svg ? svg : real }`;
	// An SVG element browser-compat-data does not list (an editor's draft element no browser renders) is one ID, and
	// so is every custom element the draft defines (its tag names the draft's component, never a capability).
	note( t, svgId ? ( known.has( 'svg:unlisted' ) && ! known.has( svgId ) ? 'svg:unlisted' : svgId ) : custom ? 'html:custom-element' : `html:${ lower }`, draftId );
	const problems = [];
	for ( const [ rawName, rawValue ] of attrs ) {
		const name = REACT_PROP[ decode( String( rawName ) ) ] ?? decode( String( rawName ) );
		const a = name.toLowerCase();
		const value = String( rawValue ?? '' );
		const bound = value.includes( '{{' );
		if ( RUNTIME_ATTR.test( a ) || /[{}:@]/.test( a ) || ( 'value' === a && [ 'select', 'textarea' ].includes( lower ) ) ) {
			// A select's or textarea's `value` is the runtime's controlled state, not an HTML attribute.
			continue;
		}
		if ( a.startsWith( 'aria-' ) ) {
			note( t, `aria-attr:${ a }`, draftId );
			continue;
		}
		if ( 'role' === a ) {
			value.split( /\s+/ ).filter( ( r ) => r && ! r.includes( '{{' ) ).forEach( ( r ) => note( t, `aria-role:${ r.toLowerCase() }`, draftId ) );
			continue;
		}
		if ( a.startsWith( 'style-' ) ) {
			note( t, pseudoId( a.slice( 6 ), known ), draftId );
			problems.push( ...declarationsUsage( value, t, draftId, known ) );
			continue;
		}
		if ( 'style' === a ) {
			problems.push( ...declarationsUsage( value, t, draftId, known ) );
		}
		if ( svg || custom || ( 'input' === lower && 'type' === a ) ) {
			// An SVG element's attributes are its own drawing; a custom element's are its own API; an input's type is
			// `input-type:<type>` below.
		} else if ( a.startsWith( 'data-' ) ) {
			note( t, 'html-attr:global.data', draftId );
		} else {
			note( t, BCD_GLOBALS.has( a ) || known.has( `html-attr:global.${ a }` ) ? `html-attr:global.${ a }` : `html-attr:${ lower }.${ a }`, draftId );
		}
		// A presentational attribute is the CSS it becomes too (`<td align>` uses text alignment).
		( HINTS.get( `${ lower }.${ a }` ) || [] ).forEach( ( prop ) => noteProperty( t, prop, draftId ) );
		if ( 'input' === lower && 'type' === a && ! bound ) {
			note( t, `input-type:${ value.toLowerCase() }`, draftId );
		}
		if ( EMBED_TAGS.has( lower ) && [ 'src', 'data' ].includes( a ) && ! bound ) {
			const id = embedId( value, known );
			if ( id ) {
				note( t, id, draftId );
			}
		}
	}
	if ( 'input' === lower && ! attrs.some( ( [ n ] ) => 'type' === String( n ).toLowerCase() ) ) {
		note( t, 'input-type:text', draftId );
	}
	return problems;
}

// Every capability a piece of markup uses (a markup string in code, or an SVG file with `svgFile`): its elements by the
// census's own tag scanner (lib/intake-ast.mjs::scanTags), each SVG element by name inside an <svg> (or everywhere in an
// SVG file, except inside <foreignObject>), and each <style> body. Returns parse problems.
export function markupUsage( text, t, draftId, known = new Set(), { svgFile = false } = {} ) {
	const problems = [];
	const tags = scanTags( text );
	const closes = ( name, from, to ) => text.slice( from, to ).toLowerCase().includes( `</${ name }` );
	tags.forEach( ( tag, i ) => {
		if ( '?xml' === tag.name || tag.name.startsWith( '!' ) ) {
			return;
		}
		const prev = tags.slice( 0, i );
		const inside = ( name ) => prev.some( ( p ) => p.name === name && ! closes( name, p.end, tag.index ) );
		const inSvg = ( svgFile || inside( 'svg' ) || 'svg' === tag.name || svgOnly( tag.name, known ) ) && ! inside( 'foreignobject' );
		const svg = inSvg ? svgName( tag.name, known ) || tag.name : null;
		problems.push( ...elementUsage( { tag: tag.name, svg, attrs: tag.attrs.map( ( x ) => [ x.name, x.value ] ) }, t, draftId, known ) );
		if ( 'style' === tag.name ) {
			const end = text.toLowerCase().indexOf( '</style', tag.end );
			const body = text.slice( tag.end, end < 0 ? text.length : end );
			// A body built from a variable reads as the placeholder alone; the variable's own string is read where it is set.
			if ( /[{:]/.test( body ) ) {
				problems.push( ...cssUsage( body, t, draftId, known ) );
			}
		}
	} );
	return problems;
}

// A CSS property name mdn-data knows (or a custom property).
const isCssProperty = ( p ) => p.startsWith( '--' ) || Boolean( MDN.properties[ p ] );
const kebab = ( k ) => k.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` );

// The CSS a string in code holds, or null: a stylesheet (rules or at-rules whose declarations name a known property, or
// a known at-rule) or a declaration list (every `name: value` names a known property). Prose is never read as CSS.
export function cssInString( s ) {
	const text = String( s || '' ).trim();
	if ( ! text.includes( ':' ) && ! text.startsWith( '@' ) ) {
		return null;
	}
	if ( /[{}]/.test( text ) ) {
		let ok = false;
		try {
			csstree.walk( csstree.parse( text, { onParseError: () => {} } ), ( n ) => {
				ok = ok || ( 'Declaration' === n.type && isCssProperty( n.property.toLowerCase() ) ) || ( 'Atrule' === n.type && Boolean( MDN.atRules[ `@${ n.name.toLowerCase() }` ] ) );
			} );
		} catch {
			return null;
		}
		return ok ? text : null;
	}
	const decls = text.split( ';' ).map( ( d ) => d.trim() ).filter( Boolean );
	const named = decls.map( ( d ) => /^(-{0,2}[a-z][a-z0-9-]*)\s*:\s*\S/i.exec( d )?.[ 1 ].toLowerCase() );
	return named.length && named.every( ( p ) => p && isCssProperty( p ) ) ? `x{${ text }}` : null;
}

// Whether a string is a bare CSS value a binding writes (`'brightness(1.1) saturate(.9)'`, `'calc(100% - 2rem)'`,
// `'4px'`): it parses as a CSS value with no error, and every function and unit in it is one the inventory holds, with
// at least one of them. Prose and plain words are never read as CSS.
export function cssValue( s, known = new Set() ) {
	const text = String( s || '' ).trim();
	if ( ! text || text.length > 400 || ! /\(|\d[a-z%]/i.test( text ) ) {
		return false;
	}
	let bad = false;
	let hits = 0;
	try {
		csstree.walk( csstree.parse( text, { context: 'value', onParseError: () => ( bad = true ) } ), ( n ) => {
			if ( 'Function' === n.type ) {
				hits++;
				bad = bad || ! known.has( `css-function:${ n.name.toLowerCase() }` );
			} else if ( 'Dimension' === n.type ) {
				hits++;
				bad = bad || ! known.has( `css-unit:${ n.unit.toLowerCase() }` );
			} else if ( 'Raw' === n.type ) {
				bad = true;
			}
		} );
	} catch {
		return false;
	}
	return ! bad && hits > 0;
}

// The text a string node holds; a template literal's holes and a concatenation's non-string parts read as `0`, so the
// static text around them keeps its shape. A `+` chain is read whole at its top, never piece by piece.
function stringText( n ) {
	if ( 'StringLiteral' === n.type ) {
		return n.value;
	}
	if ( 'TemplateLiteral' === n.type ) {
		return n.quasis.map( ( q ) => q.value.cooked ?? q.value.raw ).join( '0' );
	}
	if ( 'BinaryExpression' === n.type && '+' === n.operator ) {
		const l = stringText( n.left );
		const r = stringText( n.right );
		return null === l && null === r ? null : `${ l ?? '0' }${ r ?? '0' }`;
	}
	return null;
}

// The attribute name a React prop stands for on an HTML element (`className` → `class`, `htmlFor` → `for`), or null
// for a prop that is no attribute (`children`, `key`, `ref`, an event handler, `style`, read on its own).
const PROP_ATTR = { className: 'class', htmlFor: 'for', acceptCharset: 'accept-charset', httpEquiv: 'http-equiv' };
const propAttr = ( k ) => ( /^(?:children|key|ref|style|dangerouslySetInnerHTML|suppress\w+)$|^on[A-Z]/.test( k ) ? null : PROP_ATTR[ k ] ?? ( /^(?:aria|data)-/.test( k ) ? k : k.toLowerCase() ) );

// The CSS and markup a logic class or script file writes, read from its syntax tree (the census's own parser and walk):
//   - CSS or markup in a string, a template literal or a `+` chain, and a bare CSS value a binding writes (cssValue);
//   - `<x>.style.<prop> = …`, `<x>.style.setProperty( '<prop>', … )`, `Object.assign( <x>.style, { … } )`;
//   - elements made in code: `React.createElement( 'tag', { props } )` or any alias of a `createElement` (`const c =
//     React.createElement`), `document.createElement( 'tag' )`, `createElementNS( svgNamespace, 'tag' )`: the tag (an
//     SVG element inside a created `svg`, by the namespace, or by an SVG-only name), the props as attributes, and a `style` object's
//     properties.
// `at( node )` names the draft ID. Returns parse problems.
export function codeUsage( ast, t, at, known = new Set() ) {
	const problems = [];
	const styleOf = ( n ) => 'MemberExpression' === n?.type && ! n.computed && 'style' === n.property?.name;
	const aliases = new Set();
	walkAst( ast.program, ( n ) => {
		if ( 'VariableDeclarator' === n.type && 'Identifier' === n.id?.type && 'MemberExpression' === n.init?.type && 'createElement' === n.init.property?.name ) {
			aliases.add( n.id.name );
		}
	} );
	const created = ( n ) => {
		if ( 'CallExpression' !== n?.type ) {
			return null;
		}
		const c = n.callee;
		const ns = 'MemberExpression' === c.type && 'createElementNS' === c.property?.name;
		const plain = ( 'MemberExpression' === c.type && 'createElement' === c.property?.name ) || ( 'Identifier' === c.type && aliases.has( c.name ) );
		const tagArg = ns ? n.arguments[ 1 ] : plain ? n.arguments[ 0 ] : null;
		if ( 'StringLiteral' !== tagArg?.type ) {
			return null;
		}
		return { tag: tagArg.value, svgNs: ns && /svg/i.test( n.arguments[ 0 ]?.value || '' ), props: plain && ! ( 'MemberExpression' === c.type && 'document' === c.object?.name ) ? n.arguments[ 1 ] : null };
	};
	const objectCss = ( obj, draftId ) => ( 'ObjectExpression' === obj?.type ? obj.properties : [] ).forEach( ( prop ) => {
		const k = prop.key && ( prop.key.name ?? prop.key.value );
		if ( k && isCssProperty( kebab( String( k ) ) ) ) {
			noteProperty( t, kebab( String( k ) ), draftId );
		}
	} );
	walkAst( ast.program, ( n, parents ) => {
		const parent = parents.at( -1 );
		const isString = [ 'StringLiteral', 'TemplateLiteral', 'BinaryExpression' ].includes( n.type );
		const el = created( n );
		if ( el ) {
			const inSvg = el.svgNs || 'svg' === el.tag || svgOnly( el.tag, known ) || parents.some( ( p ) => 'svg' === created( p )?.tag );
			const draftId = at( n );
			const props = 'ObjectExpression' === el.props?.type ? el.props.properties.filter( ( p ) => 'ObjectProperty' === p.type && ! p.computed ) : [];
			const attrs = props.map( ( p ) => [ propAttr( String( p.key.name ?? p.key.value ) ), 'StringLiteral' === p.value.type ? p.value.value : '{{ }}' ] ).filter( ( [ a ] ) => a );
			problems.push( ...elementUsage( { tag: el.tag, svg: inSvg ? svgName( el.tag, known ) || el.tag : null, attrs }, t, draftId, known ) );
			objectCss( props.find( ( p ) => 'style' === ( p.key.name ?? p.key.value ) )?.value, draftId );
		} else if ( isString && ! ( 'BinaryExpression' === parent?.type && '+' === parent.operator ) ) {
			const s = stringText( n );
			if ( null === s ) {
				return;
			}
			if ( MARKUP.test( s ) ) {
				problems.push( ...markupUsage( s, t, at( n ), known ) );
			} else if ( cssInString( s ) ) {
				problems.push( ...cssUsage( cssInString( s ), t, at( n ), known ) );
			} else if ( cssValue( s, known ) ) {
				cssUsage( s, t, at( n ), known, 'value' );
			}
		} else if ( 'AssignmentExpression' === n.type && 'MemberExpression' === n.left.type && ! n.left.computed && styleOf( n.left.object ) ) {
			const p = kebab( n.left.property.name );
			if ( isCssProperty( p ) ) {
				noteProperty( t, p, at( n ) );
			}
		} else if ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type && styleOf( n.callee.object ) && 'setProperty' === n.callee.property?.name && 'StringLiteral' === n.arguments[ 0 ]?.type ) {
			noteProperty( t, n.arguments[ 0 ].value, at( n ) );
		} else if ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type && 'Object' === n.callee.object?.name && 'assign' === n.callee.property?.name && styleOf( n.arguments[ 0 ] ) ) {
			n.arguments.slice( 1 ).forEach( ( a ) => objectCss( a, at( n ) ) );
		}
	} );
	return problems;
}

// The export's files, as paths relative to the folder (MANIFEST.json's list when it has one, else every file).
function exportFiles( folder ) {
	const manifest = path.join( folder, 'MANIFEST.json' );
	if ( fs.existsSync( manifest ) ) {
		return ( JSON.parse( fs.readFileSync( manifest, 'utf8' ) ).files || [] ).map( ( f ) => f.path );
	}
	const out = [];
	const walk = ( d ) => fs.readdirSync( path.join( folder, d ), { withFileTypes: true } ).forEach( ( e ) => ( e.isDirectory() ? walk( path.join( d, e.name ) ) : out.push( path.join( d, e.name ).split( path.sep ).join( '/' ) ) ) );
	walk( '' );
	return out;
}

// The file read: everything listed at the top of this file. `sources` is the census's (draftSources). Returns
// { usage, problems }.
export function draftUsage( { sources = [], folder = null, known = new Set() } ) {
	const t = tally();
	const problems = [];
	const linked = new Set();
	const said = [];
	for ( const s of sources ) {
		for ( const e of s.stamped?.elements || [] ) {
			const draftId = `${ s.component }:${ e.n }`;
			problems.push( ...elementUsage( e, t, draftId, known ) );
			if ( 'style' === e.tag && e.body ) {
				problems.push( ...cssUsage( e.body, t, draftId, known ) );
			}
			const href = e.attrs?.find( ( [ n ] ) => 'href' === n )?.[ 1 ];
			if ( 'link' === e.tag && href && /stylesheet/i.test( e.attrs.find( ( [ n ] ) => 'rel' === n )?.[ 1 ] || '' ) && ! /^[a-z]+:|^\/\//i.test( href ) ) {
				linked.add( href.replace( /^\.\//, '' ).split( /[?#]/ )[ 0 ] );
			}
			e.attrs?.forEach( ( [ , v ] ) => said.push( String( v ?? '' ) ) );
		}
		said.push( s.template || '', s.logic || '' );
		const logics = [ ...( s.logic ? [ { text: s.logic, opts: { startLine: s.logicLine || 1, startColumn: s.logicColumn || 0 }, types: [ 'module' ], comp: s.component } ] : [] ), ...( s.scripts || [] ).filter( ( x ) => x.text ).map( ( x ) => ( { text: x.text, opts: {}, types: [ 'script', 'module' ], comp: x.src } ) ) ];
		for ( const l of logics ) {
			said.push( l.text );
			const ast = l.types.map( ( sourceType ) => {
				try {
					return parseLogic( l.text, { ...l.opts, sourceType } );
				} catch {
					return null;
				}
			} ).find( Boolean );
			if ( ! ast ) {
				problems.push( `${ l.comp }: the code does not parse, so its CSS and markup are not read` );
				continue;
			}
			problems.push( ...codeUsage( ast, t, ( n ) => `${ l.comp }:js:${ n.loc.start.line }:${ n.loc.start.column }`, known ) );
		}
	}
	for ( const href of [ ...linked ].sort() ) {
		const file = folder ? path.join( folder, href ) : null;
		if ( ! file || ! fs.existsSync( file ) ) {
			problems.push( `linked stylesheet ${ href } is not in the export folder` );
			continue;
		}
		const text = fs.readFileSync( file, 'utf8' );
		said.push( text );
		problems.push( ...cssUsage( text, t, href, known ) );
	}
	// Asset files the draft's files name (a fetched SVG, an @import-ed sheet), read once each.
	if ( folder && fs.existsSync( folder ) ) {
		const text = said.join( '\n' );
		for ( const f of exportFiles( folder ).filter( ( x ) => ASSET.test( x ) && ! linked.has( x ) ).sort() ) {
			if ( ! text.includes( path.posix.basename( f ) ) || ! fs.existsSync( path.join( folder, f ) ) ) {
				continue;
			}
			const body = fs.readFileSync( path.join( folder, f ), 'utf8' );
			problems.push( ...( /\.svg$/i.test( f ) ? markupUsage( body, t, f, known, { svgFile: true } ) : cssUsage( body, t, f, known ) ) );
		}
	}
	return { usage: t, problems };
}

// In-page (page.evaluate): what the running page uses, as the check on the file read. Only what the draft owns: an
// element inside an import host (`.sc-host`, never the host wrapper itself), a stamped element (`[data-dc-tpl]`, the
// helmet's children moved to <head> included) and its subtree, and everything in a shadow root such an element hosts;
// never an element the runtime made or a class it added; a stylesheet whose owner is such an element (a <style>'s own text and a same-origin <link>'s own file, never the
// browser's re-serialised rules), every sheet in such a shadow root, each sheet one of those @imports, and the
// document's adopted sheets. The
// runtime's own shell and styles are counted (`foreignSheets`, `foreignElements`), never read. Returns { css: [ text ],
// inline: [ an element's style attribute as `x{...}` ], elements: [ { tag, svg, attrs: [[name, value]], key } ], blockedSheets, foreignSheets, foreignElements }: one element
// record per distinct shape (namespace, tag, attribute names, and the type, role, src and data values); `svg` is an SVG
// element's own-case name; `key` the nearest stamped draft ID.
export async function collectUsage() {
	const css = [];
	const inline = [];
	let blockedSheets = 0;
	let foreignSheets = 0;
	let foreignElements = 0;
	const sheetText = ( sheet ) => {
		try {
			return [ ...sheet.cssRules ].map( ( r ) => ( r instanceof CSSImportRule && r.styleSheet ? sheetText( r.styleSheet ) : r.cssText ) ).join( '\n' );
		} catch {
			blockedSheets++;
			return '';
		}
	};
	const ownedEl = ( e ) => Boolean( e && e.closest && e.closest( '.sc-host, [data-dc-tpl]' ) );
	const roots = [ { root: document, owned: false } ];
	for ( let i = 0; i < roots.length; i++ ) {
		roots[ i ].root.querySelectorAll( '*' ).forEach( ( e ) => e.shadowRoot && roots.push( { root: e.shadowRoot, owned: roots[ i ].owned || ownedEl( e ) } ) );
	}
	const seen = new Map();
	for ( const { root, owned } of roots ) {
		for ( const sheet of root.styleSheets ) {
			if ( owned || ownedEl( sheet.ownerNode ) ) {
				// A <style>'s own text, not its rules re-serialised (the browser writes #fff as rgb(255, 255, 255)), plus
				// the sheets it @imports.
				if ( 'STYLE' === sheet.ownerNode?.tagName ) {
					css.push( sheet.ownerNode.textContent );
					try {
						[ ...sheet.cssRules ].filter( ( r ) => r instanceof CSSImportRule && r.styleSheet ).forEach( ( r ) => css.push( sheetText( r.styleSheet ) ) );
					} catch {
						blockedSheets++;
					}
				} else if ( 'LINK' === sheet.ownerNode?.tagName && sheet.href && new URL( sheet.href ).origin === location.origin ) {
					// A linked sheet's own file text, fetched from the draft server, not its rules re-serialised.
					css.push( await fetch( sheet.href ).then( ( r ) => r.text() ).catch( () => sheetText( sheet ) ) );
				} else {
					css.push( sheetText( sheet ) );
				}
			} else {
				foreignSheets++;
			}
		}
		( root.adoptedStyleSheets || [] ).forEach( ( sheet ) => css.push( sheetText( sheet ) ) );
		for ( const e of root.querySelectorAll( '*' ) ) {
			if ( ! owned && ! ownedEl( e ) ) {
				foreignElements++;
				continue;
			}
			// The runtime's own classes (the draft runtime, support.js: `sc-interp` on an interpolation's span, `sc-host*`,
			// `sc-placeholder*`, and `scp<n>` for a state style, whose CSS sits in the runtime's own <style>).
			const ownClass = ( e.getAttribute( 'class' ) || '' ).split( /\s+/ ).filter( ( c ) => c && ! /^(?:sc-[\w-]+|scp[0-9a-z]+)$/.test( c ) );
			if ( ! e.hasAttribute( 'data-dc-tpl' ) && e.hasAttribute( 'class' ) && ! ownClass.length ) {
				// An element the runtime made (an interpolation's span, a placeholder), not the draft.
				continue;
			}
			const svg = 'http://www.w3.org/2000/svg' === e.namespaceURI ? e.localName : null;
			const attrs = [ ...e.attributes ].map( ( a ) => [ a.name, 'class' === a.name ? ownClass.join( ' ' ) : a.value ] ).filter( ( [ n, v ] ) => 'class' !== n || v );
			if ( e.getAttribute( 'style' ) ) {
				inline.push( `x{${ e.getAttribute( 'style' ) }}` );
			}
			if ( e.matches( '.sc-host' ) ) {
				// An import host is the runtime's wrapper (its class and name are the runtime's); only the style the
				// draft gave its dc-import, read above, is the draft's.
				continue;
			}
			const sig = `${ svg }|${ e.localName }|${ attrs.map( ( [ n, v ] ) => ( [ 'type', 'role', 'src', 'data' ].includes( n ) ? `${ n }=${ v }` : n ) ).sort().join( ' ' ) }`;
			if ( ! seen.has( sig ) ) {
				const host = e.closest( '[data-dc-tpl]' );
				const comp = host?.parentElement?.closest( '.sc-host[data-sc-name]' )?.dataset.scName;
				seen.set( sig, { tag: e.localName, svg, attrs: attrs.filter( ( [ n ] ) => 'style' !== n ), key: host && comp ? `${ comp }:${ host.getAttribute( 'data-dc-tpl' ) }` : null } );
			}
		}
	}
	return { css: [ ...new Set( css.filter( Boolean ) ) ], inline: [ ...new Set( inline ) ], elements: [ ...seen.values() ], blockedSheets, foreignSheets, foreignElements };
}

// Merges one visit's collectUsage result into an accumulator ({ css: Set, elements: Map, blockedSheets, foreignSheets,
// foreignElements }), keeping the most any one visit counted.
export function mergeRuntimeUsage( acc, raw, visit ) {
	[ 'blockedSheets', 'foreignSheets', 'foreignElements' ].forEach( ( k ) => ( acc[ k ] = Math.max( acc[ k ] || 0, raw[ k ] || 0 ) ) );
	raw.css.forEach( ( c ) => acc.css.add( c ) );
	acc.inline = acc.inline || new Set();
	( raw.inline || [] ).forEach( ( c ) => acc.inline.add( c ) );
	raw.elements.forEach( ( e ) => {
		const sig = `${ e.svg }|${ e.tag }|${ e.attrs.map( ( [ n ] ) => n ).sort().join( ' ' ) }|${ e.attrs.filter( ( [ n ] ) => [ 'type', 'role', 'src', 'data' ].includes( n ) ).map( ( x ) => x.join( '=' ) ).join( ' ' ) }`;
		if ( ! acc.elements.has( sig ) ) {
			acc.elements.set( sig, { ...e, visit } );
		}
	} );
	return acc;
}

// The runtime read as a tally: the same mappers over what the running page showed. `raw` is the accumulator or its
// JSON form (css, inline and elements as arrays). An element's draft ID is its stamped key, else the visit that showed it.
export function runtimeUsage( raw, known = new Set() ) {
	const t = tally();
	[ ...( raw?.css || [] ) ].forEach( ( c ) => cssUsage( c, t, 'a stylesheet of the running page', known ) );
	// The browser writes every colour in an inline style as rgb()/rgba() however the draft wrote it, so those two are
	// no evidence there; every other capability an inline style shows counts.
	const inline = tally();
	[ ...( raw?.inline || [] ) ].forEach( ( c ) => cssUsage( c, inline, 'an inline style of the running page', known ) );
	[ ...inline ].filter( ( [ id ] ) => ! /^css-function:rgba?$/.test( id ) ).forEach( ( [ id, u ] ) => {
		const had = t.get( id );
		had ? Object.assign( had, { count: had.count + u.count }, u.props ? { props: new Set( [ ...( had.props || [] ), ...u.props ] ) } : {} ) : t.set( id, u );
	} );
	[ ...( raw?.elements?.values?.() || raw?.elements || [] ) ].forEach( ( e ) => elementUsage( e, t, e.key || `${ e.visit || 'runtime' } (no draft ID)`, known ) );
	return t;
}

// The check: IDs the running page showed that the file read did not. Returns [ { id, draftId } ].
export const usageCheck = ( fileUsage, runtime ) => [ ...runtime ].filter( ( [ id ] ) => ! fileUsage.has( id ) ).map( ( [ id, u ] ) => ( { id, draftId: u.draftId } ) ).sort( ( a, b ) => ( a.id < b.id ? -1 : 1 ) );
