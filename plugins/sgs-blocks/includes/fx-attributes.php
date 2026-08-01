<?php
/**
 * Tier G fx attributes — server-side data-attribute injection.
 *
 * Spec 38 FR-38-4 / §11.2. The mirror of `animation-attributes.php` for the
 * motion system: it emits `data-sgs-fx*` onto DYNAMIC blocks' rendered HTML.
 *
 * Two paths exist because block attributes reach the frontend two ways, and
 * covering only one produces an effect that works on some blocks and silently
 * not on others:
 *
 *   · STATIC blocks  — `src/blocks/extensions/fx.js` writes the attributes at
 *                      save time via `blocks.getSaveContent.extraProps`, so
 *                      they are already baked into stored `post_content`.
 *   · DYNAMIC blocks — `save()` returns null, so nothing is stored. THIS FILE
 *                      injects them at render time.
 *
 * Runs at `render_block` priority 10 — BEFORE `SGS_Motion_Registry`'s sniff at
 * priority 99. That ordering is load-bearing: the registry decides whether to
 * enqueue any GSAP by looking for `data-sgs-fx` in the rendered markup, so the
 * attribute has to be present by the time it looks. Injecting at a priority
 * after 99 would leave every dynamic block's effect silently unloaded.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Block attribute name => rendered data-attribute suffix (Spec 38 §11.2).
 */
const FX_ATTR_MAP = array(
	'fx'           => 'data-sgs-fx',
	'fxTrigger'    => 'data-sgs-fx-trigger',
	'fxStart'      => 'data-sgs-fx-start',
	'fxEnd'        => 'data-sgs-fx-end',
	'fxHold'       => 'data-sgs-fx-hold',
	'fxScrub'      => 'data-sgs-fx-scrub',
	'fxStagger'    => 'data-sgs-fx-stagger',
	'fxDuration'   => 'data-sgs-fx-duration',
	'fxEase'       => 'data-sgs-fx-ease',
	'fxSplit'      => 'data-sgs-fx-split',
	'fxMask'       => 'data-sgs-fx-mask',

	/*
	 * Motion-path route (Spec 38 §11.2, D427). These two are the AUTHORING
	 * surface; `includes/fx-path-routes.php` reads them back off the rendered
	 * markup at p11 and expands them into the hidden route <svg> plus the
	 * `data-sgs-fx-motion-path-target` selector the runtime resolves. That
	 * target attribute is render-layer OUTPUT and deliberately has no row here
	 * — nothing authors it.
	 *
	 * `fxPathRotate` maps to the runtime's own attribute name rather than a
	 * name derived from the block attribute, because `fx-motion-path.js` reads
	 * `data-sgs-fx-motion-path-rotate` and is untouched by this work.
	 *
	 * `fxPreset` is ABSENT on purpose: a preset writes its values into the
	 * params above, so emitting the label too would ship a data attribute no
	 * runtime reads.
	 */
	'fxPath'       => 'data-sgs-fx-path',
	'fxPathAsset'  => 'data-sgs-fx-path-asset',
	'fxPathRotate' => 'data-sgs-fx-motion-path-rotate',

	/*
	 * Resting position (Spec 38 §11.2, D441, 2026-08-01). Where the traveller
	 * settles once its scrub completes — a client-facing preset picker plus a
	 * 5vh-stepped fine-tune slider for `custom`. Both map to plain data
	 * attributes (not inline custom-property values) so `assets/css/
	 * fx-motion-path.css`'s declarative `calc()`/`max()` rules — not this
	 * file, not the runtime — resolve the actual target position. See that
	 * file's docblock for the full mechanism and why a runtime clamp was
	 * rejected in favour of it.
	 */
	'fxPathRest'   => 'data-sgs-fx-motion-path-rest',
	'fxPathRestVh' => 'data-sgs-fx-motion-path-rest-vh',

	/*
	 * MorphSVG shape pair (Spec 38 §11.2, D427). These are the AUTHORING
	 * surface; `includes/fx-shape-routes.php` reads them back off the
	 * rendered markup at p11 and expands them into the visible FROM `<svg>` +
	 * hidden TO `<svg>` + `data-sgs-fx-morph-target` selector the runtime
	 * resolves. That target attribute is render-layer OUTPUT and
	 * deliberately has no row here, same as the motion-path target above —
	 * nothing authors it.
	 */
	'fxShape'          => 'data-sgs-fx-shape',
	'fxShapeAssetFrom' => 'data-sgs-fx-shape-asset-from',
	'fxShapeAssetTo'   => 'data-sgs-fx-shape-asset-to',
);

/**
 * Advance past any leading `<style>`/`<script>` so a tag processor lands on the
 * block's REAL root element.
 *
 * Spec 32's no-inline contract has composites PREPEND a scoped
 * `<style id="…">…</style>` before their wrapper. `WP_HTML_Tag_Processor::
 * next_tag()` matches ANY tag including `<style>`, so calling it on the raw
 * content writes the data attributes onto the style tag — inert, and later
 * stripped wholesale by the p99 CSS-lift filter, so the effect never fires and
 * nothing anywhere reports an error. This exact bug has shipped on this project
 * before (see the identical guard in `animation-attributes.php`).
 *
 * @param string $block_content Rendered block HTML.
 * @return int Byte offset of the real root tag.
 */
function sgs_fx_root_offset( string $block_content ): int {
	$offset = 0;
	while ( \preg_match( '/^\s*<(style|script)\b[^>]*>/i', \substr( $block_content, $offset ), $m ) ) {
		$close     = '</' . \strtolower( $m[1] ) . '>';
		$close_pos = \stripos( $block_content, $close, $offset );
		if ( false === $close_pos ) {
			break; // Malformed markup — treat the whole string as-is.
		}
		$offset = $close_pos + \strlen( $close );
	}
	return $offset;
}

/**
 * Build the `data-sgs-fx*` attribute string for a block's attributes.
 *
 * The same grammar `sgs_inject_fx_attributes()` writes onto a block ROOT, as a
 * ready-to-echo string, for the case where the effect must land on an element
 * DEEPER than the root and only the code emitting that element knows which one
 * it is. `SGS_Container_Wrapper` uses it for the DrawSVG marker on
 * `.sgs-container__svg-bg`.
 *
 * Sharing FX_ATTR_MAP is the point: a caller that hand-rolled its own
 * `data-sgs-fx-*` list would silently stop honouring any parameter added to the
 * grammar later, and the effect would behave differently depending on which
 * element it was attached to.
 *
 * Emitting this string on a descendant deliberately SUPPRESSES the root
 * injection — `sgs_inject_fx_attributes()` bails as soon as it sees
 * `data-sgs-fx=` anywhere in the rendered block — which is exactly the intent:
 * one effect, one target element, chosen by the code that knows the markup.
 *
 * @param array $attrs Parsed block attributes.
 * @return string Leading-space-prefixed attribute string, or '' when no effect
 *                is set. Every value is passed through `esc_attr()`.
 */
function sgs_fx_data_attr_string( array $attrs ): string {
	$fx = $attrs['fx'] ?? '';
	if ( ! \is_string( $fx ) || '' === $fx ) {
		return '';
	}

	$out = '';
	foreach ( FX_ATTR_MAP as $attr => $data_attr ) {
		if ( ! isset( $attrs[ $attr ] ) ) {
			continue;
		}
		$value = $attrs[ $attr ];

		// Same rule as the root injector: skip only genuinely ABSENT values, so
		// a legitimate numeric zero (`fxScrub => 0` means "no smoothing lag")
		// survives instead of being replaced by the module's default.
		if ( '' === $value || null === $value ) {
			continue;
		}

		$out .= ' ' . $data_attr . '="' . \esc_attr( (string) $value ) . '"';
	}

	return $out;
}

/**
 * Inject `data-sgs-fx*` onto a dynamic block's rendered root element.
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         Parsed block data including attrs.
 * @return string Block HTML, with fx data attributes when an effect is set.
 */
function sgs_inject_fx_attributes( string $block_content, array $block ): string {
	if ( '' === $block_content ) {
		return $block_content;
	}

	$attrs = $block['attrs'] ?? array();
	$fx    = $attrs['fx'] ?? '';

	if ( ! \is_string( $fx ) || '' === $fx ) {
		return $block_content;
	}

	// Already emitted by the static-save path — never write them twice.
	if ( false !== \strpos( $block_content, 'data-sgs-fx=' ) ) {
		return $block_content;
	}

	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	foreach ( FX_ATTR_MAP as $attr => $data_attr ) {
		if ( ! isset( $attrs[ $attr ] ) ) {
			continue;
		}
		$value = $attrs[ $attr ];

		/*
		 * Skip only genuinely ABSENT values. An emitted empty string would
		 * override the effect module's considered default with nothing.
		 *
		 * A numeric ZERO is NOT absent and must survive: `fxScrub => 0` means
		 * "no smoothing lag", a legitimate setting. The previous rule dropped
		 * every zero here, which is the same defect the JS save filter had —
		 * the client's choice vanished and the module's default silently took
		 * over. The two paths must agree, or the same block behaves differently
		 * depending on whether it was server-rendered or saved as static markup.
		 */
		if ( '' === $value || null === $value ) {
			continue;
		}

		$processor->set_attribute( $data_attr, \esc_attr( (string) $value ) );
	}

	/*
	 * NO TRACK MARKING HERE — deliberate, and it was tried and removed.
	 *
	 * Spec 38 FR-38-8's horizontal panel needs one child element marked as the
	 * track. That element cannot be hand-authored (`sgs/container` is dynamic, so
	 * render.php regenerates its markup and an authored attribute is discarded —
	 * silently, per D338). The obvious fix from here was to scan this rendered
	 * HTML for the first `.sgs-container__inner` and mark it.
	 *
	 * That shipped, and it marked the WRONG element: with nested containers the
	 * first match belongs to a CHILD, so the effect measured a 96px inner instead
	 * of the 1200px panel row, computed zero travel distance, and never pinned.
	 * "Scan the output for the element I want" is a guess whenever more than one
	 * candidate can exist.
	 *
	 * The mark is now applied by `SGS_Container_Wrapper` at the point it EMITS
	 * the `__inner` element — the only place that knows which one is its own.
	 * Do not reintroduce a scan here as a "fallback": if the wrapper did not emit
	 * an inner element, the only candidates left belong to children, so a
	 * fallback would mark the wrong element by construction. Absent mark → the
	 * effect module bails to the CSS scroll-snap fallback, which is correct.
	 */
	return $head . $processor->get_updated_html();
}
\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_inject_fx_attributes', 10, 2 );
