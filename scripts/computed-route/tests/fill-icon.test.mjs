// Spec 48 FR-48-39 (inline SVG), lib/fill-icon.mjs: the one writer for a whole <svg> subtree. A registry brand glyph is a
// brand icon, a Lucide-drawn stroke mark is a Lucide icon, anything else is the client's own mark with the sanitiser's tags
// and attributes only; a tag the block's sanitiser drops is a named row; the icon source is decided from the draft's icon alone, never from what the node held before.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { iconDecisions, allowedSvg, signature, markKind, lucideSignatures, brandSignatures, LUCIDE_FILE, BRAND_FILE } from '../lib/fill-icon.mjs';

const SCHEMA = { iconSource: {}, iconName: {}, brandName: {}, iconSvg: {}, iconFill: {} };
const val = ( r, attr ) => r.writes.find( ( w ) => w.attr === attr )?.value;
const run = ( markup, over = {} ) => iconDecisions( { svg: { markup }, schema: SCHEMA, ...over } );

// A real Lucide icon's markup, as the draft's resolved read would carry it (paint on each drawing element).
const lucideMarkup = ( name ) => {
	const m = new RegExp( `'${ name }'\\s*=>\\s*'(?:<!--.*?-->)?(<svg.*?</svg>)'`, 's' ).exec( fs.readFileSync( LUCIDE_FILE, 'utf8' ) );
	return m[ 1 ].replace( /<(path|circle|rect|line|polyline|polygon|ellipse)\b/g, '<$1 fill="none" stroke="currentColor" stroke-width="2px" stroke-linecap="round" stroke-linejoin="round"' ).replace( / class="[^"]*"/, '' );
};
const WHATSAPP = JSON.parse( fs.readFileSync( BRAND_FILE, 'utf8' ) ).brands.find( ( b ) => 'whatsapp' === b.slug ).glyph.svg;

test( 'the sanitiser\'s tags and attributes are read from the block\'s PHP source', () => {
	const a = allowedSvg();
	assert.ok( a.path.has( 'd' ) && a.circle.has( 'cx' ) && a.svg.has( 'viewbox' ) && a.path.has( 'stroke-width' ) );
	assert.ok( a.filter && a.lineargradient && a.fegaussianblur && a.femergenode );
	assert.equal( a.script, undefined );
	assert.equal( a.foreignobject, undefined );
} );

test( 'MUST FAIL: a Lucide-drawn stroke mark is that Lucide icon, and no markup is written', () => {
	const name = [ ...lucideSignatures().values() ].find( ( n ) => 'activity' === n );
	const r = run( lucideMarkup( name ) );
	assert.equal( val( r, 'iconSource' ), 'lucide' );
	assert.equal( val( r, 'iconName' ), 'activity' );
	assert.equal( val( r, 'iconSvg' ), undefined );
} );

test( 'MUST FAIL: the same shapes drawn 1.5 wide are the client\'s own mark, kept as custom markup', () => {
	const r = run( lucideMarkup( 'activity' ).replace( /stroke-width="2px"/g, 'stroke-width="1.5px"' ) );
	assert.equal( val( r, 'iconSource' ), 'custom' );
	assert.match( val( r, 'iconSvg' ), /stroke-width="1\.5px"/ );
	assert.doesNotMatch( val( r, 'iconSvg' ), /class=|style=|width="24"/ );
	assert.equal( val( r, 'iconFill' ), undefined, 'a stroke mark is not filled' );
} );

test( 'MUST FAIL: a registry brand glyph with its own SVG is that brand', () => {
	const r = run( WHATSAPP.replace( 'fill="currentColor"', '' ).replace( '<path', '<path fill="currentColor"' ) );
	assert.equal( val( r, 'iconSource' ), 'brand' );
	assert.equal( val( r, 'brandName' ), 'whatsapp' );
	assert.ok( brandSignatures().bySlug.has( 'whatsapp' ) );
} );

test( 'MUST FAIL: a filled mark of its own is custom markup with iconFill', () => {
	const r = run( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="24" height="24"><path d="M1 1h8v8H1z" fill="currentColor"/><circle cx="5" cy="5" r="2" fill="#fff"/></svg>' );
	assert.equal( val( r, 'iconSource' ), 'custom' );
	assert.equal( val( r, 'iconFill' ), true );
	assert.match( val( r, 'iconSvg' ), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 10 10">/ );
	assert.equal( markKind( { name: 'svg', attrs: {}, children: [ { name: 'path', attrs: { fill: 'red', stroke: 'blue' }, children: [] } ] } ).kind, 'mixed' );
} );

test( 'MUST FAIL: gradients, filters and groups the sanitiser keeps survive; script, foreignObject and handlers do not', () => {
	const r = run( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient><filter id="f"><feGaussianBlur stdDeviation="2"/></filter></defs><g onclick="x()"><rect width="5" height="5" fill="url(&quot;#g&quot;)" filter="url(#f)"/></g><script>alert(1)</script><foreignObject><div/></foreignObject></svg>' );
	const svg = val( r, 'iconSvg' );
	assert.match( svg, /<linearGradient id="g"><stop offset="0" stop-color="red">/ );
	assert.match( svg, /<feGaussianBlur stdDeviation="2">/ );
	assert.match( svg, /fill="url\(#g\)"/ );
	assert.doesNotMatch( svg, /script|foreignObject|onclick/ );
	assert.deepEqual( r.unmapped.map( ( u ) => u.value ), [ '<foreignObject>', '<script>' ] );
	assert.match( r.unmapped[ 0 ].reason, /not kept by the icon's sanitiser/ );
} );

test( 'MUST FAIL: an icon node that starts brand takes the draft\'s inline SVG as its custom source, whatever it held before', () => {
	const brandNode = { iconSource: 'brand', brandName: 'whatsapp' };
	const other = run( lucideMarkup( 'activity' ).replace( /stroke-width="2px"/g, 'stroke-width="1.5px"' ), { attributes: brandNode } );
	assert.equal( val( other, 'iconSource' ), 'custom' );
	assert.match( val( other, 'iconSvg' ), /<svg/ );
	const lucide = run( lucideMarkup( 'activity' ), { attributes: brandNode } );
	assert.equal( val( lucide, 'iconSource' ), 'lucide' );
	assert.equal( val( lucide, 'iconName' ), 'activity' );
	const same = run( WHATSAPP.replace( '<path', '<path fill="currentColor"' ), { attributes: brandNode } );
	assert.deepEqual( same, { writes: [], unmapped: [], notes: [] }, 'a draft that is the node\'s own brand glyph changes nothing' );
	const first = run( lucideMarkup( 'activity' ).replace( /stroke-width="2px"/g, 'stroke-width="1.5px"' ), { attributes: { iconSource: 'emoji', brandName: 'whatsapp' } } );
	assert.deepEqual( first.writes, other.writes, 'the decision does not depend on the value an earlier write left in iconSource' );
} );

test( 'a block without iconSvg, an absent SVG and unreadable markup write nothing, the last with a named row', () => {
	assert.deepEqual( iconDecisions( { svg: { markup: lucideMarkup( 'activity' ) }, schema: { linkUrl: {} } } ), { writes: [], unmapped: [], notes: [] } );
	assert.deepEqual( iconDecisions( { svg: null, schema: SCHEMA } ), { writes: [], unmapped: [], notes: [] } );
	assert.match( run( '<svg><path></svg>' ).unmapped[ 0 ].reason, /not well-formed/ );
	assert.match( run( '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>' ).unmapped.at( -1 ).reason, /no drawing element/ );
} );

test( 'a mark the node already holds is not written again', () => {
	const r = run( lucideMarkup( 'activity' ), { attributes: { iconSource: 'lucide', iconName: 'activity' } } );
	assert.deepEqual( r.writes, [] );
	assert.equal( signature( { name: 'svg', attrs: {}, children: [ { name: 'path', attrs: { d: 'M0 0', fill: 'red' }, children: [] } ] } ), 'pathd=M0 0' );
} );

test( 'MUST FAIL: a block that draws an inline icon but declares no iconSource (a button) is written only the icon settings it declares; the rest are named rows', () => {
	const out = iconDecisions( { svg: { markup: '<svg viewBox="0 0 24 24"><path d="M3 3h7v7H3z" fill="currentColor"/></svg>' }, schema: { iconSvg: {} } } );
	assert.ok( ! out.writes.some( ( w ) => 'iconSource' === w.attr ), 'no iconSource is written on a block without it' );
	assert.ok( out.writes.some( ( w ) => 'iconSvg' === w.attr ), 'the markup is written to the block\'s own iconSvg' );
	assert.ok( out.unmapped.some( ( u ) => 'iconSource' === u.value ), 'iconSource is a named row' );
} );

// A node the skeleton made a Site Info brand row (lib/fill-skeleton.mjs::expandSiteInfoRows): iconSource brand, its brand
// name and a link bound to Site Info. The draft draws its own glyph for the brand, which is never the registry's path data.
const BOUND = { iconSource: 'brand', brandName: 'whatsapp', metadata: { bindings: { linkUrl: { source: 'sgs/site-info', args: { key: 'socials.whatsapp' } } } } };
const OWN_GLYPH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path d="M3 3h18v18H3z M7 7h10v10H7z" fill="currentColor"/></svg>';

test( 'MUST FAIL: a Site Info-bound brand row stays brand when the draft mark is that brand by its link host, even though the glyph is the draft own', () => {
	const r = run( OWN_GLYPH, { attributes: BOUND, href: 'https://api.whatsapp.com/send?phone=447000000000' } );
	assert.equal( val( r, 'iconSource' ), undefined, 'no write turns the bound brand into a custom mark' );
	assert.equal( val( r, 'iconSvg' ), undefined );
	assert.ok( r.notes.some( ( n ) => /whatsapp/.test( n ) && /Site Info/.test( n ) ), 'the glyph difference is named, never silent' );
	const byHost = run( OWN_GLYPH, { attributes: { ...BOUND, brandName: 'facebook', metadata: { bindings: { linkUrl: { source: 'sgs/site-info', args: { key: 'socials.facebook' } } } } }, href: 'https://www.facebook.com/indusfoods' } );
	assert.equal( val( byHost, 'iconSource' ), undefined );
	assert.equal( val( byHost, 'iconSvg' ), undefined );
} );

test( 'MUST FAIL: a Site Info-bound brand row stays brand when the draft mark names the brand in its title or label', () => {
	const titled = OWN_GLYPH.replace( '<path', '<title>WhatsApp</title><path' );
	const r = run( titled, { attributes: BOUND, href: '' } );
	assert.equal( val( r, 'iconSource' ), undefined );
	const labelled = OWN_GLYPH.replace( '<svg ', '<svg aria-label="whatsapp" ' );
	assert.equal( val( run( labelled, { attributes: BOUND } ), 'iconSource' ), undefined );
	assert.equal( val( run( OWN_GLYPH, { attributes: { ...BOUND, ariaLabel: 'WhatsApp' }, href: '/' } ), 'iconSource' ), undefined, 'the aria-label Fill already wrote from the draft link names the brand (draft icon links often point at /)' );
	assert.equal( val( run( OWN_GLYPH, { attributes: { ...BOUND, ariaLabel: 'Contact us' }, href: '/' } ), 'iconSource' ), 'custom', 'a label that is not the brand is no evidence' );
} );

test( 'MUST FAIL: a bound brand row whose iconSource an earlier write of the run turned to emoji is put back to brand, never made custom', () => {
	const turned = { ...BOUND, iconSource: 'emoji', ariaLabel: 'WhatsApp' };
	const r = run( OWN_GLYPH, { attributes: turned, href: '#/' } );
	assert.equal( val( r, 'iconSource' ), 'brand' );
	assert.equal( val( r, 'iconSvg' ), undefined );
	assert.equal( val( run( OWN_GLYPH, { attributes: { ...turned, ariaLabel: 'Contact us' }, href: '#/' } ), 'iconSource' ), 'custom', 'a mark that is not the brand is its own mark whatever the node held' );
} );

test( 'a Site Info-bound brand row whose draft mark is another thing is the own mark of the client and its link binding stays', () => {
	const r = run( OWN_GLYPH, { attributes: BOUND, href: 'https://example.com/contact' } );
	assert.equal( val( r, 'iconSource' ), 'custom' );
	assert.match( val( r, 'iconSvg' ), /<svg/ );
	assert.equal( r.writes.some( ( w ) => 'metadata' === w.attr ), false );
	const unbound = run( OWN_GLYPH, { attributes: { iconSource: 'brand', brandName: 'whatsapp' }, href: 'https://api.whatsapp.com/send?phone=447000000000' } );
	assert.equal( val( unbound, 'iconSource' ), 'custom', 'a brand node that is not bound to Site Info is decided from the mark alone' );
	const other = run( WHATSAPP.replace( '<path', '<path fill="currentColor"' ), { attributes: { ...BOUND, brandName: 'facebook' }, href: 'https://example.com' } );
	assert.equal( val( other, 'brandName' ), undefined, 'a bound row is never re-pointed at the glyph of another brand' );
	assert.equal( val( other, 'iconSource' ), 'custom' );
} );
