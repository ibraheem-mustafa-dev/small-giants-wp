// Copying a mirror's built content to the site it mirrors (Spec 48 FR-48-55, Bean 2026-10-26): a client's surfaces are
// built and walked on its local mirror (no host edge to trip), then each built post's content is written to the same post
// id on the test site, the single-post template to that site's template copy of the same slug, and each template part to that site's copy of the same slug. The mirror is refreshed
// from the test site after the site build, so every id (posts, menus, media) is the same on both sides; a post whose type
// differs between the two means the ids have diverged, and nothing is written.

// The PHP that reads the posts `ids`, the theme's template copies `templates` and its template part copies `parts` ({ posts:
// { id: { type, md5, content } }, templates: { slug: { id, md5, content } }, parts: { slug: { id, md5, content, area } } };
// content base64, only with `withContent`). The request rides in the code as
// base64 because `wp eval-file -` takes the code itself on stdin.
export function readPhp( { ids, templates, parts = [], withContent } ) {
	const req = Buffer.from( JSON.stringify( { ids, templates, parts, withContent: !! withContent } ) ).toString( 'base64' );
	return `<?php
$d = json_decode( base64_decode( '${ req }' ), true );
$out = array( 'posts' => new stdClass(), 'templates' => new stdClass(), 'parts' => new stdClass() );
$body = function ( $p ) use ( $d ) { return $d['withContent'] ? base64_encode( $p->post_content ) : null; };
foreach ( $d['ids'] as $id ) {
	$p = get_post( (int) $id );
	$out['posts']->{ $id } = $p ? array( 'type' => $p->post_type, 'md5' => md5( $p->post_content ), 'content' => $body( $p ) ) : null;
}
foreach ( $d['templates'] as $slug ) {
	$q = get_posts( array( 'post_type' => 'wp_template', 'name' => $slug, 'post_status' => 'any', 'numberposts' => 1, 'tax_query' => array( array( 'taxonomy' => 'wp_theme', 'field' => 'name', 'terms' => get_stylesheet() ) ) ) );
	$out['templates']->{ $slug } = $q ? array( 'id' => $q[0]->ID, 'md5' => md5( $q[0]->post_content ), 'content' => $body( $q[0] ) ) : null;
}
foreach ( $d['parts'] as $slug ) {
	$q = get_posts( array( 'post_type' => 'wp_template_part', 'name' => $slug, 'post_status' => 'any', 'numberposts' => 1, 'tax_query' => array( array( 'taxonomy' => 'wp_theme', 'field' => 'name', 'terms' => get_stylesheet() ) ) ) );
	$area = $q ? wp_get_object_terms( $q[0]->ID, 'wp_template_part_area', array( 'fields' => 'names' ) ) : array();
	$out['parts']->{ $slug } = $q ? array( 'id' => $q[0]->ID, 'md5' => md5( $q[0]->post_content ), 'content' => $body( $q[0] ), 'area' => ( $area && ! is_wp_error( $area ) ) ? $area[0] : 'uncategorized' ) : null;
}
echo wp_json_encode( $out );
`;
}

// The PHP that writes `posts` ({ id: base64 content }), `templates` and `parts` ({ slug: base64 content }; a part the site lacks
// is inserted with its `areas` entry, { slug: area }); prints one `ERR` line per
// failed write, then `DONE`. Content goes through wp_slash, because wp_update_post strips a level of backslashes.
export function writePhp( { posts, templates, parts = {}, areas = {} } ) {
	const req = Buffer.from( JSON.stringify( { posts, templates, parts, areas } ) ).toString( 'base64' );
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
foreach ( $d['parts'] as $slug => $c ) {
	$q = get_posts( array( 'post_type' => 'wp_template_part', 'name' => $slug, 'post_status' => 'any', 'numberposts' => 1, 'tax_query' => array( array( 'taxonomy' => 'wp_theme', 'field' => 'name', 'terms' => get_stylesheet() ) ) ) );
	if ( $q ) {
		$r = wp_update_post( array( 'ID' => $q[0]->ID, 'post_content' => wp_slash( base64_decode( $c ) ) ), true );
	} else {
		$r = wp_insert_post( array( 'post_type' => 'wp_template_part', 'post_name' => $slug, 'post_title' => $slug, 'post_status' => 'publish', 'post_content' => wp_slash( base64_decode( $c ) ) ), true );
		if ( ! is_wp_error( $r ) ) {
			wp_set_object_terms( $r, get_stylesheet(), 'wp_theme' );
			wp_set_object_terms( $r, isset( $d['areas'][ $slug ] ) ? $d['areas'][ $slug ] : 'uncategorized', 'wp_template_part_area' );
		}
	}
	if ( is_wp_error( $r ) ) { echo 'ERR part ', $slug, ' ', $r->get_error_message(), "\\n"; }
}
echo 'DONE';
`;
}

// What a surfaces.json names to sync: post ids (`target.postId`) template slugs (`target.template`) and template part slugs (`target.templatePart`), in key order.
export function syncTargets( surfaces, only = null ) {
	const ids = [];
	const templates = [];
	const parts = [];
	for ( const [ key, e ] of Object.entries( surfaces ) ) {
		if ( only && ! only.includes( key ) ) {
			continue;
		}
		e?.target?.postId && ids.push( e.target.postId );
		e?.target?.template && templates.push( e.target.template );
		e?.target?.templatePart && parts.push( e.target.templatePart );
	}
	return { ids: [ ...new Set( ids ) ], templates: [ ...new Set( templates ) ], parts: [ ...new Set( parts ) ] };
}

// The plan from the two reads: { posts: { id: content }, templates: { slug: content }, parts: { slug: content }, areas: { slug:
// area }, same, notBuilt, problems }. A post missing on either side, or of another type on each, is a problem; a template or
// template part the mirror lacks is a problem when the target has a copy (the mirror is behind it) and is `notBuilt` when
// neither has one (its surface has not been built yet); the target's own copy is created when it lacks one; content with the
// same md5 is left alone.
export function planSync( from, to ) {
	const plan = { posts: {}, templates: {}, parts: {}, areas: {}, same: 0, notBuilt: [], problems: [] };
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
		if ( ! s && ! t ) {
			plan.notBuilt.push( slug );
		} else if ( ! s ) {
			plan.problems.push( `template ${ slug } has no copy on the mirror but has one on the target site (refresh the mirror from the target)` );
		} else if ( t && s.md5 === t.md5 ) {
			plan.same++;
		} else {
			plan.templates[ slug ] = s.content;
		}
	}
	for ( const [ slug, s ] of Object.entries( from.parts || {} ) ) {
		const t = to.parts?.[ slug ];
		if ( ! s && ! t ) {
			plan.notBuilt.push( `part ${ slug }` );
		} else if ( ! s ) {
			plan.problems.push( `template part ${ slug } has no copy on the mirror but has one on the target site (refresh the mirror from the target)` );
		} else if ( t && s.md5 === t.md5 ) {
			plan.same++;
		} else {
			plan.parts[ slug ] = s.content;
			plan.areas[ slug ] = s.area || 'uncategorized';
		}
	}
	return plan;
}

// After a write: the written posts, templates and parts (named as `post 5`, `template single`, `part header`) whose md5 on the
// target is not the mirror's, or which the target no longer has.
export function writtenMismatches( plan, mirror, target ) {
	const out = [];
	for ( const [ kind, group ] of [ [ 'post', 'posts' ], [ 'template', 'templates' ], [ 'part', 'parts' ] ] ) {
		for ( const key of Object.keys( plan[ group ] || {} ) ) {
			if ( ! target[ group ]?.[ key ] || target[ group ][ key ].md5 !== mirror[ group ]?.[ key ]?.md5 ) {
				out.push( `${ kind } ${ key }` );
			}
		}
	}
	return out;
}
