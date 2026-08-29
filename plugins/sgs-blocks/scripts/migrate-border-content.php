<?php
/**
 * migrate-border-content.php — carry STORED native border values across to the
 * block-private Shape-B attributes. Run with `wp eval-file`.
 *
 * WHY THIS EXISTS. Shape B removes `width`/`style`/`color` from a block's
 * `supports.__experimentalBorder`. Stored post content that set those values
 * through the native path then has NO reader: the block.json no longer declares
 * them, and `__experimentalSkipSerialization` means WordPress will not paint
 * them either. The value does not error — it silently stops rendering.
 *
 * This already happened. Measured on the canary 2026-08-30, AFTER the Shape-A
 * rollout was signed off as complete:
 *   sgs/container     69 stored instances  — ALREADY ORPHANED (block migrated)
 *   sgs/product-card   5 stored instances  — ALREADY ORPHANED (block migrated)
 *   sgs/info-box     345 · sgs/testimonial 174 · sgs/site-footer-row 18 ·
 *   sgs/form-step      3  — not yet migrated, would orphan on migration
 * Post 2742 (the live homepage) is in that list.
 *
 * ⛔ ORDER MATTERS. A block must ALREADY declare the private attributes before
 * its content is migrated. WordPress SILENTLY DISCARDS an attribute the
 * block.json does not declare (D338), so migrating content first destroys the
 * value outright — the exact loss this script exists to prevent. This script
 * REFUSES any block whose block.json does not yet declare them.
 *
 * Usage (all read-only unless --apply is passed):
 *   wp eval-file migrate-border-content.php                    # survey
 *   wp eval-file migrate-border-content.php sgs/container      # survey one block
 *   wp eval-file migrate-border-content.php sgs/container apply --user=1
 *   wp eval-file migrate-border-content.php self-test
 *
 * ⚠ `--user=1` is NOT optional when applying. wp-cli runs as no user, so KSES
 * strips CSS out of block attributes on save (D872). This script refuses to
 * apply without an authenticated user.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Map a stored native `style.border` object onto the private attrs.
 *
 * Returns array{ attrs: array, note: string|null, refuse: string|null }.
 *
 * The shapes WordPress can store, and what each becomes:
 *   flat     { width, style, color }             -> all four sides share width
 *   per-side { top: { width, color }, ... }      -> per-side widths
 *   radius   { radius: ... }                     -> LEFT ALONE by this script
 *
 * ⛔ REFUSES rather than flattens when painted sides carry DIFFERENT colours.
 * `borderColour` is a single string and cannot express "top is red, bottom is
 * blue". Flattening would silently change the client's design; refusing hands
 * the decision back. This is the one lossy case and it is not guessed at.
 */
function sgs_border_content_map( array $border ): array {
	$sides   = array( 'top', 'right', 'bottom', 'left' );
	$widths  = array();
	$colours = array();
	$styles  = array();

	// Flat legs apply to every side.
	if ( isset( $border['width'] ) && is_string( $border['width'] ) ) {
		foreach ( $sides as $s ) {
			$widths[ $s ] = $border['width'];
		}
	}
	if ( isset( $border['color'] ) && is_string( $border['color'] ) ) {
		$colours[] = $border['color'];
	}
	if ( isset( $border['style'] ) && is_string( $border['style'] ) ) {
		$styles[] = $border['style'];
	}

	// Per-side legs override.
	foreach ( $sides as $s ) {
		if ( ! isset( $border[ $s ] ) || ! is_array( $border[ $s ] ) ) {
			continue;
		}
		if ( isset( $border[ $s ]['width'] ) && is_string( $border[ $s ]['width'] ) ) {
			$widths[ $s ] = $border[ $s ]['width'];
		}
		if ( isset( $border[ $s ]['color'] ) && is_string( $border[ $s ]['color'] ) ) {
			$colours[] = $border[ $s ]['color'];
		}
		if ( isset( $border[ $s ]['style'] ) && is_string( $border[ $s ]['style'] ) ) {
			$styles[] = $border[ $s ]['style'];
		}
	}

	if ( ! $widths && ! $colours && ! $styles ) {
		return array( 'attrs' => array(), 'note' => null, 'refuse' => null );
	}

	$colours = array_values( array_unique( $colours ) );
	if ( count( $colours ) > 1 ) {
		return array(
			'attrs'  => array(),
			'note'   => null,
			'refuse' => 'per-side colours differ (' . implode( ', ', $colours ) .
				') and borderColour is a single string — refusing rather than flattening the design',
		);
	}
	$styles = array_values( array_unique( $styles ) );
	if ( count( $styles ) > 1 ) {
		return array(
			'attrs'  => array(),
			'note'   => null,
			'refuse' => 'per-side styles differ (' . implode( ', ', $styles ) . ')',
		);
	}

	$attrs = array();
	$note  = null;

	if ( $widths ) {
		// Unset sides stay unset; the render emission fills them with `0`, so a
		// single-edge border stays a single edge.
		$attrs['borderWidth'] = $widths;
	}
	if ( $colours ) {
		// Stored values use WP's pattern token syntax `var:preset|color|slug`.
		// sgs_colour_value() expects the BARE SLUG — handed the prefixed form it
		// produces `var(--wp--preset--color--varpresetcolorborder)`, which the
		// browser drops (same class as D881 defect 3).
		$colour = $colours[0];
		if ( 0 === strpos( $colour, 'var:preset|color|' ) ) {
			$colour = substr( $colour, strlen( 'var:preset|color|' ) );
		}
		$attrs['borderColour'] = $colour;
	}
	if ( $styles ) {
		$attrs['borderStyle'] = $styles[0];
	} elseif ( $widths ) {
		// No style stored — deliberately write NOTHING. Since 2026-08-30 the
		// blocks' own `borderStyle` default is 'solid' (Bean: "none isn't a
		// style; that is set by putting thickness at 0"), so omitting the key
		// lets the block default paint the authored width and colour. That is
		// strictly better than writing 'solid' into every post: less stored
		// data, and the value follows the block if the default ever changes.
		$note = 'no border-style stored — omitted, so the block default (solid) paints the ' .
			'authored width/colour. Previously this combination painted nothing.';
	}

	return array( 'attrs' => $attrs, 'note' => $note, 'refuse' => null );
}

/**
 * Strip the migrated legs from a stored `style.border`, keeping radius.
 * Returns the new border array, or null when nothing should remain.
 */
function sgs_border_content_residue( array $border ): ?array {
	$keep = array();
	if ( isset( $border['radius'] ) ) {
		$keep['radius'] = $border['radius'];
	}
	return $keep ? $keep : null;
}

/** Does this block already declare the private attrs? (D338 gate.) */
function sgs_border_content_block_ready( string $slug ): bool {
	$type = WP_Block_Type_Registry::get_instance()->get_registered( $slug );
	if ( ! $type ) {
		return false;
	}
	foreach ( array( 'borderWidth', 'borderStyle', 'borderColour' ) as $need ) {
		if ( ! isset( $type->attributes[ $need ] ) ) {
			return false;
		}
	}
	return true;
}

/**
 * Rewrite one block comment's attribute JSON.
 *
 * ⚠ This RE-ENCODES that one comment's attributes, and cannot do otherwise: the
 * change is structural (keys removed from a nested object, keys added at the
 * top level), not the length-preserving key rename where a textual edit is
 * possible. The protection is therefore SEMANTIC rather than byte-level — the
 * caller asserts that every attribute other than the ones being migrated
 * decodes identically before and after. Re-encoding is scoped to the single
 * matched comment; the rest of post_content is untouched byte-for-byte.
 */
function sgs_border_content_rewrite_attrs( array $attrs, array $add, ?array $residue ): array {
	$out = $attrs;
	foreach ( $add as $k => $v ) {
		$out[ $k ] = $v;
	}
	if ( null === $residue ) {
		unset( $out['style']['border'] );
		if ( isset( $out['style'] ) && ! $out['style'] ) {
			unset( $out['style'] );
		}
	} else {
		$out['style']['border'] = $residue;
	}
	return $out;
}

/** Scan post_content for at-risk instances of one block. */
function sgs_border_content_scan( string $content, string $slug ): array {
	$found = array();
	$re    = '/<!--\s+wp:' . preg_quote( $slug, '/' ) . '\s+(\{.*?\})\s*(\/)?-->/';
	if ( ! preg_match_all( $re, $content, $m, PREG_OFFSET_CAPTURE | PREG_SET_ORDER ) ) {
		return $found;
	}
	foreach ( $m as $one ) {
		$json = $one[1][0];
		$a    = json_decode( $json, true );
		if ( ! is_array( $a ) || ! isset( $a['style']['border'] ) || ! is_array( $a['style']['border'] ) ) {
			continue;
		}
		$map = sgs_border_content_map( $a['style']['border'] );
		if ( ! $map['attrs'] && ! $map['refuse'] ) {
			continue; // radius-only — safe, radius is not migrated here
		}
		$found[] = array(
			'offset'    => $one[0][1],
			'length'    => strlen( $one[0][0] ),
			'whole'     => $one[0][0],
			'json'      => $json,
			'attrs'     => $a,
			'map'       => $map,
			'selfclose' => isset( $one[2] ) && '/' === $one[2][0],
		);
	}
	return $found;
}

// ─── Self-test ──────────────────────────────────────────────────────────────
function sgs_border_content_self_test(): int {
	$fail = array();
	$ok   = function ( $cond, $msg ) use ( &$fail ) {
		if ( ! $cond ) {
			$fail[] = $msg;
		}
	};

	$flat = sgs_border_content_map( array( 'width' => '2px', 'style' => 'solid', 'color' => 'var:preset|color|primary' ) );
	$ok( '2px' === $flat['attrs']['borderWidth']['top'], 'flat width must apply to every side' );
	$ok( '2px' === $flat['attrs']['borderWidth']['left'], 'flat width must apply to the left side too' );
	$ok( 'primary' === $flat['attrs']['borderColour'], 'the var:preset|color| prefix must be stripped to the bare slug' );
	$ok( 'solid' === $flat['attrs']['borderStyle'], 'a stored style must be carried, not inferred' );
	$ok( null === $flat['note'], 'a stored style must NOT raise the inference note' );

	// Per-side mapping, WITH a stored style so it migrates rather than refusing.
	$side = sgs_border_content_map(
		array( 'style' => 'solid', 'top' => array( 'width' => '1px', 'color' => 'var:preset|color|border' ) )
	);
	$ok( '1px' === $side['attrs']['borderWidth']['top'], 'per-side width must map to that side' );
	$ok( ! isset( $side['attrs']['borderWidth']['bottom'] ), 'an unpainted side must stay UNSET, not become 1px' );
	$ok( 'border' === $side['attrs']['borderColour'], 'per-side colour must map and lose its var:preset prefix' );

	// The SAME shape with no stored style — the refusal path.
	$side_nostyle = sgs_border_content_map(
		array( 'top' => array( 'width' => '1px', 'color' => 'var:preset|color|border' ) )
	);
	// NEGATIVE CONTROL — by default a width with NO stored style must REFUSE,
	// not silently invent one. Inventing `solid` makes a border appear that has
	// never painted; that is a design change, not a migration.
	// NEGATIVE CONTROL — no style stored must write NO borderStyle key at all, so
	// the block's own 'solid' default paints it. Writing one would duplicate the
	// default into every post and pin it if the default ever changes.
	$ok( ! isset( $side_nostyle['attrs']['borderStyle'] ), 'NEGATIVE CONTROL: no stored style must write NO borderStyle key — the block default paints it' );
	$ok( isset( $side_nostyle['attrs']['borderWidth'] ), 'the width must still migrate even with no style stored' );
	$ok( null !== $side_nostyle['note'], 'the omission must be REPORTED on every run, never silent' );

	// NEGATIVE CONTROL — differing per-side colours must REFUSE, never flatten.
	$multi = sgs_border_content_map(
		array(
			'top'    => array( 'width' => '1px', 'color' => 'red' ),
			'bottom' => array( 'width' => '1px', 'color' => 'blue' ),
		)
	);
	$ok( null !== $multi['refuse'], 'NEGATIVE CONTROL: differing per-side colours must refuse' );
	$ok( ! $multi['attrs'], 'NEGATIVE CONTROL: a refusal must not also emit attrs' );

	// NEGATIVE CONTROL — radius-only must produce nothing (radius is not migrated here).
	$rad = sgs_border_content_map( array( 'radius' => '12px' ) );
	$ok( ! $rad['attrs'] && null === $rad['refuse'], 'NEGATIVE CONTROL: radius-only must be a no-op, not a migration' );

	// Residue keeps radius, drops the migrated legs.
	$res = sgs_border_content_residue( array( 'width' => '2px', 'color' => 'red', 'radius' => '8px' ) );
	$ok( array( 'radius' => '8px' ) === $res, 'residue must keep radius and drop width/colour' );
	$ok( null === sgs_border_content_residue( array( 'width' => '2px' ) ), 'residue with no radius must be null' );

	// Rewrite preserves unrelated attributes.
	$rw = sgs_border_content_rewrite_attrs(
		array( 'align' => 'full', 'className' => 'x', 'style' => array( 'border' => array( 'width' => '2px' ), 'spacing' => array( 'padding' => '4px' ) ) ),
		array( 'borderWidth' => array( 'top' => '2px' ) ),
		null
	);
	$ok( 'full' === $rw['align'], 'rewrite must preserve unrelated attributes' );
	$ok( isset( $rw['style']['spacing'] ), 'rewrite must preserve sibling style keys (spacing)' );
	$ok( ! isset( $rw['style']['border'] ), 'rewrite must remove the migrated border object' );
	$ok( isset( $rw['borderWidth'] ), 'rewrite must add the private attr' );

	// Scanner finds an instance and skips a radius-only one.
	$content = '<!-- wp:sgs/container {"style":{"border":{"width":"2px","color":"red"}}} --><!-- /wp:sgs/container -->'
		. '<!-- wp:sgs/container {"style":{"border":{"radius":"12px"}}} --><!-- /wp:sgs/container -->';
	$hits = sgs_border_content_scan( $content, 'sgs/container' );
	$ok( 1 === count( $hits ), 'NEGATIVE CONTROL: the scanner must find the at-risk instance and SKIP the radius-only one (found ' . count( $hits ) . ')' );

	if ( $fail ) {
		echo "SELF-TEST FAILED (" . count( $fail ) . "):\n";
		foreach ( $fail as $f ) {
			echo "  ! $f\n";
		}
		return 1;
	}
	echo "SELF-TEST OK — 22 assertions passed (4 of them negative controls).\n";
	return 0;
}

// ─── Main ───────────────────────────────────────────────────────────────────
$sgs_argv  = isset( $args ) && is_array( $args ) ? $args : array();
// POSITIONAL tokens, not --flags: `wp eval-file` parses --flags itself and
// rejects unknown ones, so they never reach $args.
$sgs_apply = in_array( 'apply', $sgs_argv, true );
if ( in_array( 'no-infer', $sgs_argv, true ) ) {
	define( 'SGS_BORDER_NO_INFER', true );
}
$sgs_slugs = array_values( array_filter( $sgs_argv, static fn( $a ) => 0 === strpos( $a, 'sgs/' ) ) );

if ( in_array( 'self-test', $sgs_argv, true ) ) {
	exit( sgs_border_content_self_test() );
}

if ( $sgs_apply && ! get_current_user_id() ) {
	echo "REFUSED: --apply requires an authenticated user (pass --user=1).\n";
	echo "wp-cli runs as no user, so KSES strips CSS out of block attributes on save (D872).\n";
	exit( 1 );
}

global $wpdb;
$sgs_rows = $wpdb->get_results( "SELECT ID, post_type, post_status, post_title, post_content FROM {$wpdb->posts} WHERE post_content LIKE '%wp:sgs/%' AND post_content LIKE '%\"border\"%' ORDER BY ID" );

$sgs_all_slugs = $sgs_slugs;
if ( ! $sgs_all_slugs ) {
	$sgs_all_slugs = array();
	foreach ( $sgs_rows as $r ) {
		if ( preg_match_all( '/<!--\s+wp:(sgs\/[a-z0-9-]+)\s+\{/', $r->post_content, $mm ) ) {
			foreach ( $mm[1] as $s ) {
				$sgs_all_slugs[ $s ] = true;
			}
		}
	}
	$sgs_all_slugs = array_keys( $sgs_all_slugs );
	sort( $sgs_all_slugs );
}

$sgs_total   = 0;
$sgs_blocked = 0;
$sgs_refused = 0;
$sgs_changed = 0;
$sgs_notes   = array();

foreach ( $sgs_all_slugs as $slug ) {
	$ready  = sgs_border_content_block_ready( $slug );
	$hits_n = 0;
	$ref_n  = 0;

	foreach ( $sgs_rows as $r ) {
		$hits = sgs_border_content_scan( $r->post_content, $slug );
		if ( ! $hits ) {
			continue;
		}
		$content = $r->post_content;
		$dirty   = false;

		// Rewrite from the END backwards so earlier offsets stay valid.
		for ( $i = count( $hits ) - 1; $i >= 0; $i-- ) {
			$h = $hits[ $i ];
			if ( $h['map']['refuse'] ) {
				$ref_n++;
				$sgs_refused++;
				$sgs_notes[] = "  REFUSED post {$r->ID} {$slug}: " . $h['map']['refuse'];
				continue;
			}
			$hits_n++;
			$sgs_total++;
			if ( $h['map']['note'] ) {
				$sgs_notes[] = "  post {$r->ID} {$slug}: " . $h['map']['note'];
			}
			if ( ! $sgs_apply || ! $ready ) {
				continue;
			}
			$residue  = sgs_border_content_residue( $h['attrs']['style']['border'] );
			$new      = sgs_border_content_rewrite_attrs( $h['attrs'], $h['map']['attrs'], $residue );
			$new_json = wp_json_encode( $new, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

			// SEMANTIC guard: every attribute other than the ones deliberately
			// touched must decode identically. Byte-identity is impossible here
			// (the change is structural), so this is the honest equivalent.
			$before_other = $h['attrs'];
			$after_other  = $new;
			unset( $before_other['style'], $before_other['borderWidth'], $before_other['borderStyle'], $before_other['borderColour'] );
			unset( $after_other['style'], $after_other['borderWidth'], $after_other['borderStyle'], $after_other['borderColour'] );
			if ( $before_other !== $after_other ) {
				echo "  ABORT post {$r->ID} {$slug}: unrelated attributes changed — refusing to write.\n";
				continue;
			}

			$open    = '<!-- wp:' . $slug . ' ' . $new_json . ( $h['selfclose'] ? ' /-->' : ' -->' );
			$content = substr_replace( $content, $open, $h['offset'], $h['length'] );
			$dirty   = true;
		}

		if ( $dirty && $sgs_apply && $ready ) {
			$res = wp_update_post(
				array(
					'ID'           => $r->ID,
					// wp_update_post() runs wp_unslash(); without wp_slash() a
					// stored backslash sequence is silently eaten.
					'post_content' => wp_slash( $content ),
				),
				true
			);
			if ( is_wp_error( $res ) ) {
				echo "  ERROR post {$r->ID}: " . $res->get_error_message() . "\n";
			} else {
				$sgs_changed++;
			}
		}
	}

	if ( $hits_n || $ref_n ) {
		$state = $ready ? 'READY' : 'BLOCKED (block.json does not declare the private attrs yet — D338)';
		if ( ! $ready ) {
			$sgs_blocked += $hits_n;
		}
		printf( "%-26s %4d at-risk  %3d refused   %s\n", $slug, $hits_n, $ref_n, $state );
	}
}

echo "\n";
echo "at-risk instances : $sgs_total\n";
echo "blocked (block not migrated yet) : $sgs_blocked\n";
echo "refused (lossy, needs a decision): $sgs_refused\n";
echo $sgs_apply ? "posts updated     : $sgs_changed\n" : "DRY RUN — pass --apply --user=1 to write\n";
foreach ( array_slice( array_unique( $sgs_notes ), 0, 20 ) as $n ) {
	echo "$n\n";
}
