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
 * The pattern is the one WordPress's own `WP_Block_Parser::next_token` tokenises with, and it is run the same way (one
 * token at a time from the end of the last), so both read the same delimiters; only the delimiters are read, which keeps
 * the rest of the content byte for byte as it was. When the pattern fails with an error part way through (a PCRE
 * backtrack limit on a crafted comment), the tokens read so far are returned and `$complete` is false: the rest of the
 * content cannot be read, so the caller must not trust it.
 *
 * @param string    $content  Unslashed post content.
 * @param bool|null $complete Set to false when a PCRE error stopped the read before the last delimiter.
 * @return array<int, array{start: int, length: int, name: string, attrs: array, json_start: int, json_length: int, insert_at: int}>
 */
function sgs_custom_css_block_tokens( string $content, ?bool &$complete = null ): array {
	$pattern = '/<!--\s+(?P<closer>\/)?wp:(?P<namespace>[a-z][a-z0-9_-]*\/)?(?P<name>[a-z][a-z0-9_-]*)\s+(?P<attrs>{(?:(?:[^}]+|}+(?=})|(?!}\s+\/?-->).)*+)?}\s+)?(?P<void>\/)?-->/s';
	$tokens   = array();
	$offset   = 0;
	$complete = true;
	while ( true ) {
		$found = preg_match( $pattern, $content, $match, PREG_OFFSET_CAPTURE, $offset );
		if ( 0 === $found ) {
			break;
		}
		if ( false === $found ) {
			$complete = false;
			break;
		}
		$offset = $match[0][1] + strlen( $match[0][0] );
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
 * The index just after the JSON string that starts at `$i`.
 *
 * @param string $json JSON text.
 * @param int    $i    Index of the opening quote.
 * @return int The index after the closing quote, or -1 when the string never ends.
 */
function sgs_custom_css_json_string_end( string $json, int $i ): int {
	$len = strlen( $json );
	for ( ++$i; $i < $len; $i++ ) {
		if ( '\\' === $json[ $i ] ) {
			++$i;
		} elseif ( '"' === $json[ $i ] ) {
			return $i + 1;
		}
	}
	return -1;
}

/**
 * The top-level members of a JSON object's text, with where each one sits, so one can be replaced without re-encoding the rest.
 *
 * @param string $json A JSON object's text, `{` to `}`.
 * @return array<int, array{start: int, end: int, key: string, value_start: int}>|null The members in order (`start` is the
 *         key's opening quote, `end` is just after the value), or null when the text is not a readable object.
 */
function sgs_custom_css_json_members( string $json ): ?array {
	$len     = strlen( $json );
	$last    = $len - 1;
	$members = array();
	if ( $len < 2 || '{' !== $json[0] || '}' !== $json[ $last ] ) {
		return null;
	}
	$ws = " \t\n\r";
	$i  = 1 + strspn( $json, $ws, 1 );
	if ( $i === $last ) {
		return $members;
	}
	while ( true ) {
		if ( '"' !== ( $json[ $i ] ?? '' ) ) {
			return null;
		}
		$key_start = $i;
		$i         = sgs_custom_css_json_string_end( $json, $i );
		$key       = $i < 0 ? null : json_decode( substr( $json, $key_start, $i - $key_start ) );
		if ( ! is_string( $key ) ) {
			return null;
		}
		$i += strspn( $json, $ws, $i );
		if ( ':' !== ( $json[ $i ] ?? '' ) ) {
			return null;
		}
		$i          += 1 + strspn( $json, $ws, $i + 1 );
		$value_start = $i;
		$first       = $json[ $i ] ?? '';
		if ( '"' === $first ) {
			$i = sgs_custom_css_json_string_end( $json, $i );
		} elseif ( '{' === $first || '[' === $first ) {
			$depth = 0;
			for ( ; $i < $len; $i++ ) {
				$c = $json[ $i ];
				if ( '"' === $c ) {
					$i = sgs_custom_css_json_string_end( $json, $i ) - 1;
					if ( $i < 0 ) {
						return null;
					}
				} elseif ( '{' === $c || '[' === $c ) {
					++$depth;
				} elseif ( '}' === $c || ']' === $c ) {
					--$depth;
					if ( 0 === $depth ) {
						++$i;
						break;
					}
				}
			}
		} else {
			$i += strcspn( $json, ", \t\n\r}", $i );
		}
		if ( $i < 0 || $i > $last || $i === $value_start ) {
			return null;
		}
		$members[] = array(
			'start'       => $key_start,
			'end'         => $i,
			'key'         => $key,
			'value_start' => $value_start,
		);
		$i += strspn( $json, $ws, $i );
		if ( ',' === ( $json[ $i ] ?? '' ) ) {
			$i += 1 + strspn( $json, $ws, $i + 1 );
			continue;
		}
		return $i === $last ? $members : null;
	}
}

/**
 * Rewrite a block's attribute JSON so its Custom CSS attributes are exactly `$want`, leaving every other byte as it was.
 *
 * A Custom CSS member already holding the wanted value is kept as written, one holding another value is replaced in place,
 * one not wanted is removed with its separator, and one wanted that the JSON lacks is added at the end.
 *
 * @param string $json A block's attribute JSON text, `{` to `}`.
 * @param array  $want The Custom CSS attributes the block must carry.
 * @return string|null The new JSON text, or null when no attribute is left. A text that cannot be read as an object holds no
 *         attributes (WordPress reads it as none), so it is replaced by `$want` alone.
 */
function sgs_custom_css_rewrite_attr_json( string $json, array $want ): ?string {
	$members = sgs_custom_css_json_members( $json );
	if ( null === $members ) {
		return empty( $want ) ? null : serialize_block_attributes( $want );
	}
	$names = array_flip( SGS_CUSTOM_CSS_ATTRS );
	$out   = array();
	$taken = array();
	$prev  = 1;
	foreach ( $members as $member ) {
		$before = substr( $json, $prev, $member['start'] - $prev );
		$prev   = $member['end'];
		$text   = substr( $json, $member['start'], $member['end'] - $member['start'] );
		if ( isset( $names[ $member['key'] ] ) ) {
			$key = $member['key'];
			if ( ! array_key_exists( $key, $want ) || isset( $taken[ $key ] ) ) {
				continue;
			}
			$taken[ $key ] = true;
			$value         = json_decode( substr( $json, $member['value_start'], $member['end'] - $member['value_start'] ), true );
			if ( $value !== $want[ $key ] ) {
				$text = substr( serialize_block_attributes( array( $key => $want[ $key ] ) ), 1, -1 );
			}
		}
		$out[] = array( $before, $text );
	}
	$lead  = $members ? substr( $json, 1, $members[0]['start'] - 1 ) : '';
	$tail  = $members ? substr( $json, $prev, strlen( $json ) - 1 - $prev ) : '';
	$added = array();
	foreach ( $want as $key => $value ) {
		if ( ! isset( $taken[ $key ] ) ) {
			$added[] = substr( serialize_block_attributes( array( $key => $value ) ), 1, -1 );
		}
	}
	if ( empty( $out ) && empty( $added ) ) {
		return null;
	}
	$body = '';
	foreach ( $out as $n => $pair ) {
		$body .= ( 0 === $n ? $lead : $pair[0] ) . $pair[1];
	}
	foreach ( $added as $text ) {
		$body .= ( '' === $body ? $lead : ',' ) . $text;
	}
	return '{' . $body . $tail . '}';
}

/**
 * Give every block the Custom CSS the stored content holds for it, and nothing it was not given.
 *
 * Content whose block delimiters cannot all be read (a PCRE error on a crafted comment) is not trusted: the write is
 * refused for this field and the stored content stays, so a user who may not write Custom CSS can neither add a rule nor
 * remove one through content the restore cannot see into.
 *
 * @param string $content Unslashed content being saved.
 * @param string $stored  Unslashed content already stored.
 * @return string Content whose blocks carry exactly the stored Custom CSS attributes.
 */
function sgs_custom_css_restore_from_stored( string $content, string $stored ): string {
	// A JSON unicode escape can spell the attribute name without the literal text (`sgs\u0043ustomCss`), so content
	// holding one is read too.
	if ( false === strpos( $content, 'sgsCustomCss' ) && false === strpos( $stored, 'sgsCustomCss' ) && false === strpos( $content, '\\u' ) ) {
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

	$incoming = sgs_custom_css_block_tokens( $content, $readable );
	if ( ! $readable ) {
		return $stored;
	}
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
		if ( $token['json_start'] >= 0 ) {
			// Change only the three Custom CSS members of the attribute JSON; remove it and the space after it when no
			// attribute is left.
			$offset      = $token['json_start'];
			$replacement = sgs_custom_css_rewrite_attr_json( substr( $content, $offset, $token['json_length'] ), $want );
			$length      = $token['json_length'] + ( null === $replacement ? 1 : 0 );
			$replacement = $replacement ?? '';
		} else {
			$offset      = $token['insert_at'];
			$length      = 0;
			$replacement = serialize_block_attributes( $want ) . ' ';
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
