// Copying a mirror's built content to the site it mirrors (Spec 48 FR-48-55, Bean 2026-10-26): a client's surfaces are
// built and walked on its local mirror (no host edge to trip), then each built post's content is written to the same post
// id on the test site, and the single-post template to that site's template copy of the same slug. The mirror is refreshed
// from the test site after the site build, so every id (posts, menus, media) is the same on both sides; a post whose type
// differs between the two means the ids have diverged, and nothing is written.

// The PHP that reads the posts `ids` and the theme's template copies `templates` ({ posts: { id: { type, md5, content } },
// templates: { slug: { id, md5, content } } }; content base64, only with `withContent`). The request rides in the code as
// base64 because `wp eval-file -` takes the code itself on stdin.
export function readPhp( { ids, templates, withContent } ) {
	const req = Buffer.from( JSON.stringify( { ids, templates, withContent: !! withContent } ) ).toString( 'base64' );
	return `<?php
$d = json_decode( base64_decode( '${ req }' ), true );
$out = array( 'posts' => new stdClass(), 'templates' => new stdClass() );
$body = function ( $p ) use ( $d ) { return $d['withContent'] ? base64_encode( $p->post_content ) : null; };
foreach ( $d['ids'] as $id ) {
	$p = get_post( (int) $id );
	$out['posts']->{ $id } = $p ? array( 'type' => $p->post_type, 'md5' => md5( $p->post_content ), 'content' => $body( $p ) ) : null;
}
foreach ( $d['templates'] as $slug ) {
	$q = get_posts( array( 'post_type' => 'wp_template', 'name' => $slug, 'post_status' => 'any', 'numberposts' => 1, 'tax_query' => array( array( 'taxonomy' => 'wp_theme', 'field' => 'name', 'terms' => get_stylesheet() ) ) ) );
	$out['templates']->{ $slug } = $q ? array( 'id' => $q[0]->ID, 'md5' => md5( $q[0]->post_content ), 'content' => $body( $q[0] ) ) : null;
}
echo wp_json_encode( $out );
`;
}

// The PHP that writes `posts` ({ id: base64 content }) and `templates` ({ slug: base64 content }); prints one `ERR` line per
// failed write, then `DONE`. Content goes through wp_slash, because wp_update_post strips a level of backslashes.
export function writePhp( { posts, templates } ) {
	const req = Buffer.from( JSON.stringify( { posts, templates } ) ).toString( 'base64' );
	return `<?php
$d = json_decode( base64_decode( '${ req }' ), true );
foreach ( $d['posts'] as $id => $c ) {
	$r = wp_update_post( array( 'ID' => (int) $id, 'post_content' => wp_slash( base64_decode( $c ) ) ), true );
	if ( is_wp_error( $r ) ) { echo 'ERR post ', $id, ' ', $r->get_error_message(), "\\n"; }
}
foreach ( $d['templates'] as $slug => $c ) {
	$q = get_posts( array( 'post_type' => 'wp_template', 'name' => $slug, 'post_status' => 'any', 'numberposts' => 1, 'tax_query' => array( array( 'taxonomy' => 'wp_theme', 'field' => 'name', 'terms' => get_stylesheet() ) ) ) );
	if ( $q ) {
		$r = wp_update_post( array( 'ID' => $q[0]->ID, 'post_content' => wp_slash( base64_decode( $c ) ) ), true );
	} else {
		$r = wp_insert_post( array( 'post_type' => 'wp_template', 'post_name' => $slug, 'post_title' => $slug, 'post_status' => 'publish', 'post_content' => wp_slash( base64_decode( $c ) ) ), true );
		is_wp_error( $r ) || wp_set_object_terms( $r, get_stylesheet(), 'wp_theme' );
	}
	if ( is_wp_error( $r ) ) { echo 'ERR template ', $slug, ' ', $r->get_error_message(), "\\n"; }
}
echo 'DONE';
`;
}

// What a surfaces.json names to sync: post ids (`target.postId`) and template slugs (`target.template`), in key order.
export function syncTargets( surfaces, only = null ) {
	const ids = [];
	const templates = [];
	for ( const [ key, e ] of Object.entries( surfaces ) ) {
		if ( only && ! only.includes( key ) ) {
			continue;
		}
		e?.target?.postId && ids.push( e.target.postId );
		e?.target?.template && templates.push( e.target.template );
	}
	return { ids: [ ...new Set( ids ) ], templates: [ ...new Set( templates ) ] };
}

// The plan from the two reads: { posts: { id: content }, templates: { slug: content }, same, problems }. A post missing on
// either side, or of another type on each, is a problem; a template the mirror lacks is a problem (the target's own copy
// is created when it lacks one); content with the same md5 is left alone.
export function planSync( from, to ) {
	const plan = { posts: {}, templates: {}, same: 0, problems: [] };
	for ( const [ id, s ] of Object.entries( from.posts || {} ) ) {
		const t = to.posts?.[ id ];
		if ( ! s ) {
			plan.problems.push( `post ${ id } is not on the mirror` );
		} else if ( ! t ) {
			plan.problems.push( `post ${ id } is not on the target site` );
		} else if ( s.type !== t.type ) {
			plan.problems.push( `post ${ id } is a ${ s.type } on the mirror but a ${ t.type } on the target site: the ids have diverged (refresh the mirror from the target after its site build)` );
		} else if ( s.md5 === t.md5 ) {
			plan.same++;
		} else {
			plan.posts[ id ] = s.content;
		}
	}
	for ( const [ slug, s ] of Object.entries( from.templates || {} ) ) {
		const t = to.templates?.[ slug ];
		if ( ! s ) {
			plan.problems.push( `template ${ slug } has no copy on the mirror` );
		} else if ( t && s.md5 === t.md5 ) {
			plan.same++;
		} else {
			plan.templates[ slug ] = s.content;
		}
	}
	return plan;
}
