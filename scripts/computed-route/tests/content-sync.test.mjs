// content-sync.mjs's plan (lib/content-sync.mjs): which built posts and template copies a mirror's content is written to,
// and when nothing may be written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planSync, syncTargets, readPhp, writePhp, writtenMismatches } from '../lib/content-sync.mjs';

const post = ( type, md5, content = 'Yw==' ) => ( { type, md5, content } );

test( 'MUST FAIL: only a post whose content differs is written, with the mirror\'s content', () => {
	const plan = planSync( { posts: { 5: post( 'page', 'a', 'QQ==' ), 6: post( 'page', 'b' ) }, templates: {} }, { posts: { 5: post( 'page', 'z' ), 6: post( 'page', 'b' ) }, templates: {} } );
	assert.deepEqual( plan.posts, { 5: 'QQ==' } );
	assert.equal( plan.same, 1 );
	assert.deepEqual( plan.problems, [] );
} );

test( 'MUST FAIL: a post of another type on each side means the ids diverged, and is a problem', () => {
	const plan = planSync( { posts: { 7: post( 'page', 'a' ) }, templates: {} }, { posts: { 7: post( 'sgs_footer', 'z' ) }, templates: {} } );
	assert.deepEqual( plan.posts, {} );
	assert.match( plan.problems[ 0 ], /ids have diverged/ );
} );

test( 'MUST FAIL: a post missing on either side is a problem, never a write', () => {
	assert.match( planSync( { posts: { 8: null }, templates: {} }, { posts: { 8: post( 'page', 'z' ) }, templates: {} } ).problems[ 0 ], /not on the mirror/ );
	assert.match( planSync( { posts: { 9: post( 'page', 'a' ) }, templates: {} }, { posts: { 9: null }, templates: {} } ).problems[ 0 ], /not on the target site/ );
} );

test( 'a template copy the target lacks is written; one only the target holds is a problem; one neither holds is not built yet', () => {
	const copy = { id: 3, md5: 'a', content: 'VA==' };
	const plan = planSync( { posts: {}, templates: { single: copy, page: null, 'single-product': null } }, { posts: {}, templates: { single: null, page: { id: 9, md5: 'b' }, 'single-product': null } } );
	assert.deepEqual( plan.templates, { single: 'VA==' } );
	assert.equal( plan.problems.length, 1 );
	assert.match( plan.problems[ 0 ], /template page has no copy on the mirror but has one on the target site/ );
	// Real case: Mama's product surface (2026-10-26) had not been built, so the whole sync refused.
	assert.deepEqual( plan.notBuilt, [ 'single-product' ] );
} );

test( 'syncTargets takes each surface\'s post id and template slug once, limited by --only', () => {
	const surfaces = { a: { target: { postId: 1 } }, b: { target: { postId: 1 } }, c: { target: { template: 'single' } }, d: { target: { postId: 4 } } };
	assert.deepEqual( syncTargets( surfaces ), { ids: [ 1, 4 ], templates: [ 'single' ], parts: [] } );
	assert.deepEqual( syncTargets( surfaces, [ 'd' ] ), { ids: [ 4 ], templates: [], parts: [] } );
} );

test( 'the write slashes content and the request rides in the code as base64', () => {
	const php = writePhp( { posts: { 5: 'QQ==' }, templates: {} } );
	assert.match( php, /wp_slash\( base64_decode\( \$c \) \)/ );
	assert.match( readPhp( { ids: [ 5 ], templates: [], withContent: true } ), /base64_decode\( '[A-Za-z0-9+/=]+' \)/ );
} );

const part = ( md5, content = 'UA==', area = 'header' ) => ( { id: 9, md5, content, area } );

test( 'MUST FAIL: syncTargets returns each template part slug once, in key order', () => {
	const surfaces = { a: { target: { templatePart: 'header' } }, b: { target: { templatePart: 'footer' } }, c: { target: { templatePart: 'header' } }, d: { target: { postId: 4 } } };
	assert.deepEqual( syncTargets( surfaces ), { ids: [ 4 ], templates: [], parts: [ 'header', 'footer' ] } );
	assert.deepEqual( syncTargets( surfaces, [ 'b' ] ).parts, [ 'footer' ] );
} );

test( 'MUST FAIL: a changed template part is planned with its area, a same-md5 one is skipped, one only the target holds is a problem, one neither holds is not built yet', () => {
	const plan = planSync(
		{ posts: {}, templates: {}, parts: { header: part( 'a', 'SA==', 'header' ), footer: part( 'b' ), nav: null, toolbar: null } },
		{ posts: {}, templates: {}, parts: { header: part( 'z' ), footer: part( 'b' ), nav: part( 'n' ) } }
	);
	assert.deepEqual( plan.parts, { header: 'SA==' } );
	assert.deepEqual( plan.areas, { header: 'header' } );
	assert.equal( plan.same, 1 );
	assert.match( plan.problems[ 0 ], /template part nav has no copy on the mirror but has one on the target site/ );
	assert.deepEqual( plan.notBuilt, [ 'part toolbar' ] );
} );

test( 'MUST FAIL: a template part the target lacks is planned for insertion', () => {
	const plan = planSync( { posts: {}, templates: {}, parts: { footer: part( 'b', 'Rg==', 'footer' ) } }, { posts: {}, templates: {}, parts: { footer: null } } );
	assert.deepEqual( plan.parts, { footer: 'Rg==' } );
} );

test( 'MUST FAIL: readPhp reads template parts scoped to the active theme, with their area', () => {
	const php = readPhp( { ids: [], templates: [], parts: [ 'header' ], withContent: false } );
	assert.match( php, /'post_type' => 'wp_template_part'.*'taxonomy' => 'wp_theme'.*get_stylesheet\(\)/ );
	assert.match( php, /wp_get_object_terms\(.*'wp_template_part_area'/ );
	assert.match( php, /'uncategorized'/ );
	assert.match( php, /\$out\['parts'\]/ );
} );

test( 'MUST FAIL: writePhp updates or inserts template parts with the wp_theme and area terms, and reports ERR part', () => {
	const php = writePhp( { posts: {}, templates: {}, parts: { header: 'SA==' }, areas: { header: 'header' } } );
	assert.match( php, /'post_type' => 'wp_template_part', 'name' => \$slug.*'taxonomy' => 'wp_theme'/ );
	assert.match( php, /wp_insert_post\( array\( 'post_type' => 'wp_template_part'.*wp_slash\( base64_decode\( \$c \) \)/ );
	assert.match( php, /wp_set_object_terms\( \$r, get_stylesheet\(\), 'wp_theme' \)/ );
	assert.match( php, /wp_set_object_terms\( \$r, .*'wp_template_part_area' \)/ );
	assert.match( php, /'ERR part ', \$slug/ );
} );

test( 'MUST FAIL: the after-write check names every written post, template and part whose md5 differs from the mirror', () => {
	const plan = { posts: { 5: 'QQ==' }, templates: { single: 'VA==' }, parts: { header: 'SA==', footer: 'Rg==' } };
	const mirror = { posts: { 5: post( 'page', 'a' ) }, templates: { single: { md5: 'b' } }, parts: { header: part( 'c' ), footer: part( 'd' ) } };
	const target = { posts: { 5: post( 'page', 'a' ) }, templates: { single: { md5: 'x' } }, parts: { header: part( 'c' ), footer: part( 'q' ) } };
	assert.deepEqual( writtenMismatches( plan, mirror, target ), [ 'template single', 'part footer' ] );
	assert.deepEqual( writtenMismatches( plan, mirror, mirror ), [] );
	assert.deepEqual( writtenMismatches( plan, mirror, { posts: {}, templates: {}, parts: {} } ), [ 'post 5', 'template single', 'part header', 'part footer' ] );
} );
