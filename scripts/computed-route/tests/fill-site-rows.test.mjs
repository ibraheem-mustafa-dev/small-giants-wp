// Proves the Site Info row expansion (icon plan, Bean's ruling): a skeleton `sgs/social-icons` node carrying
// `siteInfoRow` / `childAttributes` / `childRefs` becomes the row of Site Info-bound brand icons the committed Eye Care
// footer and drawer trees hold, the Fill-only keys never reach the written tree, and a bad slug is a skeleton problem.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expandSiteInfoRows, skeletonProblems, skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { brandRegistry } from '../lib/brand-registry.mjs';
import { addRefs, walk } from '../lib/tree.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { openDb } from '../lib/db.mjs';

const BUILD = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../sites/eye-care-ward-end/build' );
const committed = ( file, className ) => {
	let hit = null;
	walk( JSON.parse( fs.readFileSync( path.join( BUILD, file ), 'utf8' ) ), ( n ) => {
		if ( n.attributes?.className === className ) {
			hit = n;
		}
	} );
	return hit;
};
const withoutClass = ( n ) => {
	const { className, ...rest } = n.attributes || {};
	return { name: n.name, attributes: rest };
};
const rowOf = ( skeleton ) => cleanTree( expandSiteInfoRows( skeleton ) )[ 0 ];

test( 'the footer row: eight listed brands expand to the committed footer tree children', () => {
	const want = committed( 'footer.tree.json', 'cr-ref-footer-6' );
	const row = rowOf( [ { name: 'sgs/social-icons', attributes: { gap: { desktop: '10px' } }, siteInfoRow: [ 'whatsapp', 'facebook', 'instagram', 'x', 'linkedin', 'youtube', 'tiktok', 'google' ] } ] );
	assert.equal( row.innerBlocks.length, 8 );
	assert.deepEqual( row.innerBlocks.map( withoutClass ), want.innerBlocks.map( withoutClass ) );
	assert.deepEqual( row.attributes, { gap: { desktop: '10px' } }, 'the row own attributes are untouched' );
} );

test( 'the drawer row: instagram, google and whatsapp with the shared and the per-brand settings', () => {
	const want = committed( 'mobile-menu.tree.json', 'cr-ref-mobile-menu-12' );
	assert.equal( want.innerBlocks.length, 3 );
	const shared = { sgsChildSizing: { desktop: 'fill' }, scaleHover: 1, linkTarget: '_blank', linkRel: 'noopener' };
	const row = cleanTree( expandSiteInfoRows( [ { name: 'sgs/social-icons', attributes: {}, siteInfoRow: [ 'instagram', 'google', 'whatsapp' ], childAttributes: shared } ] ) )[ 0 ];
	// The per-brand extras the committed drawer carries on top of the shared settings are set on the generated children by the author.
	row.innerBlocks[ 1 ].attributes.ariaLabel = 'Google reviews';
	Object.assign( row.innerBlocks[ 2 ].attributes, { iconColour: 'success', iconColourHover: 'success', backgroundColour: 'whatsapp-soft', backgroundColourHover: 'whatsapp-soft', borderColour: 'whatsapp-line', borderColourHover: 'whatsapp-line' } );
	assert.deepEqual( row.innerBlocks.map( withoutClass ), want.innerBlocks.map( withoutClass ) );
} );

test( 'siteInfoRow absent means every registry brand in registry order, keyed by the registry siteInfoKey', () => {
	const row = rowOf( [ { name: 'sgs/social-icons', childAttributes: {} } ] );
	const brands = brandRegistry();
	assert.deepEqual( row.innerBlocks.map( ( c ) => c.attributes.brandName ), brands.map( ( b ) => b.slug ) );
	assert.deepEqual( row.innerBlocks.map( ( c ) => c.attributes.metadata.bindings.linkUrl.args.key ), brands.map( ( b ) => b.siteInfoKey ) );
	assert.ok( row.innerBlocks.every( ( c ) => 'sgs/icon' === c.name && 'brand' === c.attributes.iconSource && 'sgs/site-info' === c.attributes.metadata.bindings.linkUrl.source ) );
} );

test( 'the Fill-only keys are stripped by cleanTree and a node without them is left alone', () => {
	const sk = [ { name: 'sgs/social-icons', draftRef: '.row', siteInfoRow: [ 'x' ], childAttributes: { linkRel: 'noopener' }, childRefs: { x: 'a' } }, { name: 'sgs/text', attributes: { text: 'Hi' } } ];
	const before = JSON.stringify( sk );
	const out = cleanTree( expandSiteInfoRows( sk ) );
	assert.equal( JSON.stringify( sk ), before, 'the input is not changed' );
	assert.ok( ! /siteInfoRow|childAttributes|childRefs|draftRef/.test( JSON.stringify( out ) ) );
	assert.deepEqual( out[ 1 ], { name: 'sgs/text', attributes: { text: 'Hi' }, innerBlocks: [] } );
	assert.equal( expandSiteInfoRows( [ { name: 'sgs/text', siteInfoRow: [ 'x' ] } ] )[ 0 ].innerBlocks, undefined, 'only sgs/social-icons expands' );
} );

test( 'MUST FAIL: an unknown slug, a duplicate, a wrong shape and a row with its own children are skeleton problems', () => {
	const p = ( node ) => skeletonProblems( [ { name: 'sgs/social-icons', ...node } ] ).join( '\n' );
	assert.match( p( { siteInfoRow: [ 'instagram', 'myspace' ] } ), /node 0 \(sgs\/social-icons\) siteInfoRow brand "myspace" is not in the brand registry/ );
	assert.match( p( { siteInfoRow: [ 'x', 'x' ] } ), /lists "x" twice/ );
	assert.match( p( { siteInfoRow: 'x' } ), /siteInfoRow must be a list of brand slugs/ );
	assert.match( p( { childAttributes: [ 1 ] } ), /childAttributes must be an object/ );
	assert.match( p( { siteInfoRow: [ 'x' ], innerBlocks: [ { name: 'sgs/icon' } ] } ), /siteInfoRow and its own innerBlocks/ );
	assert.match( p( { siteInfoRow: [ 'x' ], childRefs: { facebook: 'a' }, draftRef: '.r' } ), /childRefs names "facebook", which siteInfoRow does not list/ );
	assert.match( p( { siteInfoRow: [ 'x' ], childRefs: { x: 'a' } } ), /childRefs needs the row draftRef as a selector/ );
	assert.match( skeletonProblems( [ { name: 'sgs/text', siteInfoRow: [ 'x' ] } ] ).join(), /siteInfoRow belongs to sgs\/social-icons only/ );
	assert.deepEqual( skeletonProblems( [ { name: 'sgs/social-icons', draftRef: '.r', siteInfoRow: [ 'x' ], childRefs: { x: 'a.x' } } ] ), [] );
} );

// Through fillTree: each generated child finds its draft link inside the row's draft element, keeps the address as its
// fallback and hands it to Site Info.
test( 'a child with a draft link keeps it as linkUrl and reports it; a child with none is bound and reports nothing', () => {
	const skeleton = expandSiteInfoRows( [ { name: 'sgs/social-icons', draftRef: '.row', siteInfoRow: [ 'instagram', 'facebook' ], childRefs: { instagram: 'a.ig', facebook: 'a.fb' } } ] );
	assert.equal( skeleton[ 0 ].innerBlocks[ 0 ].draftRef, '.row a.ig' );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const S = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'box-shadow': 'none' };
	const snap = ( href ) => ( { styles: S, pseudo: {}, rect: { x: 0, y: 0, w: 40, h: 40 }, inFlow: true, words: '', href } );
	const cal = { block: 'x', elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, S ] ) ) }, settings: {}, discovered: {}, link: { linkUrl: { path: '', attr: 'href' } } };
	const reads = { widths: Object.fromEntries( [ 375, 768, 1024, 1440, 1920 ].map( ( w ) => [ w, { '0:': snap( null ), '1:': snap( 'https://instagram.com/eyecare' ), '2:': { missing: true } } ] ) ), declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db: openDb(), snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: () => cal, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	assert.equal( tree[ 0 ].innerBlocks[ 0 ].attributes.linkUrl, 'https://instagram.com/eyecare' );
	assert.equal( tree[ 0 ].innerBlocks[ 1 ].attributes.linkUrl, undefined );
	assert.deepEqual( out.handover.map( ( h ) => [ h.owner, h.kind, h.evidence.siteInfoKey, h.evidence.draft ] ), [ [ 'site-info', 'link', 'socials.instagram', 'https://instagram.com/eyecare' ] ] );
} );
