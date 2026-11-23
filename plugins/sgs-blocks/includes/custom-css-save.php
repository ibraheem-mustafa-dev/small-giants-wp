<?php
/**
 * Custom CSS per block - who may write it and what a save by anyone else keeps (Spec 32 FR-32-30).
 *
 * Anyone who may edit the post may use the Custom CSS control: `sgs_custom_css_user_can()` asks
 * `current_user_can( <capability>, <post id> )`, where the capability is `edit_post` unless a site narrows it with
 * the `sgs_custom_css_capability` filter (return `edit_css` for WordPress's own rule, `edit_theme_options` for
 * administrators and shop managers). That is safe to offer widely because `Custom_Css_Scoper` confines every rule to its
 * own block instance, refuses what cannot be confined and refuses a `url()` that points outside the site.
 *
 * A save by a user who may not use it keeps each block's three attributes (`SGS_CUSTOM_CSS_ATTRS`) exactly as stored
 * and lets the rest of the save through. `wp_insert_post_data` is the one hook for every write path: the block editor's
 * REST save, `wp_update_post()` and WP-CLI all run `sanitize_post()` (so `content_save_pre`) inside `wp_insert_post()` and
 * reach this filter after it, with the post's ID, which is how the stored post is found.
 *
 * Blocks are matched by `sgsCustomCssId`, so a block moved within the post, or nested deeper, keeps its rule. A stored
 * rule with no id (hand-written content) and a block that lost its id are paired by block name plus the block's other
 * attributes, in document order (a block whose other attributes changed in the same save is not found this way: only the
 * editor writes the id back, so only a script that rebuilds blocks without it can lose a rule). An id the stored post does
 * not hold, or one repeated by more blocks than the stored post has rules for (a duplicate), keeps nothing: a new rule on a
 * block that had none is ignored.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Whether the current user may write Custom CSS on a post.
 *
 * @param int    $post_id   The post being saved or edited; 0 for one that does not exist yet.
 * @param string $post_type Its post type, used to find the create capability when there is no ID.
 * @return bool
 */
function sgs_custom_css_user_can( int $post_id = 0, string $post_type = 'post' ): bool {
	/**
	 * The capability that lets a user write Custom CSS on a post.
	 *
	 * @param string $capability `edit_post` by default: the user may edit this post.
	 * @param int    $post_id    The post, or 0 when it does not exist yet.
	 * @param string $post_type  The post type.
	 */
	$capability = apply_filters( 'sgs_custom_css_capability', 'edit_post', $post_id, $post_type );
	if ( ! is_string( $capability ) || '' === $capability ) {
		return false;
	}

	if ( $post_id > 0 ) {
		return current_user_can( $capability, $post_id );
	}
	if ( 'edit_post' === $capability ) {
		// A post that does not exist yet has no `edit_post` mapping; its type's create capability stands in.
		$type       = get_post_type_object( $post_type );
		$capability = ( is_object( $type ) && isset( $type->cap->edit_posts ) ) ? (string) $type->cap->edit_posts : 'edit_posts';
	}
	return current_user_can( $capability );
}

/**
 * The hosts whose absolute URLs a Custom CSS rule may name: the site's own.
 *
 * @return string[] Lower-case host names, no scheme or port.
 */
function sgs_custom_css_site_hosts(): array {
	static $hosts = null;
	if ( null === $hosts ) {
		$found = array();
		foreach ( array( home_url(), site_url() ) as $url ) {
			$host = wp_parse_url( $url, PHP_URL_HOST );
			if ( is_string( $host ) && '' !== $host ) {
				$found[] = strtolower( $host );
			}
		}
		/**
		 * Hosts a Custom CSS `url()` may point to besides the site's own (for instance an images CDN the site serves from).
		 *
		 * @param string[] $hosts Lower-case host names.
		 */
		$hosts = array_values( array_unique( array_map( 'strtolower', array_map( 'strval', (array) apply_filters( 'sgs_custom_css_site_hosts', $found ) ) ) ) );
	}
	return $hosts;
}

/**
 * The block comment delimiters of a post's content that open a block (or are void), with where their attributes sit.
 *
 * The pattern is the one WordPress's own `WP_Block_Parser` tokenises with, so both read the same delimiters; only the
 * delimiters are read, which keeps the rest of the content byte for byte as it was.
 *
 * @param string $content Unslashed post content.
 * @return array<int, array{start: int, length: int, name: string, attrs: array, json_start: int, json_length: int, insert_at: int}>
 */
function sgs_custom_css_block_tokens( string $content ): array {
	$pattern = '/<!--\s+(?P<closer>\/)?wp:(?P<namespace>[a-z][a-z0-9_-]*\/)?(?P<name>[a-z][a-z0-9_-]*)\s+(?P<attrs>{(?:(?:[^}]+|}+(?=})|(?!}\s+\/?-->).)*+)?}\s+)?(?P<void>\/)?-->/s';
	if ( ! preg_match_all( $pattern, $content, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE ) ) {
		return array();
	}

	$tokens = array();
	foreach ( $matches as $match ) {
		if ( isset( $match['closer'] ) && '' !== $match['closer'][0] ) {
			continue;
		}
		$start       = $match[0][1];
		$length      = strlen( $match[0][0] );
		$attrs       = array();
		$json_start  = -1;
		$json_length = 0;
		if ( isset( $match['attrs'] ) && '' !== $match['attrs'][0] ) {
			$json_start  = $match['attrs'][1];
			$json_length = strrpos( $match['attrs'][0], '}' ) + 1;
			$decoded     = json_decode( substr( $match['attrs'][0], 0, $json_length ), true );
			$attrs       = is_array( $decoded ) ? $decoded : array();
		}
		$tokens[] = array(
			'start'       => $start,
			'length'      => $length,
			'name'        => ( '' !== $match['namespace'][0] ? $match['namespace'][0] : 'core/' ) . $match['name'][0],
			'attrs'       => $attrs,
			'json_start'  => $json_start,
			'json_length' => $json_length,
			'insert_at'   => $start + $length - 3 - ( ( isset( $match['void'] ) && '' !== $match['void'][0] ) ? 1 : 0 ),
		);
	}
	return $tokens;
}

/**
 * The Custom CSS attributes a block's attribute array holds.
 *
 * @param array $attrs Block attributes.
 * @return array The entries for `SGS_CUSTOM_CSS_ATTRS` that are present.
 */
function sgs_custom_css_attrs_of( array $attrs ): array {
	return array_intersect_key( $attrs, array_flip( SGS_CUSTOM_CSS_ATTRS ) );
}

/**
 * Whether two sets of Custom CSS attributes are equal, whatever order their keys came in.
 *
 * @param array $a One set.
 * @param array $b The other.
 * @return bool
 */
function sgs_custom_css_same_attrs( array $a, array $b ): bool {
	ksort( $a );
	ksort( $b );
	return $a === $b;
}

/**
 * A block's identity apart from its Custom CSS: its name and every other attribute.
 *
 * @param string $name  Block name.
 * @param array  $attrs Block attributes.
 * @return string
 */
function sgs_custom_css_signature( string $name, array $attrs ): string {
	$rest = array_diff_key( $attrs, array_flip( SGS_CUSTOM_CSS_ATTRS ) );
	ksort( $rest );
	return $name . '|' . wp_json_encode( $rest );
}

/**
 * A usable instance key (the editor writes 8 hex characters; the scope class accepts `[a-z0-9]{4,16}`).
 *
 * @param mixed $key Value of `sgsCustomCssId`.
 * @return string The key, or '' when there is none.
 */
function sgs_custom_css_valid_key( $key ): string {
	return ( is_string( $key ) && 1 === preg_match( '/^[a-z0-9]{4,16}$/', $key ) ) ? $key : '';
}

/**
 * Give every block the Custom CSS the stored content holds for it, and nothing it was not given.
 *
 * @param string $content Unslashed content being saved.
 * @param string $stored  Unslashed content already stored.
 * @return string Content whose blocks carry exactly the stored Custom CSS attributes.
 */
function sgs_custom_css_restore_from_stored( string $content, string $stored ): string {
	if ( false === strpos( $content, 'sgsCustomCss' ) && false === strpos( $stored, 'sgsCustomCss' ) ) {
		return $content;
	}

	$entries = array();
	$by_id   = array();
	foreach ( sgs_custom_css_block_tokens( $stored ) as $token ) {
		$keep = sgs_custom_css_attrs_of( $token['attrs'] );
		if ( empty( $keep ) ) {
			continue;
		}
		$entries[] = array(
			'keep'      => $keep,
			'signature' => sgs_custom_css_signature( $token['name'], $token['attrs'] ),
			'claimed'   => false,
		);
		$key       = sgs_custom_css_valid_key( $token['attrs']['sgsCustomCssId'] ?? '' );
		if ( '' !== $key ) {
			$by_id[ $key ][] = count( $entries ) - 1;
		}
	}

	$incoming = sgs_custom_css_block_tokens( $content );
	$wanted   = array();
	$pending  = array();
	foreach ( $incoming as $index => $token ) {
		$key = sgs_custom_css_valid_key( $token['attrs']['sgsCustomCssId'] ?? '' );
		if ( '' === $key ) {
			$pending[] = $index;
			continue;
		}
		// Content written by the cloning route can repeat one key on several blocks, so a key holds a queue of stored rules:
		// a block takes the one equal to what it sent, else the next one not yet taken.
		$chosen = null;
		foreach ( $by_id[ $key ] ?? array() as $entry_index ) {
			if ( $entries[ $entry_index ]['claimed'] ) {
				continue;
			}
			$chosen = $chosen ?? $entry_index;
			if ( sgs_custom_css_same_attrs( sgs_custom_css_attrs_of( $token['attrs'] ), $entries[ $entry_index ]['keep'] ) ) {
				$chosen = $entry_index;
				break;
			}
		}
		if ( null !== $chosen ) {
			$entries[ $chosen ]['claimed'] = true;
			$wanted[ $index ]              = $entries[ $chosen ]['keep'];
		}
	}
	foreach ( $pending as $index ) {
		$signature = sgs_custom_css_signature( $incoming[ $index ]['name'], $incoming[ $index ]['attrs'] );
		foreach ( $entries as $entry_index => $entry ) {
			if ( ! $entry['claimed'] && $entry['signature'] === $signature ) {
				$entries[ $entry_index ]['claimed'] = true;
				$wanted[ $index ]                   = $entry['keep'];
				break;
			}
		}
	}

	$result = '';
	$was_at = 0;
	foreach ( $incoming as $index => $token ) {
		$have = sgs_custom_css_attrs_of( $token['attrs'] );
		$want = $wanted[ $index ] ?? array();
		if ( sgs_custom_css_same_attrs( $have, $want ) ) {
			continue;
		}
		$attrs = array_merge( array_diff_key( $token['attrs'], array_flip( SGS_CUSTOM_CSS_ATTRS ) ), $want );

		if ( $token['json_start'] >= 0 ) {
			// Replace the attribute JSON, or remove it and the space after it when no attribute is left.
			$offset      = $token['json_start'];
			$length      = $token['json_length'] + ( empty( $attrs ) ? 1 : 0 );
			$replacement = empty( $attrs ) ? '' : serialize_block_attributes( $attrs );
		} else {
			$offset      = $token['insert_at'];
			$length      = 0;
			$replacement = serialize_block_attributes( $attrs ) . ' ';
		}
		$result .= substr( $content, $was_at, $offset - $was_at ) . $replacement;
		$was_at  = $offset + $length;
	}

	return $result . substr( $content, $was_at );
}

/**
 * Keep the stored Custom CSS when a user who may not write it saves a post.
 *
 * @param array $data    Slashed post data about to be written.
 * @param array $postarr Sanitised post data as given to `wp_insert_post()`.
 * @return array
 */
function sgs_custom_css_keep_stored_on_save( $data, $postarr = array() ) {
	if ( ! is_array( $data ) ) {
		return $data;
	}
	$post_type = (string) ( $data['post_type'] ?? 'post' );
	$source_id = (int) ( $postarr['ID'] ?? 0 );
	if ( 0 === $source_id && 'revision' === $post_type ) {
		// A first autosave has no row yet; it descends from the post it autosaves.
		$source_id = (int) ( $data['post_parent'] ?? 0 );
	}
	if ( sgs_custom_css_user_can( $source_id, $post_type ) ) {
		return $data;
	}

	$stored = $source_id > 0 ? get_post( $source_id ) : null;
	foreach ( array( 'post_content', 'post_content_filtered' ) as $field ) {
		if ( ! isset( $data[ $field ] ) || ! is_string( $data[ $field ] ) ) {
			continue;
		}
		$was            = is_object( $stored ) ? (string) ( $stored->$field ?? '' ) : '';
		$data[ $field ] = addslashes( sgs_custom_css_restore_from_stored( stripslashes( $data[ $field ] ), $was ) );
	}
	return $data;
}
add_filter( 'wp_insert_post_data', __NAMESPACE__ . '\sgs_custom_css_keep_stored_on_save', 10, 2 );

/**
 * Tell the block editor whether the user may edit Custom CSS here, and which hosts a `url()` may name.
 *
 * @param array $settings Editor settings.
 * @param mixed $context  The `WP_Block_Editor_Context`.
 * @return array
 */
function sgs_custom_css_editor_settings( $settings, $context = null ) {
	$post                     = ( is_object( $context ) && isset( $context->post ) && is_object( $context->post ) ) ? $context->post : null;
	$settings['sgsCustomCssAccess'] = array(
		'canEdit'   => sgs_custom_css_user_can( $post ? (int) $post->ID : 0, $post ? (string) $post->post_type : 'wp_template' ),
		'siteHosts' => sgs_custom_css_site_hosts(),
	);
	return $settings;
}
add_filter( 'block_editor_settings_all', __NAMESPACE__ . '\sgs_custom_css_editor_settings', 10, 2 );
