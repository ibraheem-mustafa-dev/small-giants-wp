// The site run marks each post it builds with the site build's content marker (Spec 48 FR-48-55), so the next site build
// reads the clone's own build as its own and still stops on a person's edit. Each test MUST FAIL when its rule breaks.
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import crypto from 'crypto';
import { planBuild } from '../lib/site-build-plan.mjs';
import { buildThenMarkPost, contentMarkPhp } from '../lib/site-build-apply.mjs';
import { CONTENT_META } from '../lib/site-build-state.mjs';

const sha = ( s ) => crypto.createHash( 'sha256' ).update( s ).digest( 'hex' );
const row = { route: 'home', slug: 'home', title: 'Home', parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: 10 };

// A site whose PHP runner understands only the marker statement: it stores the hash of the post's current content.
function fakeSite( content ) {
	const meta = {};
	const runPhp = ( php ) => {
		const m = php.match( /update_post_meta\( (\d+), '([^']+)', hash\( 'sha256', get_post_field\( 'post_content', \1, 'raw' \) \) \);/ );
		assert.ok( m, `the runner was sent something other than the content marker: ${ php }` );
		meta[ `${ m[ 1 ] }:${ m[ 2 ] }` ] = sha( site.content );
		return '';
	};
	const site = { content, meta, runPhp };
	return site;
}
// What the site build reads back for post 10 (lib/site-build-state.mjs::statePhp's contentHash and builtContentHash).
const stateOf = ( site ) => ( {
	holders: {}, marked: {}, menus: [], locations: {}, registeredLocations: [], templates: { page: [] },
	options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/' },
	pointers: { header: 0, footer: 0, drawer: 0 }, pointerKeys: {}, templateHashes: {}, templateContent: {}, templateSaved: {}, customTemplates: [],
	posts: { 10: { id: 10, type: 'page', slug: 'home', title: 'Home', status: 'publish', parent: 0, template: '', rowKey: 'page:home', treeHash: 'old', sectionPage: 0,
		contentHash: sha( site.content ), builtContentHash: site.meta[ `10:${ CONTENT_META }` ] ?? 'a-marker-from-the-last-site-build', content: null } },
} );
const plan = ( site ) => planBuild( { rows: [ row ], state: stateOf( site ), repo: os.tmpdir(), client: 'none' } );

test( 'MUST FAIL: after a site-run build the stored marker equals the site build\'s hash of the read-back content, so its edit check passes', async () => {
	const site = fakeSite( 'old content' );
	assert.equal( plan( site ).problems.length, 1, 'baseline: the stale marker of an earlier site build reads as an edit' );
	site.content = '<!-- wp:sgs/heading /-->'; // what the site run's build saved
	const said = await buildThenMarkPost( { build: async () => 'built', postId: 10, runPhp: site.runPhp } );
	assert.equal( said, 'built' );
	assert.equal( site.meta[ `10:${ CONTENT_META }` ], sha( site.content ) );
	assert.deepEqual( plan( site ).problems, [] );
} );

test( 'MUST FAIL: a hand edit after the recorded build still stops the site build', async () => {
	const site = fakeSite( 'built content' );
	await buildThenMarkPost( { build: async () => 'built', postId: 10, runPhp: site.runPhp } );
	site.content = 'built content, then a person typed here';
	const p = plan( site );
	assert.equal( p.problems.length, 1 );
	assert.match( p.problems[ 0 ], /post 10 was edited after the site build saved it/ );
} );

test( 'MUST FAIL: a failed build writes no marker, and a surface with no post id (a template copy) writes none either', async () => {
	const site = fakeSite( 'x' );
	await assert.rejects( buildThenMarkPost( { build: async () => { throw new Error( 'build failed' ); }, postId: 10, runPhp: site.runPhp } ), /build failed/ );
	await buildThenMarkPost( { build: async () => 'built', postId: null, runPhp: site.runPhp } );
	assert.deepEqual( site.meta, {} );
} );

test( 'the marker PHP takes only a positive integer post id', () => {
	assert.match( contentMarkPhp( 141 ), /update_post_meta\( 141, '_sgs_site_build_content'/ );
	assert.throws( () => contentMarkPhp( '1); drop' ), /not a post id/ );
	assert.throws( () => contentMarkPhp( 0 ), /not a post id/ );
} );
