// Most dead hover settings are not custom properties: render.php (or a helper under includes/) emits a literal scoped rule, so
// tools/fixture-completeness.mjs must find the emitter by the setting's name and judge the selector it paints. Planted blocks
// cover each shape the census's 82 unexplained settings take: a variable that flows into a selector, an anchor the fixture
// never renders, a helper that builds the name from a suffix, a parent's setting read from block context by its child, and a
// gradient setting that follows its flat sibling. MUST FAIL: the old tool called every one of them "no style.css rule".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { check } from '../tools/fixture-completeness.mjs';

const RENDER_S = `<?php
$overlay_hover = $attributes['overlayHover'] ?? '';
if ( '' !== $overlay_hover ) {
	$paint = sgs_decls( $overlay_hover );
	$css .= sgs_emit_state_colour_css(
		'.' . $uid . ' .sgs-s__overlay',
		array(),
		array( $paint )
	);
}
$css .= sgs_hover_state_rules( $root . ' .sgs-s__text a', 'color:' . $attributes['linkHover'] );
$css .= sgs_hover_state_rules( $root . ' .sgs-s__text', 'color:' . $attributes['textHover'] );
$css .= sgs_link_css( $attributes, '', $root );
`;
const HELPERS = `<?php
function sgs_link_css( $attributes, $prefix, $selector ) {
	$link = $selector . ' a';
	$hover = $attributes[ sgs_attr( $prefix, 'SuffixedLinkColourHover' ) ] ?? '';
	return sgs_hover_state_rules( $link, 'color:' . $hover );
}
`;
const RENDER_ITEM = `<?php
$header_hover = $block->context['sgs/pHeaderHover'] ?? '';
$css .= sgs_hover_state_rules( $root . ' .sgs-p-item__header', 'color:' . $header_hover );
`;

// Blocks `s`, `p` (parent) and `p-item` (child); `rendered` is the class/element list of s's default paint.
function build( rendered, dead = [ 'overlayHover', 'linkHover', 'textHover', 'suffixedLinkColourHover', 'flatHover', 'flatHoverGradient' ] ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fc-scoped-' ) );
	const put = ( rel, text ) => {
		fs.mkdirSync( path.dirname( path.join( dir, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( dir, rel ), text );
	};
	put( 'plugins/sgs-blocks/src/blocks/s/render.php', RENDER_S );
	put( 'plugins/sgs-blocks/src/blocks/p/render.php', '<?php\n' );
	put( 'plugins/sgs-blocks/src/blocks/p-item/render.php', RENDER_ITEM );
	put( 'plugins/sgs-blocks/includes/helpers-link.php', HELPERS );
	put( 'cache/s.json', JSON.stringify( { block: 'sgs/s', dead } ) );
	put( 'cache/p.json', JSON.stringify( { block: 'sgs/p', dead: [ 'headerHover' ] } ) );
	put( 'cache/site/s.paint.json', JSON.stringify( { elements: Object.fromEntries( rendered.map( ( e ) => [ e, {} ] ) ) } ) );
	put( 'cache/site/p.paint.json', JSON.stringify( { elements: { '': {}, '.sgs-p-item__header': {} } } ) );
	return { cacheDir: path.join( dir, 'cache' ), srcDir: path.join( dir, 'plugins/sgs-blocks/src/blocks') };
}
const verdicts = ( rendered, dead ) => Object.fromEntries( check( build( rendered, dead ) ).map( ( r ) => [ `${ r.block }.${ r.attr }`, r ] ) );

test( 'MUST FAIL: a setting whose value flows into a scoped rule on an element the fixture never rendered is a fixture-gap naming it', () => {
	const v = verdicts( [ '', '.sgs-s__text', '.sgs-s__text > a' ] )[ 'sgs/s.overlayHover' ];
	assert.equal( v.class, 'fixture-gap' );
	assert.deepEqual( v.missing, [ 'sgs-s__overlay' ] );
	assert.equal( v.cause, 'scoped-rule' );
	assert.deepEqual( v.emitters, [ 'src/blocks/s/render.php' ] );
} );

test( 'MUST FAIL: once the fixture renders that element the setting is unexplained by the fixture, and says which file emits it', () => {
	const v = verdicts( [ '', '.sgs-s__overlay', '.sgs-s__text', '.sgs-s__text > a' ] )[ 'sgs/s.overlayHover' ];
	assert.equal( v.class, 'unexplained' );
	assert.equal( v.cause, 'scoped-rule' );
	assert.match( v.why, /src\/blocks\/s\/render\.php/ );
} );

test( 'MUST FAIL: a rule painting a link is a fixture-gap on `a` until the fixture renders an anchor; a rule on a plain element is not', () => {
	const without = verdicts( [ '', '.sgs-s__overlay', '.sgs-s__text' ] );
	assert.equal( without[ 'sgs/s.linkHover' ].class, 'fixture-gap' );
	assert.deepEqual( without[ 'sgs/s.linkHover' ].missing, [ 'a' ] );
	assert.notEqual( without[ 'sgs/s.textHover' ].class, 'fixture-gap', 'a rule on a rendered element and no link needs nothing added' );
	const withLink = verdicts( [ '', '.sgs-s__overlay', '.sgs-s__text', '.sgs-s__text > a' ] );
	assert.equal( withLink[ 'sgs/s.linkHover' ].class, 'unexplained' );
} );

test( 'MUST FAIL: a helper that builds the name from a suffix is the emitter, and its link selector needs an anchor', () => {
	const v = verdicts( [ '', '.sgs-s__overlay', '.sgs-s__text' ] )[ 'sgs/s.suffixedLinkColourHover' ];
	assert.equal( v.class, 'fixture-gap' );
	assert.deepEqual( v.emitters, [ 'includes/helpers-link.php' ] );
	assert.deepEqual( v.missing, [ 'a' ] );
} );

test( 'MUST FAIL: a parent setting read from block context by its child is emitted by the child, which paints a rendered element', () => {
	const v = verdicts( [ '' ] )[ 'sgs/p.headerHover' ];
	assert.equal( v.cause, 'scoped-rule' );
	assert.deepEqual( v.emitters, [ 'src/blocks/p-item/render.php' ] );
	assert.equal( v.class, 'unexplained', 'the item header is rendered by the parent fixture' );
} );

test( 'MUST FAIL: a gradient setting with no emitter of its own follows its flat sibling; with no sibling it has no emitter', () => {
	const v = verdicts( [ '', '.sgs-s__overlay', '.sgs-s__text', '.sgs-s__text > a' ] );
	assert.equal( v[ 'sgs/s.flatHover' ].cause, 'no-emitter' );
	assert.equal( v[ 'sgs/s.flatHoverGradient' ].cause, 'gradient-twin' );
	assert.deepEqual( v[ 'sgs/s.flatHoverGradient' ].twin, { attr: 'flatHover', class: 'unexplained', cause: 'no-emitter' } );
	const lone = verdicts( [ '' ], [ 'flatHoverGradient' ] )[ 'sgs/s.flatHoverGradient' ];
	assert.equal( lone.cause, 'no-emitter' );
} );
