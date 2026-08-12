<?php
/**
 * MorphSVG shape-pair expansion — Spec 38 §11.2, the D427 amendment.
 *
 * WHAT THIS CLOSES
 * `fx-morph.js` resolves a CSS SELECTOR (`data-sgs-fx-morph-target`) to a TO
 * shape, and requires the element carrying `data-sgs-fx="morph"` to ALREADY BE
 * a real shape (a `<path>`, or a tag MorphSVGPlugin can `convertToPath()`
 * itself) — see that file's own docblock, item 1. That is a perfectly good
 * RUNTIME contract and a completely unusable AUTHORING one: a tech-illiterate
 * client cannot draw two matched-topology SVG paths, and most SGS blocks
 * (a container, a button, a card…) are not shape elements at all. D427's
 * signed shape puts a PRESET layer above that contract instead of replacing
 * it:
 *
 *   client picks a shape-pair thumbnail  ->  `data-sgs-fx-shape="circle-square"`
 *   THIS FILE expands that to            ->  a VISIBLE <svg> carrying the FROM
 *                                             shape (the element `fx-morph.js`
 *                                             actually binds to — it moves the
 *                                             effect onto a real shape node so
 *                                             the animated element never has
 *                                             to be the block's own root),
 *                                             plus a genuinely hidden <svg>
 *                                             carrying the TO shape and the
 *                                             existing
 *                                             `data-sgs-fx-morph-target`
 *                                             selector
 *   the runtime sees                     ->  exactly what it already expected
 *                                             (a shape element with
 *                                             `data-sgs-fx="morph"` pointing
 *                                             at another shape element)
 *
 * `fx-morph.js` is therefore UNTOUCHED. This is what makes morph reachable on
 * ANY qualifying block, not only the three blocks whose own root happens to
 * render inline SVG geometry (`sgs/icon`, `sgs/responsive-logo`,
 * `sgs/separator`) — the render layer supplies the shape, the block supplies
 * only a place in the DOM to hang it.
 *
 * THE MULTIPLE-SVG RULE (edge case named in the build brief). A block may
 * already contain its own SVG (e.g. `sgs/icon`'s rendered glyph). This filter
 * NEVER searches a block's existing subtree for a shape to reuse — doing so
 * would make "which SVG morphs" depend on how many the block's own markup
 * happens to contain, which is not predictable from the outside. It always:
 *   1. Operates on the block's ROOT element only (same root-offset helper
 *      `fx-attributes.php` uses, so both files agree on where a composite's
 *      real root starts after any Spec-32 scoped `<style>` block).
 *   2. Appends exactly two NEW elements as siblings immediately after that
 *      root — never inside it, never touching whatever the block already
 *      rendered.
 *   3. Moves the fx data-attributes OFF the root and onto the new FROM-shape
 *      element, which is always identifiable by its own class
 *      (`sgs-fx-shape-visual`) — deterministic by construction, regardless of
 *      how many other `<svg>` elements the block's own content contains.
 * The block's own pre-existing content (e.g. an icon glyph) is left
 * completely alone; the new shape paints above it in normal DOM paint order,
 * which is the intended effect for a decorative shape flourish and matches
 * how the curated pairs are named (`logo-icon` reads as "the brand mark
 * becomes an icon", not "reshape whatever the block happened to draw").
 *
 * PRIORITY 11 — same slot as `fx-path-routes.php` (a sibling expansion, never
 * the same block instance). Must run AFTER `fx-attributes.php` (p10) injects
 * `data-sgs-fx-shape` onto dynamic blocks, and BEFORE `SGS_Motion_Registry`'s
 * p99 sniff, which decides whether MorphSVGPlugin is enqueued at all.
 *
 * SECURITY. A custom shape pair is TWO media-library attachment IDs, never
 * pasted markup (the `sgs/responsive-logo` `svgAnimationSource` precedent).
 * As with `fx-path-routes.php`, this file never inlines an uploaded file: it
 * extracts the first `<path>`'s `d` string, filters it to the SVG path-data
 * grammar's own character set, and emits it into markup this file builds.
 * Nothing an uploader controls reaches the page as markup.
 *
 * NOT SHARED WITH fx-path-routes.php ON PURPOSE. That file is being actively
 * fixed for a geometry defect in the same session this was built; duplicating
 * its two small sanitiser functions here (rather than calling them) means
 * this file has no coupling to that concurrent edit.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Curated shape-pair presets, read from the shared JSON both sides use.
 *
 * Shared with the editor's thumbnail picker (`src/blocks/extensions/fx.js`
 * imports the same file) rather than duplicated — a second copy of a shape
 * list is exactly the drift class Spec 38 Task 3 exists to close.
 *
 * @return array<string, array{label:string, description:string, from:array{d:string}, to:array{d:string}}>
 */
function sgs_fx_shape_pairs(): array {
	static $pairs = null;

	if ( null === $pairs ) {
		$pairs = array();
		$file  = SGS_BLOCKS_PATH . 'includes/fx-shape-routes.json';

		if ( \file_exists( $file ) ) {
			$data = \wp_json_file_decode( $file, array( 'associative' => true ) );
			if ( \is_array( $data ) && isset( $data['pairs'] ) && \is_array( $data['pairs'] ) ) {
				$pairs = $data['pairs'];
			}
		}
	}

	return $pairs;
}

/**
 * The `viewBox` every curated shape is authored in — see fx-shape-routes.json
 * `_geometry`.
 */
const FX_SHAPE_VIEWBOX = '0 0 100 100';

/**
 * Largest custom SVG this will open, in bytes. Same bound as
 * `fx-path-routes.php`'s `FX_PATH_ASSET_MAX_BYTES`, restated locally rather
 * than shared — see the file docblock's "NOT SHARED" note.
 */
const FX_SHAPE_ASSET_MAX_BYTES = 512000;

/**
 * Longest `d` string accepted, in characters. Same bound as
 * `fx-path-routes.php`'s `FX_PATH_D_MAX_LENGTH`.
 */
const FX_SHAPE_D_MAX_LENGTH = 20000;

/**
 * Reduce a candidate `d` string to the SVG path-data grammar's own alphabet.
 *
 * Whitelist, not blacklist — see `fx-path-routes.php`'s identical sanitiser
 * for the full rationale. Duplicated deliberately (file docblock's
 * "NOT SHARED" note), not imported.
 *
 * @param string $d Raw `d` value.
 * @return string Sanitised `d`, or '' when nothing usable remains.
 */
function sgs_fx_shape_sanitise_d( string $d ): string {
	$d = \preg_replace( '/[^MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]/', '', $d );
	$d = \trim( \preg_replace( '/\s+/', ' ', (string) $d ) );

	if ( '' === $d || \strlen( $d ) > FX_SHAPE_D_MAX_LENGTH ) {
		return '';
	}

	// Path data must open with a moveto, same as the motion-path grammar.
	if ( ! \preg_match( '/^[Mm]/', $d ) ) {
		return '';
	}

	return $d;
}

/**
 * Pull a shape out of a media-library SVG attachment.
 *
 * Returns the FIRST `<path>`'s `d` — the inspector's help text tells a client
 * the file must contain one shape line, same authoring contract as the
 * motion-path custom upload.
 *
 * @param int $attachment_id Media library attachment ID.
 * @return array{d:string} Empty `d` when unusable.
 */
function sgs_fx_shape_from_attachment( int $attachment_id ): array {
	static $cache = array();

	$empty = array( 'd' => '' );

	if ( $attachment_id <= 0 ) {
		return $empty;
	}

	if ( isset( $cache[ $attachment_id ] ) ) {
		return $cache[ $attachment_id ];
	}

	$cache[ $attachment_id ] = $empty;

	if ( 'image/svg+xml' !== \get_post_mime_type( $attachment_id ) ) {
		return $empty;
	}

	$file = \get_attached_file( $attachment_id );
	if ( ! $file || ! \file_exists( $file ) ) {
		return $empty;
	}

	if ( \filesize( $file ) > FX_SHAPE_ASSET_MAX_BYTES ) {
		return $empty;
	}

	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$markup = \file_get_contents( $file );
	if ( ! \is_string( $markup ) || '' === $markup ) {
		return $empty;
	}

	if ( ! \preg_match( '/<path\b[^>]*\bd\s*=\s*(["\'])(.*?)\1/is', $markup, $m ) ) {
		return $empty;
	}

	$d = sgs_fx_shape_sanitise_d( $m[2] );
	if ( '' === $d ) {
		return $empty;
	}

	$cache[ $attachment_id ] = array( 'd' => $d );

	return $cache[ $attachment_id ];
}

/**
 * Resolve the shape PAIR this block instance asked for.
 *
 * @param string $pair          `data-sgs-fx-shape` value — a preset key or `custom`.
 * @param int    $from_asset_id `data-sgs-fx-shape-asset-from` value (custom mode only).
 * @param int    $to_asset_id   `data-sgs-fx-shape-asset-to` value (custom mode only).
 * @return array{from:array{d:string}, to:array{d:string}} Empty `d`s when unresolvable.
 */
function sgs_fx_resolve_shape_pair( string $pair, int $from_asset_id, int $to_asset_id ): array {
	$empty = array(
		'from' => array( 'd' => '' ),
		'to'   => array( 'd' => '' ),
	);

	if ( '' === $pair ) {
		return $empty;
	}

	if ( 'custom' === $pair ) {
		$from = sgs_fx_shape_from_attachment( $from_asset_id );
		$to   = sgs_fx_shape_from_attachment( $to_asset_id );

		// A custom pair needs BOTH shapes — one matched-topology asset with no
		// partner is not a pair, and morphing a shape into itself (falling
		// back to only the FROM shape) would silently hide that the client
		// forgot the second upload rather than telling them.
		if ( '' === $from['d'] || '' === $to['d'] ) {
			return $empty;
		}

		return array(
			'from' => $from,
			'to'   => $to,
		);
	}

	$pairs = sgs_fx_shape_pairs();
	if ( ! isset( $pairs[ $pair ]['from']['d'], $pairs[ $pair ]['to']['d'] ) ) {
		return $empty;
	}

	$from_d = sgs_fx_shape_sanitise_d( (string) $pairs[ $pair ]['from']['d'] );
	$to_d   = sgs_fx_shape_sanitise_d( (string) $pairs[ $pair ]['to']['d'] );

	if ( '' === $from_d || '' === $to_d ) {
		return $empty;
	}

	return array(
		'from' => array( 'd' => $from_d ),
		'to'   => array( 'd' => $to_d ),
	);
}

/**
 * Expand a chosen shape pair into the FROM (visible) + TO (hidden) `<svg>`
 * pair the runtime resolves against.
 *
 * Takes only `$block_content`, deliberately — see `fx-path-routes.php` for
 * why this is what lets one filter cover both static and dynamic blocks: by
 * the time this runs, a static block's baked-in attribute and a dynamic
 * block's p10-injected one are the same string in the same place.
 *
 * @param string $block_content The rendered block HTML.
 * @return string Block HTML, with the shape-pair SVGs appended when one was chosen.
 */
function sgs_expand_fx_shape_pair( string $block_content ): string {
	if ( '' === $block_content || false === \strpos( $block_content, 'data-sgs-fx-shape' ) ) {
		return $block_content;
	}

	// Already expanded — never resolve twice, or two FROM shapes would exist
	// for one selector.
	if ( false !== \strpos( $block_content, 'sgs-fx-shape-visual' ) ) {
		return $block_content;
	}

	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	$shape_pair = $processor->get_attribute( 'data-sgs-fx-shape' );
	if ( ! \is_string( $shape_pair ) || '' === $shape_pair ) {
		return $block_content;
	}
	$shape_pair = \sanitize_key( $shape_pair );

	$from_asset_id = (int) $processor->get_attribute( 'data-sgs-fx-shape-asset-from' );
	$to_asset_id   = (int) $processor->get_attribute( 'data-sgs-fx-shape-asset-to' );

	$resolved = sgs_fx_resolve_shape_pair( $shape_pair, $from_asset_id, $to_asset_id );
	if ( '' === $resolved['from']['d'] || '' === $resolved['to']['d'] ) {
		/*
		 * Unresolvable pair — emit NOTHING and leave the block exactly as
		 * server-rendered, with its fx attributes still on the root.
		 * `fx-morph.js` would then find `data-sgs-fx="morph"` on an element
		 * with no usable shape geometry and `console.warn` once — the
		 * documented, fail-safe "not configured yet" path, never a broken
		 * page. The editor is where this is surfaced to the client before it
		 * can happen (the panel disables its dependent controls until a pair
		 * resolves).
		 */
		return $block_content;
	}

	// These are the fx params `fx.js` / `fx-attributes.php` already put on the
	// root via the shared `FX_ATTR_MAP` channel. They belong on the NEW
	// FROM-shape element now — a shape node is what `fx-morph.js` requires —
	// so they are read here and then stripped off the root below.
	$trigger  = (string) $processor->get_attribute( 'data-sgs-fx-trigger' );
	$duration = (string) $processor->get_attribute( 'data-sgs-fx-duration' );
	$ease     = (string) $processor->get_attribute( 'data-sgs-fx-ease' );

	foreach ( array(
		'data-sgs-fx',
		'data-sgs-fx-shape',
		'data-sgs-fx-shape-asset-from',
		'data-sgs-fx-shape-asset-to',
		'data-sgs-fx-trigger',
		'data-sgs-fx-duration',
		'data-sgs-fx-ease',
	) as $stale_attr ) {
		$processor->remove_attribute( $stale_attr );
	}

	$target_id = \wp_unique_id( 'sgs-fx-shape-' );

	/*
	 * ANCHOR POSITIONING (D442 follow-up, 2026-08-12) — the same fix as
	 * `fx-path-routes.php`'s route SVG, applied here. Both the visible FROM
	 * shape and the hidden TO shape were sized via `position:absolute;
	 * inset:0` against their DOM PARENT, never against the decorated
	 * block's own box — see this file's docblock's "NOT SHARED" note for why
	 * the fix is duplicated rather than imported. `sgs_scope_class_for_root()`
	 * reuses a uid class another injector already minted on this root this
	 * render (hover-effects / parallax / image-controls) or mints a fresh
	 * one, so the anchor name is unique per block instance.
	 */
	$root_tag_html = sgs_extract_root_opening_tag( $rest );
	$scope_class   = sgs_scope_class_for_root( $root_tag_html, 'sgs-fxshape' );
	$anchor_name   = '--sgs-fx-anchor-' . $scope_class;
	$target_class  = 'sgs-fx-anchor-target-' . \substr( \md5( $scope_class ), 0, 8 );

	if ( ! \preg_match( '/(?:^|\s)' . \preg_quote( $scope_class, '/' ) . '(?:\s|$)/', (string) $processor->get_attribute( 'class' ) ) ) {
		$existing_class = (string) $processor->get_attribute( 'class' );
		$processor->set_attribute( 'class', \trim( $existing_class . ' ' . $scope_class ) );
	}

	$visual_attrs = ' data-sgs-fx="morph" data-sgs-fx-morph-target="#' . \esc_attr( $target_id ) . '"';
	if ( '' !== $trigger ) {
		$visual_attrs .= ' data-sgs-fx-trigger="' . \esc_attr( $trigger ) . '"';
	}
	if ( '' !== $duration ) {
		$visual_attrs .= ' data-sgs-fx-duration="' . \esc_attr( $duration ) . '"';
	}
	if ( '' !== $ease ) {
		$visual_attrs .= ' data-sgs-fx-ease="' . \esc_attr( $ease ) . '"';
	}

	/*
	 * D452 — the fx attributes go on the inner <path>, NOT the <svg> wrapper.
	 *
	 * `fx-morph.js`'s contract (see its docblock, "The element carrying
	 * `data-sgs-fx="morph"` IS THE FROM SHAPE") requires a real shape node.
	 * MorphSVGPlugin refuses an <svg> container outright — it logs
	 * `Cannot morph a <SVG> element` and tweens nothing. Emitting these
	 * attributes on the wrapper meant morph had NEVER animated on any block,
	 * including the original three SVG-shape blocks; the 2026-08-01 relaxation
	 * from 3 to 28 eligible blocks simply widened a capability that did not
	 * work. Measured live: the `d` attribute was unchanged across 148
	 * animation-frame samples over 1.6s, past the 0.8s default duration.
	 *
	 * Safe to move: the CSS keys on the CLASS (`.sgs-fx-shape-visual`,
	 * `.sgs-fx-shape-visual path`), never on these data attributes, and the
	 * idempotency check at the top of this function greps for the class too.
	 * The morph TARGET was always correct — `$target_svg` below points at a
	 * `<path id="…">`, which is why only the source end was broken.
	 */
	$visual_svg = \sprintf(
		'<svg class="sgs-fx-shape-visual %s" viewBox="%s" aria-hidden="true" focusable="false"><path%s d="%s"></path></svg>',
		\esc_attr( $target_class ),
		\esc_attr( FX_SHAPE_VIEWBOX ),
		$visual_attrs,
		\esc_attr( $resolved['from']['d'] )
	);

	$target_svg = \sprintf(
		'<svg class="sgs-fx-shape-target %s" aria-hidden="true" focusable="false" viewBox="%s"><path id="%s" d="%s"></path></svg>',
		\esc_attr( $target_class ),
		\esc_attr( FX_SHAPE_VIEWBOX ),
		\esc_attr( $target_id ),
		\esc_attr( $resolved['to']['d'] )
	);

	$content = $head . $processor->get_updated_html() . $visual_svg . $target_svg;

	// Per-instance anchor VALUES via the shared no-inline mechanism (Spec 32
	// FR-32-11) — see fx-path-routes.php's identical comment for the full
	// rationale. Both the visual and target SVGs share ONE position-anchor
	// value (they both anchor to the same block box), so one target class
	// covers both elements.
	$content = sgs_append_scoped_var_style( $content, $scope_class, array( 'anchor-name:' . $anchor_name ) );
	$content = sgs_append_scoped_var_style( $content, $target_class, array( 'position-anchor:' . $anchor_name ) );

	/*
	 * Appended AFTER the block's root element, as siblings — never wrapped
	 * around it and never inserted inside it, for the same reason
	 * `fx-path-routes.php` appends rather than wraps: inserting into the
	 * block's own grid/flex relationship with its parent would change the
	 * layout of a page that only asked for an effect. The visible shape is
	 * positioned to cover the block's own box via CSS Anchor Positioning
	 * (`assets/css/fx-shape-routes.css`) — see that file for the mechanism
	 * and the `@supports` fallback for browsers without it.
	 */
	return $content;
}
\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_expand_fx_shape_pair', 11, 1 );
