<?php
/**
 * Per-device-tier MEDIA rendering (image / video / SVG) — shared helper.
 *
 * Spec 35 Part D5 ("Per-device MEDIA SOURCE (art direction)") already fixes the
 * attribute shape `{base}` / `{base}Tablet` / `{base}Mobile`, the 768/1024 device
 * standard, the fall-back-UP rule, and the "alt text is NOT tiered" rule. What it
 * does NOT cover — and what this helper adds — is a per-tier media TYPE: a block
 * may be an image on desktop, a video on tablet and an inline SVG on mobile.
 *
 * ⛔ WHY SIBLING MARKUP FOR VIDEO HERE, when Spec 35 D5 says video tiers use a
 *    RUNTIME SWAP on a single <video> (the `data-src-desktop/-tablet/-mobile`
 *    contract). That contract assumes every tier is the SAME element type, so one
 *    node can serve them all by swapping its `src`. Once a tier may be an <img>
 *    and another a <video>, no single node can represent both — the element type
 *    itself differs per tier, so sibling markup is the only shape that works.
 *    D5's concern with siblings was real (three <video>s each begin fetching), so
 *    it is addressed directly instead of ignored: every non-base video tier is
 *    emitted `preload="none"`, and a `display:none` video neither autoplays nor
 *    fetches. A block whose tiers are ALL video should keep using the runtime-swap
 *    contract; this helper is for the mixed-type case.
 *
 * ⛔ CALLER CONTRACT — the returned `css` MUST be appended to the block's
 *    responsive-CSS string BEFORE that string is printed. Spec 35 D5 records this
 *    exact failure on `sgs/image-sequence`: tier CSS appended next to the element
 *    emit compiles cleanly and emits nothing.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Require it HERE, not just via render-helpers.php, because a render.php may
// require_once this file directly without ever loading render-helpers.php —
// sgs_allowed_svg_tags() now delegates to sgs_svg_kses_allowed_tags() and would
// fatal on an undefined function without this line.
require_once __DIR__ . '/helpers-svg-kses.php';

if ( ! function_exists( 'sgs_allowed_svg_tags' ) ) {
	/**
	 * The SGS inline-SVG allow-list for `wp_kses()`.
	 *
	 * Security non-negotiable: inline SVG is never echoed raw. This is the single
	 * definition of what an operator-supplied SVG may contain.
	 *
	 * ⭐ UNIFIED 2026-08-30. This is now an ALIAS for
	 * `sgs_svg_kses_allowed_tags()`. There is ONE list.
	 *
	 * Six SVG allowlists existed in SGS code. Two were byte-identical copies of
	 * this one (media/render.php, class-sgs-container-wrapper.php) and were
	 * collapsed onto it. This function and `sgs_svg_kses_allowed_tags()` were
	 * the two REAL lists and they diverged in BOTH directions — 13 tags vs 36,
	 * with `<style>`/`<animate>` unique to this one.
	 *
	 * The merge, and what it changes for this function's callers (hero,
	 * timeline, sgs/media, every container background):
	 *
	 *  GAINED — 25 tags, including linearGradient/radialGradient/stop (a
	 *    gradient-filled SVG was previously flattened SILENTLY), <title>/<desc>
	 *    (SVG accessible names were previously stripped, against the WCAG 2.1
	 *    AA baseline), plus filters, masks, patterns and <use>.
	 *  KEPT — `<animate>`, carried over so animated SVG still works here.
	 *  LOST — `<style>`, deliberately. Inline SVG `<style>` in an HTML document
	 *    is DOCUMENT-scoped, and wp_kses does not sanitise element TEXT
	 *    content, so arbitrary page-wide CSS survived it. A Contributor could
	 *    restyle or overlay the page, or `@import` an external sheet from an
	 *    admin's session. That is the same privilege-escalation family as the
	 *    editor XSS this work exists to close, so it did not carry over.
	 *
	 * Kept as a named alias rather than deleted so the existing call sites keep
	 * working; collapsing the two names is a later tidy-up, not a behaviour
	 * change.
	 *
	 * @return array<string,array<string,bool>> wp_kses allow-list.
	 */
	function sgs_allowed_svg_tags(): array {
		return sgs_svg_kses_allowed_tags();
	}
}

if ( ! function_exists( 'sgs_tier_media_render' ) ) {
	/**
	 * Render up to three device tiers of media, each with its own TYPE.
	 *
	 * Tiers fall back UP (Spec 35 D3/D5): a tier with no usable source emits
	 * nothing and the next wider tier keeps showing at that width. A block with
	 * only a desktop source therefore renders exactly one element at every width,
	 * which is the pre-existing single-source behaviour — this helper adds tiers
	 * without changing what a non-tiered block does.
	 *
	 * @param array  $tiers      Map of 'desktop'|'tablet'|'mobile' => array{
	 *                           type: string, media?: array, svg?: string }.
	 *                           'desktop' is the BASE tier.
	 * @param string $base_class BEM base for the emitted elements, e.g.
	 *                           'sgs-hero__split-media'.
	 * @param string $uid        Per-instance scope class (no leading dot).
	 * @param string $alt        Alt text. NOT tiered by design — a different crop
	 *                           of the same subject describes the same thing.
	 * @param array  $extra      Optional per-type extra classes, e.g.
	 *                           array( 'image' => 'sgs-hero__split-image' ).
	 * @param array  $options    Optional per-caller overrides. ADDITIVE — every
	 *                           key defaults to the behaviour this helper had
	 *                           before the parameter existed, so `sgs/hero`'s
	 *                           output is byte-identical without passing it.
	 *                           img_loading       'eager' -> 'lazy'
	 *                           img_fetchpriority 'high'  -> 'auto'|'low'
	 *                           video_autoplay    true    -> false (renders
	 *                           `controls` instead, so the media stays operable).
	 *
	 *                           ⛔ WHY OVERRIDABLE AT ALL. The defaults are right
	 *                           for the ONE caller this was written for: a single
	 *                           hero above the fold, fetched eagerly at high
	 *                           priority, autoplaying if it is video. They are
	 *                           wrong for a caller rendering N of these DOWN a
	 *                           page — `sgs/timeline` puts one per milestone, and
	 *                           eight eager high-priority images (or eight
	 *                           autoplaying looped videos) is a real regression
	 *                           against the green-CWV budget. The timeline's own
	 *                           pre-existing `<img>` used loading="lazy", so
	 *                           adopting this helper WITHOUT the override would
	 *                           have made that block slower, not faster.
	 * @return array{html:string,css:string} Markup and the tier-toggle CSS.
	 */
	function sgs_tier_media_render( array $tiers, string $base_class, string $uid, string $alt = '', array $extra = array(), array $options = array() ): array {
		$img_loading       = isset( $options['img_loading'] ) ? (string) $options['img_loading'] : 'eager';
		$img_fetchpriority = isset( $options['img_fetchpriority'] ) ? (string) $options['img_fetchpriority'] : 'high';
		$video_autoplay    = array_key_exists( 'video_autoplay', $options ) ? (bool) $options['video_autoplay'] : true;
		$html = '';
		$css  = '';

		// Which narrower tiers actually resolved to something renderable?
		$present = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			if ( sgs_tier_media_has_source( $tiers[ $tier ] ?? array() ) ) {
				$present[] = $tier;
			}
		}

		if ( empty( $present ) ) {
			return array(
				'html' => '',
				'css'  => '',
			);
		}

		$has_narrower = in_array( 'tablet', $present, true ) || in_array( 'mobile', $present, true );

		foreach ( $present as $tier ) {
			$spec = $tiers[ $tier ];
			$type = isset( $spec['type'] ) ? (string) $spec['type'] : 'image';

			// The base tier carries the `--desktop` modifier ONLY when a narrower
			// tier exists. Emitting it unconditionally would be harmless, but
			// emitting it NEVER (the pre-2026-08-07 hero bug) left tablet-only
			// heroes with toggle rules targeting a class nothing wrote, so both
			// images showed at once. Keep the condition explicit.
			$classes = array( $base_class );
			if ( 'desktop' !== $tier || $has_narrower ) {
				$classes[] = $base_class . '--' . $tier;
			}
			$classes[] = $base_class . '--' . $type;
			if ( ! empty( $extra[ $type ] ) ) {
				$classes[] = (string) $extra[ $type ];
			}
			$class_attr = implode( ' ', $classes );

			if ( 'svg' === $type ) {
				$html .= sprintf(
					'<span class="%s" aria-hidden="true">%s</span>',
					esc_attr( $class_attr ),
					wp_kses( (string) ( $spec['svg'] ?? '' ), sgs_allowed_svg_tags() )
				);
			} elseif ( 'video' === $type ) {
				$media = is_array( $spec['media'] ?? null ) ? $spec['media'] : array();
				// Only the BASE tier preloads. A hidden video does not autoplay and,
				// with preload="none", does not fetch — which is what keeps sibling
				// markup honest against D5's three-videos-all-fetching objection.
				$html .= sprintf(
					'<video class="%s"%s loop muted playsinline preload="%s"><source src="%s" type="video/mp4"></video>',
					esc_attr( $class_attr ),
					$video_autoplay ? ' autoplay' : ' controls',
					'desktop' === $tier ? 'metadata' : 'none',
					esc_url( (string) ( $media['url'] ?? '' ) )
				);
			} else {
				$media = is_array( $spec['media'] ?? null ) ? $spec['media'] : array();
				$attrs = array(
					'class'         => $class_attr,
					'loading'       => $img_loading,
					'decoding'      => 'async',
					'fetchpriority' => $img_fetchpriority,
				);
				if ( ! empty( $media['width'] ) ) {
					$attrs['width'] = absint( $media['width'] );
				}
				if ( ! empty( $media['height'] ) ) {
					$attrs['height'] = absint( $media['height'] );
				}
				$html .= sgs_responsive_image(
					! empty( $media['id'] ) ? absint( $media['id'] ) : 0,
					(string) ( $media['url'] ?? '' ),
					$alt,
					'large',
					$attrs
				);
			}
		}

		$css .= sgs_tier_media_toggle_css( $present, $base_class, $uid );

		return array(
			'html' => $html,
			'css'  => $css,
		);
	}
}

if ( ! function_exists( 'sgs_tier_media_has_source' ) ) {
	/**
	 * Does a tier spec resolve to something renderable?
	 *
	 * @param array $spec One tier's spec.
	 * @return bool True when the tier has a usable source for its declared type.
	 */
	function sgs_tier_media_has_source( array $spec ): bool {
		$type = isset( $spec['type'] ) ? (string) $spec['type'] : 'image';

		if ( 'svg' === $type ) {
			return '' !== trim( (string) ( $spec['svg'] ?? '' ) );
		}

		$media = is_array( $spec['media'] ?? null ) ? $spec['media'] : array();

		return '' !== trim( (string) ( $media['url'] ?? '' ) );
	}
}

if ( ! function_exists( 'sgs_tier_media_toggle_css' ) ) {
	/**
	 * Breakpoint rules that show exactly one tier at any width.
	 *
	 * Implements the CANONICAL upward cascade: a tier with no value of its own
	 * inherits from the next WIDEST tier that HAS one — mobile -> tablet ->
	 * desktop. This matches `sgs_resolve_tier()`
	 * (includes/helpers-responsive.php:685-694), whose mobile branch recurses to
	 * tablet, and Spec 35 D3/D5. D4 warns against a second inheritance mechanism,
	 * so this must not invent its own.
	 *
	 *   tiers set | <=767px | 768-1023px | >=1024px
	 *   none      | desktop | desktop    | desktop
	 *   mobile    | mobile  | desktop    | desktop
	 *   tablet    | TABLET  | tablet     | desktop
	 *   both      | mobile  | tablet     | desktop
	 *
	 * ⛔ FIXED 2026-08-13. The previous version emitted each tier's rules
	 *    INDEPENDENTLY, which got the third row wrong: with a TABLET tier set and
	 *    MOBILE empty it hid `--tablet` below 768px unconditionally and left
	 *    `--desktop` visible, so mobile fell back to DESKTOP and skipped the tablet
	 *    value it should have inherited. Its own docblock described that as
	 *    "degrades UP to the base" — but the base is not the next widest tier when
	 *    a tablet value exists. Proven, not inferred: the old rules replayed
	 *    through a 12-case assertion set fail exactly one case (tablet-only at
	 *    375px); this version passes 12/12, and the fix is confirmed on the live
	 *    canary (reports/visual-diff/media-2026-08-13.md, fixture B). Band
	 *    ownership is now COMPUTED rather than enumerated by hand, so a fourth
	 *    combination cannot be missed the same way.
	 *
	 * ⛔ Selectors are built from the BARE scope token (`.uid .class`), never by
	 *    appending a descendant to a multi-member selector LIST — a descendant
	 *    appended to a list binds to its LAST member only, which once hid every
	 *    image at every width on `sgs/media` (Spec 35 D5).
	 *
	 * ⛔ The hide selector is COMPOUND (`.base.base--tier`, specificity 0,3,0).
	 *    Block stylesheets set `display:block` on these BEM bases at 0,2,0; a bare
	 *    `.uid .base--tier` rule is ALSO 0,2,0, so the winner would be decided by
	 *    source order — which is not ours to guarantee once block CSS is lifted
	 *    into uploads/sgs-css/.
	 *
	 * Breakpoints are the locked 768/1024 device standard, never a bespoke value.
	 *
	 * @param array  $present    Tiers that actually rendered ('tablet'/'mobile').
	 * @param string $base_class BEM base.
	 * @param string $uid        Per-instance scope class (no leading dot).
	 * @return string CSS, or '' when no tier exists (single element, always shown).
	 */
	function sgs_tier_media_toggle_css( array $present, string $base_class, string $uid ): string {
		if ( empty( $present ) ) {
			return '';
		}

		$has = static function ( string $tier ) use ( $present ): bool {
			return in_array( $tier, $present, true );
		};

		// Which element OWNS each width band, per the canonical upward cascade.
		$owner = array(
			'mobile'  => $has( 'mobile' ) ? 'mobile' : ( $has( 'tablet' ) ? 'tablet' : 'desktop' ),
			'tablet'  => $has( 'tablet' ) ? 'tablet' : 'desktop',
			'desktop' => 'desktop',
		);

		$queries = array(
			'mobile'  => '@media (max-width:767px)',
			'tablet'  => '@media (min-width:768px) and (max-width:1023px)',
			'desktop' => '@media (min-width:1024px)',
		);

		$scope    = '.' . $uid . ' .' . $base_class;
		$rendered = array_merge( array( 'desktop' ), $present );
		$css      = '';

		foreach ( $queries as $band => $query ) {
			foreach ( $rendered as $element ) {
				if ( $element === $owner[ $band ] ) {
					continue;
				}
				$css .= $query . '{' . $scope . '.' . $base_class . '--' . $element . '{display:none}}';
			}
		}

		return $css;
	}
}
