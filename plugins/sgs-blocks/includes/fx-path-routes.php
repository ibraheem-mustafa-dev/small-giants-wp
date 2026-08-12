<?php
/**
 * Motion-path route expansion — Spec 38 §11.2, the D427 amendment.
 *
 * WHAT THIS CLOSES
 * `fx-motion-path.js` resolves a CSS SELECTOR (`data-sgs-fx-motion-path-target`)
 * to an element and reads its geometry. That is a perfectly good RUNTIME
 * contract and a completely unusable AUTHORING one — a tech-illiterate client
 * cannot type a CSS selector, and there was no element for it to point at even
 * if they could. D427's signed shape puts a PRESET layer above that contract
 * instead of replacing it:
 *
 *   client picks a route thumbnail  ->  `data-sgs-fx-path="arc"`
 *   THIS FILE expands that to       ->  a hidden <svg> carrying the path,
 *                                       plus the existing
 *                                       `data-sgs-fx-motion-path-target="#id"`
 *   the runtime sees                ->  exactly what it already expected
 *
 * `fx-motion-path.js` is therefore UNTOUCHED, and the two `-target` attributes
 * are render-layer OUTPUT rather than an authoring surface — a draft never
 * hand-writes them, and the cloning contract maps `-path`, never the resolved
 * selector.
 *
 * ONE FILTER COVERS BOTH BLOCK KINDS. `render_block` runs for static blocks
 * (whose `data-sgs-fx-path` was baked in at save time by `fx.js`) and dynamic
 * blocks (whose attributes `fx-attributes.php` injected at p10) alike, and by
 * this point both look identical — a rendered root element carrying the
 * attribute. Expanding here rather than in each path is what stops the effect
 * working on some blocks and silently not on others.
 *
 * PRIORITY 11 IS LOAD-BEARING. It must run AFTER `fx-attributes.php` (p10)
 * injects `data-sgs-fx-path` onto dynamic blocks — expanding first would find
 * nothing to expand — and BEFORE `SGS_Motion_Registry`'s p99 sniff, which is
 * what decides whether the motion-path module is enqueued at all.
 *
 * SECURITY. A custom route is a MEDIA LIBRARY attachment ID, never pasted
 * markup (the `sgs/responsive-logo` `svgAnimationSource` precedent). Even then
 * this file never inlines the uploaded file: it extracts the first `<path>`'s
 * `d` string and the source `viewBox`, filters both to their own grammars'
 * character sets, and emits them into markup THIS file builds. Nothing an
 * uploader controls reaches the page as markup — only as a geometry string
 * that has been through a whitelist.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Curated route presets, read from the shared JSON both sides use.
 *
 * Shared with the editor's thumbnail picker (`src/blocks/extensions/fx.js`
 * imports the same file) rather than duplicated, because a second copy of a
 * motion list is exactly the drift class Spec 38 Task 3 exists to close.
 *
 * @return array<string, array{label:string, description:string, d:string}>
 */
function sgs_fx_path_routes(): array {
	static $routes = null;

	if ( null === $routes ) {
		$routes = array();
		$file   = SGS_BLOCKS_PATH . 'includes/fx-path-routes.json';

		if ( \file_exists( $file ) ) {
			$data = \wp_json_file_decode( $file, array( 'associative' => true ) );
			if ( \is_array( $data ) && isset( $data['routes'] ) && \is_array( $data['routes'] ) ) {
				$routes = $data['routes'];
			}
		}
	}

	return $routes;
}

/**
 * The `viewBox` every curated route is authored in.
 *
 * Stated as a constant rather than read per-route because the routes file's
 * own `_geometry` note makes it a contract of that file: all four are drawn in
 * the same box so they can be swapped without the traveller jumping.
 */
const FX_PATH_ROUTE_VIEWBOX = '0 0 100 100';

/**
 * Largest custom SVG this will open, in bytes.
 *
 * A route is a handful of curve commands. Anything approaching half a megabyte
 * is a full illustration that happens to contain a path, and reading it on
 * every render to pull one `d` out is a cost with no matching benefit.
 */
const FX_PATH_ASSET_MAX_BYTES = 512000;

/**
 * Longest `d` string accepted, in characters.
 *
 * A route the client can meaningfully perceive is tens of commands. A
 * 100,000-character traced outline would be accepted by the character filter
 * below and then hand MotionPathPlugin a per-frame cost nobody asked for.
 */
const FX_PATH_D_MAX_LENGTH = 20000;

/**
 * Reduce a candidate `d` string to the SVG path-data grammar's own alphabet.
 *
 * Whitelist, not blacklist: everything outside the path-data character set is
 * removed rather than escaped, so there is no construction — quote, angle
 * bracket, entity or otherwise — that can survive into the attribute.
 *
 * @param string $d Raw `d` value.
 * @return string Sanitised `d`, or '' when nothing usable remains.
 */
function sgs_fx_sanitise_path_d( string $d ): string {
	$d = \preg_replace( '/[^MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]/', '', $d );
	$d = \trim( \preg_replace( '/\s+/', ' ', (string) $d ) );

	if ( '' === $d || \strlen( $d ) > FX_PATH_D_MAX_LENGTH ) {
		return '';
	}

	// Path data must open with a moveto. Anything else is not a path, and
	// MotionPathPlugin would produce either nothing or nonsense from it.
	if ( ! \preg_match( '/^[Mm]/', $d ) ) {
		return '';
	}

	return $d;
}

/**
 * Validate a `viewBox` value: exactly four numbers, nothing else.
 *
 * @param string $view_box Raw viewBox value.
 * @return string The value when valid, '' otherwise.
 */
function sgs_fx_sanitise_view_box( string $view_box ): string {
	$view_box = \trim( \preg_replace( '/[,\s]+/', ' ', $view_box ) );

	if ( ! \preg_match( '/^-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+$/', $view_box ) ) {
		return '';
	}

	return $view_box;
}

/**
 * Pull a route out of a media-library SVG attachment.
 *
 * Returns the FIRST `<path>`'s `d` — deliberately, and it is the reason the
 * inspector's help text tells a client the file must contain one line. A
 * multi-path SVG has no single travel route, so guessing which of its paths
 * the client meant would be a guess presented as a feature; taking the first
 * and saying so is honest and predictable.
 *
 * @param int $attachment_id Media library attachment ID.
 * @return array{d:string, view_box:string} Empty `d` when unusable.
 */
function sgs_fx_path_from_attachment( int $attachment_id ): array {
	static $cache = array();

	$empty = array(
		'd'        => '',
		'view_box' => '',
	);

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

	if ( \filesize( $file ) > FX_PATH_ASSET_MAX_BYTES ) {
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

	$d = sgs_fx_sanitise_path_d( $m[2] );
	if ( '' === $d ) {
		return $empty;
	}

	$view_box = '';
	if ( \preg_match( '/<svg\b[^>]*\bviewBox\s*=\s*(["\'])(.*?)\1/is', $markup, $vb ) ) {
		$view_box = sgs_fx_sanitise_view_box( $vb[2] );
	}

	$cache[ $attachment_id ] = array(
		'd'        => $d,
		'view_box' => $view_box,
	);

	return $cache[ $attachment_id ];
}

/**
 * Resolve the route this block instance asked for.
 *
 * @param string $route         `data-sgs-fx-path` value — a preset key or `custom`.
 * @param int    $attachment_id `data-sgs-fx-path-asset` value.
 * @return array{d:string, view_box:string} Empty `d` when the route is unresolvable.
 */
function sgs_fx_resolve_route( string $route, int $attachment_id ): array {
	$empty = array(
		'd'        => '',
		'view_box' => '',
	);

	if ( '' === $route ) {
		return $empty;
	}

	if ( 'custom' === $route ) {
		$asset = sgs_fx_path_from_attachment( $attachment_id );

		// A custom SVG's own viewBox is what its coordinates mean; without one
		// the coordinates are in the default user space, which for a hand-drawn
		// route is almost always the 0..100-ish range the presets use anyway.
		if ( '' !== $asset['d'] && '' === $asset['view_box'] ) {
			$asset['view_box'] = FX_PATH_ROUTE_VIEWBOX;
		}

		return $asset;
	}

	$routes = sgs_fx_path_routes();
	if ( ! isset( $routes[ $route ]['d'] ) ) {
		return $empty;
	}

	$d = sgs_fx_sanitise_path_d( (string) $routes[ $route ]['d'] );
	if ( '' === $d ) {
		return $empty;
	}

	return array(
		'd'        => $d,
		'view_box' => FX_PATH_ROUTE_VIEWBOX,
	);
}

/**
 * Expand a chosen route into the hidden `<svg>` the runtime resolves against.
 *
 * Takes only `$block_content` — deliberately. Unlike `fx-attributes.php`, which
 * reads parsed ATTRIBUTES to decide what to inject, this filter works purely
 * from the rendered markup, and that is what makes one filter cover both block
 * kinds: by this point a static block's baked-in attribute and a dynamic
 * block's p10-injected one are the same string in the same place.
 *
 * @param string $block_content The rendered block HTML.
 * @return string Block HTML, with the route SVG appended when one was chosen.
 */
function sgs_expand_fx_path_route( string $block_content ): string {
	if ( '' === $block_content || false === \strpos( $block_content, 'data-sgs-fx-path' ) ) {
		return $block_content;
	}

	// Already expanded (an inner block re-rendered through the filter, or a
	// draft that hand-wrote the target). Never resolve twice — a second hidden
	// SVG would leave two candidates for one selector.
	if ( false !== \strpos( $block_content, 'data-sgs-fx-motion-path-target' ) ) {
		return $block_content;
	}

	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	$route = $processor->get_attribute( 'data-sgs-fx-path' );
	if ( ! \is_string( $route ) || '' === $route ) {
		return $block_content;
	}
	$route = \sanitize_key( $route );

	$asset_id = (int) $processor->get_attribute( 'data-sgs-fx-path-asset' );

	$resolved = sgs_fx_resolve_route( $route, $asset_id );
	if ( '' === $resolved['d'] ) {
		/*
		 * Unresolvable route — emit NOTHING and leave the traveller exactly as
		 * server-rendered. `fx-motion-path.js` already fails safe on an absent
		 * target, so the block renders at its authored position rather than
		 * half-travelled. The editor is where this is surfaced to the client
		 * (the panel warns before it can happen); a visitor must never see a
		 * console warning's worth of half-applied motion.
		 */
		return $block_content;
	}

	$id = \wp_unique_id( 'sgs-fx-path-' );

	$processor->set_attribute( 'data-sgs-fx-motion-path-target', '#' . $id );

	/*
	 * ANCHOR POSITIONING (D442 follow-up, 2026-08-12) — closes the
	 * oversized-route-box defect this file's docblock has carried as
	 * "known-open" since D442. The route SVG was sized via
	 * `position:absolute; inset:0` against its DOM PARENT (whatever the
	 * block happens to sit inside — `.entry-content`, a container's shared
	 * child area…), never against the travelling block's OWN box. CSS
	 * Anchor Positioning lets the SVG size itself against the block's box
	 * directly, with no DOM-ancestry requirement (the SVG does not need to
	 * be a descendant of the block it anchors to — it already isn't, it's
	 * appended as a sibling below).
	 *
	 * `sgs_scope_class_for_root()` (helpers-scoped-instance-vars.php) is the
	 * existing reuse-or-mint mechanism: if another injector already gave
	 * this root a `sgs-<slug>-<8hex>` uid class this render (hover-effects /
	 * parallax / image-controls), it's reused rather than minting a second
	 * one. The anchor name is derived from that class, so it is unique PER
	 * BLOCK INSTANCE — two travelling blocks on the same page never collide.
	 */
	$root_tag_html = sgs_extract_root_opening_tag( $rest );
	$scope_class   = sgs_scope_class_for_root( $root_tag_html, 'sgs-fxpath' );
	$anchor_name   = '--sgs-fx-anchor-' . $scope_class;
	$target_class  = 'sgs-fx-anchor-target-' . \substr( \md5( $scope_class ), 0, 8 );

	if ( ! \preg_match( '/(?:^|\s)' . \preg_quote( $scope_class, '/' ) . '(?:\s|$)/', (string) $processor->get_attribute( 'class' ) ) ) {
		$existing_class = (string) $processor->get_attribute( 'class' );
		$processor->set_attribute( 'class', \trim( $existing_class . ' ' . $scope_class ) );
	}

	$svg = \sprintf(
		// preserveAspectRatio="none" REMOVED 2026-08-01 (D442). It stretched the route's
		// authored viewBox independently on each axis, so the traveller inherited a skewed,
		// non-uniform scale — measured live as transform matrix coefficients a=0.0937 / d=0.0937
		// against b=-0.9956 / c=0.9956 on the canary. Omitting the attribute restores the SVG
		// default (xMidYMid meet): uniform scale, no skew.
		'<svg class="sgs-fx-path-route %s" aria-hidden="true" focusable="false" viewBox="%s"><path id="%s" d="%s"></path></svg>',
		\esc_attr( $target_class ),
		\esc_attr( $resolved['view_box'] ),
		\esc_attr( $id ),
		\esc_attr( $resolved['d'] )
	);

	$content = $head . $processor->get_updated_html() . $svg;

	// The anchor-name/position-anchor VALUES are per-instance (the whole
	// point — see above), so they cannot live in the static stylesheet.
	// Sized via the shared no-inline mechanism (Spec 32 FR-32-11): a scoped
	// `<style>` tag, never an inline `style=""` attribute. The generic
	// `top:anchor(top)` / `width:anchor-size(width)` rules (identical across
	// every instance) stay in assets/css/fx-motion-path.css, gated behind
	// `@supports (anchor-name: …)` with a hide-cleanly fallback for browsers
	// without support.
	$content = sgs_append_scoped_var_style( $content, $scope_class, array( 'anchor-name:' . $anchor_name ) );
	$content = sgs_append_scoped_var_style( $content, $target_class, array( 'position-anchor:' . $anchor_name ) );

	/*
	 * Appended AFTER the block's root element, as a sibling — never wrapped
	 * around it. Wrapping would insert an element into whatever grid or flex
	 * relationship the block already has with its parent, changing the layout
	 * of a page that only asked for an effect. As a sibling the SVG is
	 * absolutely positioned out of flow (assets/css/fx-motion-path.css) and
	 * costs the layout nothing.
	 */
	return $content;
}
\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_expand_fx_path_route', 11, 1 );
