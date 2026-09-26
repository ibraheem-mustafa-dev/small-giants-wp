/**
 * Hover Effects extension — per-block default/exclusion resolution.
 *
 * Split out of the former hover-effects.js (D551, Phase 2.1 header docs live
 * in ./index.js). Verbatim move; no behaviour change.
 *
 * @package SGS\Blocks
 */

/**
 * Resolve per-block hover defaults from the BLOCK'S OWN DECLARATION.
 *
 * Mirrors resolve_hover_defaults() in includes/hover-effects/resolve.php —
 * both read the same `supports.sgs.hoverDefaults` object, so there is ONE
 * declaration per block and no roster to keep in step.
 *
 * ⛔ REPLACED three hardcoded block-name Sets (D805) for the reason recorded in
 * the PHP twin: those Sets named 11 blocks, nothing gated the PHP half, and
 * eight of the 11 therefore received injected hover motion with the panel
 * switched off and no control to change it.
 *
 * The caller already gates on isExtensionEnabled( settings, 'hover' ), so a
 * declaration on a block with no hover panel is never reached here — the same
 * two-condition rule the PHP enforces explicitly.
 *
 * @param {Object} settings Block settings from blocks.registerBlockType.
 * @return {{ scalePreset: string, shadow: string, imageZoom: boolean, focusRing: boolean, lift: number, zoom: number, zoomDuration: number }} Defaults.
 */
export function resolveBlockDefaults( settings ) {
	const declared = settings?.supports?.sgs?.hoverDefaults;

	if ( ! declared || 'object' !== typeof declared ) {
		return { scalePreset: '', shadow: '', imageZoom: false, focusRing: false, lift: 0, zoom: 0, zoomDuration: 0 };
	}

	// ONE control (Bean's ruling, 2026-09-24): a block that draws the automatic shadow
	// lift (declares `shadowLiftOnHover`, the Shadow panel's own switch) must NEVER also
	// get a non-empty `sgsHoverShadow` DEFAULT from `hoverDefaults.shadow` — that would
	// silently pre-select a preset on every fresh instance before the operator ever opens
	// either panel, contradicting "Automatic (matching lift)" being the real default.
	// Found live on sgs/info-box and sgs/team-member, both of which declare
	// `hoverDefaults.shadow: 'soft'` AND `shadowLiftOnHover` in the SAME block.json.
	// PHP twin: resolve_hover_defaults() in includes/hover-effects/resolve.php.
	const hasShadowLift = Boolean( settings?.attributes ) &&
		Object.prototype.hasOwnProperty.call( settings.attributes, 'shadowLiftOnHover' );

	return {
		scalePreset: 'string' === typeof declared.scalePreset ? declared.scalePreset : '',
		shadow:      hasShadowLift ? '' : ( 'string' === typeof declared.shadow ? declared.shadow : '' ),
		imageZoom:   !! declared.imageZoom,
		focusRing:   !! declared.focusRing,
		// Numbers in the panel's units (px, %, ms); 0 = off / the block's own default.
		lift:         Number.isFinite( declared.lift ) ? declared.lift : 0,
		zoom:         Number.isFinite( declared.zoom ) ? declared.zoom : 0,
		zoomDuration: Number.isFinite( declared.zoomDuration ) ? declared.zoomDuration : 0,
	};
}

/**
 * Resolve a block's declared hover-control exclusions.
 *
 * Gate A cleanup (D808 follow-up, 2026-08-27): mirrors
 * resolve_hover_excluded_controls() in includes/hover-effects/resolve.php —
 * both read the same `supports.sgs.hoverExcludeControls` array declared in the
 * block's own block.json, so there is ONE declaration and no named-block array
 * in either shared file (same discipline D805 already enforced for
 * hoverDefaults). pricing-table / google-reviews / whatsapp-cta declare
 * `["imageZoom", "grayscale"]` — they are root-hover blocks (D808) with no
 * image element for those two toggles to bind to; leaving them present but
 * inert is the D805 failure shape this suppresses.
 *
 * @param {Object} settings Block settings (registered type or registerBlockType settings).
 * @return {string[]} Excluded control keys, e.g. [ 'imageZoom', 'grayscale' ].
 */
export function resolveHoverExcludedControls( settings ) {
	const excluded = settings?.supports?.sgs?.hoverExcludeControls;
	return Array.isArray( excluded ) ? excluded : [];
}
