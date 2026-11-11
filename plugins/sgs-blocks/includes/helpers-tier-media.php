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
// U-17 (design §3.1) — not yet wired into render-helpers.php's autoload
// chain, so required directly here (idempotent — require_once).
require_once __DIR__ . '/lottie-render.php';
// The per-kind branches of sgs_tier_media_render().
require_once __DIR__ . '/media/tier-image.php';
require_once __DIR__ . '/media/tier-video.php';
require_once __DIR__ . '/media/tier-svg.php';

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
	 * @param array        $tiers      Map of 'desktop'|'tablet'|'mobile' => array{
	 *                                 type: string, media?: array, svg?: string }.
	 *                                 'desktop' is the BASE tier.
	 * @param string       $base_class BEM base for the emitted elements, e.g.
	 *                                 'sgs-hero__split-media'.
	 * @param string       $uid        Per-instance scope class (no leading dot).
	 * @param string|array $alt  Alt text. Either a single string (applied to
	 *                           every tier — the original, still-default
	 *                           behaviour, byte-identical for every existing
	 *                           caller that passes a string), OR a per-tier
	 *                           array `['desktop'=>..,'tablet'=>..,'mobile'=>..]`
	 *                           for a caller whose tiers are genuinely
	 *                           different photos, not crops of one subject.
	 *                           An array tier left empty/unset falls back UP
	 *                           to the next wider tier's alt (mobile -> tablet
	 *                           -> desktop), the SAME fall-back-UP rule already
	 *                           used for the media source itself (Spec 35
	 *                           D3/D5) — so a caller that sets only the
	 *                           desktop alt still gets that text on every
	 *                           tier, matching the pre-2026-09-08 behaviour
	 *                           exactly. Reversed from Spec 35 D5's original
	 *                           "alt is NOT tiered" rule (2026-09-08 — a
	 *                           block's mobile/desktop split-media images can
	 *                           be two genuinely different photos, not one
	 *                           subject at two crops; WCAG 1.1.1 needs a
	 *                           description per tier in that case) —
	 *                           additive, so every OTHER caller of this shared
	 *                           helper (`sgs/timeline`'s milestone media) is
	 *                           unaffected unless it opts in with an array.
	 * @param array        $extra      Optional per-type extra classes, e.g.
	 *                                 array( 'image' => 'sgs-hero__split-image' ).
	 * @param array        $options    Optional per-caller overrides. ADDITIVE — every
	 *                                 key defaults to the behaviour this helper had
	 *                                 before the parameter existed, so `sgs/hero`'s
	 *                                 output is byte-identical without passing it.
	 *                                 img_loading       'eager' -> 'lazy'
	 *                                 img_fetchpriority 'high'  -> 'auto'|'low'
	 *                                 video_autoplay    true    -> false (renders
	 *                                 `controls` instead, so the media stays operable).
	 *
	 *                                 ⛔ WHY OVERRIDABLE AT ALL. The defaults are right
	 *                                 for the ONE caller this was written for: a single
	 *                                 hero above the fold, fetched eagerly at high
	 *                                 priority, autoplaying if it is video. They are
	 *                                 wrong for a caller rendering N of these DOWN a
	 *                                 page — `sgs/timeline` puts one per milestone, and
	 *                                 eight eager high-priority images (or eight
	 *                                 autoplaying looped videos) is a real regression
	 *                                 against the green-CWV budget. The timeline's own
	 *                                 pre-existing `<img>` used loading="lazy", so
	 *                                 adopting this helper WITHOUT the override would
	 *                                 have made that block slower, not faster.
	 * @return array{html:string,css:string} Markup and the tier-toggle CSS.
	 */
	function sgs_tier_media_render( array $tiers, string $base_class, string $uid, $alt = '', array $extra = array(), array $options = array() ): array {
		$img_loading       = isset( $options['img_loading'] ) ? (string) $options['img_loading'] : 'eager';
		$img_fetchpriority = isset( $options['img_fetchpriority'] ) ? (string) $options['img_fetchpriority'] : 'high';
		$video_autoplay    = array_key_exists( 'video_autoplay', $options ) ? (bool) $options['video_autoplay'] : true;
		$html              = '';
		$css               = '';

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

		// Resolve the per-tier alt text UP FRONT, once, using the SAME
		// fall-back-UP cascade as the media source itself (Spec 35 D3/D5): a
		// tier with no alt of its own inherits the next WIDEST tier that has
		// one. A plain string $alt (every pre-2026-09-08 caller) is applied to
		// every tier unchanged — this branch only activates for a caller that
		// deliberately opts into per-tier alt by passing an array.
		if ( is_array( $alt ) ) {
			$resolved_alt = array();
			$fallback     = (string) ( $alt['desktop'] ?? '' );
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				$tier_alt = (string) ( $alt[ $tier ] ?? '' );
				if ( '' !== $tier_alt ) {
					$fallback = $tier_alt;
				}
				$resolved_alt[ $tier ] = $fallback;
			}
		} else {
			$alt_string   = (string) $alt;
			$resolved_alt = array(
				'desktop' => $alt_string,
				'tablet'  => $alt_string,
				'mobile'  => $alt_string,
			);
		}

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
				$html .= sgs_tier_media_svg_html( $spec, $class_attr );
			} elseif ( 'video' === $type ) {
				$html .= sgs_tier_media_video_html( $spec, $tier, $class_attr, $video_autoplay );
			} elseif ( 'lottie' === $type ) {
				$media      = is_array( $spec['media'] ?? null ) ? $spec['media'] : array();
				$lottie_id  = ! empty( $media['id'] ) ? absint( $media['id'] ) : 0;
				$lottie_opt = is_array( $options['lottie'] ?? null ) ? $options['lottie'] : array();

				$result = sgs_render_lottie(
					$lottie_id,
					array(
						'poster_html' => (string) ( $spec['poster'] ?? '' ),
						'alt'         => $resolved_alt[ $tier ],
						'trigger'     => (string) ( $lottie_opt['trigger'] ?? 'visible' ),
						'loop'        => ! empty( $lottie_opt['loop'] ),
						'speed'       => isset( $lottie_opt['speed'] ) ? (float) $lottie_opt['speed'] : 1.0,
						'extra_class' => $class_attr,
					)
				);
				$html .= $result['wrapper'];
				if ( '' !== $result['pause'] ) {
					// Carry the SAME tier-visibility classes as the wrapper
					// (base_class + base_class--tier) so the shared toggle CSS
					// built below (sgs_tier_media_toggle_css()) hides/shows the
					// pause control together with its own tier's animation.
					$html .= str_replace(
						'class="sgs-lottie__pause',
						'class="' . esc_attr( $class_attr ) . ' sgs-lottie__pause',
						$result['pause']
					);
				}
			} else {
				$html .= sgs_tier_media_image_html( $spec, $class_attr, $resolved_alt[ $tier ], $img_loading, $img_fetchpriority );
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

		// Lottie has no `url` — its only source is the attachment `id`
		// (`LottieId`, design §3.1); resolved to a URL inside sgs_render_lottie().
		if ( 'lottie' === $type ) {
			return ! empty( $media['id'] );
		}

		return '' !== trim( (string) ( $media['url'] ?? '' ) );
	}
}

if ( ! function_exists( 'sgs_tier_media_toggle_css' ) ) {
	/**
	 * Breakpoint rules that show exactly one tier at any width.
	 *
	 * Implements the CANONICAL upward cascade: a tier with no value of its own
	 * inherits from the next WIDEST tier that HAS one — mobile -> tablet ->
	 * desktop. This matches
	 * `includes/helpers-responsive.php::sgs_resolve_tier()`, whose mobile branch recurses to
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
			'mobile'  => SGS_Breakpoints::media( 'mobile' ),
			'tablet'  => SGS_Breakpoints::media( 'tablet-only' ),
			'desktop' => SGS_Breakpoints::media( 'desktop' ),
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
