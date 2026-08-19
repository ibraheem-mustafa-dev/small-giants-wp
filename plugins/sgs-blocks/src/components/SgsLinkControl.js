/**
 * SgsLinkControl — shared wrapper around WordPress core `LinkControl`.
 *
 * ⚠ ADDED 2026-08-19 — this file currently has **ZERO JSX mounts** anywhere
 * in the plugin (verified via `grep -rn '<SgsLinkControl'` across
 * `src/blocks/` and `src/components/`, 2026-08-19 — every remaining hit
 * across `card-grid`/`team-member`/`brand-strip`/`trust-bar`/`pricing-table`/
 * `social-icons`/`media`/`form` is a comment citing the OLD shape, plus
 * PHP `render.php` files that never import a JS component at all). It is
 * superseded by `LinkPopoverControl` — see that file's own docblock ("Supersedes
 * `SgsLinkControl`'s INLINE mount as the canonical shape") for why: this
 * component's inline-`PanelBody` mounting of core `LinkControl` staged toggle
 * state that only committed on an explicit Submit/Enter, so a toggle flipped
 * then navigated away from was silently discarded (root-caused 2026-07-28).
 * `LinkPopoverControl` fixed this by rendering the toggles itself, driven
 * directly by `value`/`onChange`, never handed to `LinkControl`'s `settings`
 * prop. This file is kept as source but is currently dead code.
 *
 * Spec 35 Part I action item 2: every link/URL field in the framework should
 * offer internal-content search, an open-in-new-tab toggle, and rel
 * nofollow/sponsored controls — not a raw `TextControl`. `LinkControl`
 * provides all three natively; this wrapper adapts its value shape to the
 * OBJECT attribute SGS blocks store: `{ url, opensInNewTab, rel }`.
 *
 * `noopener` is auto-added to `rel` whenever `opensInNewTab` is true — a
 * `target="_blank"` link without `rel="noopener"` lets the new page reach
 * back into `window.opener` (a long-standing tab-nabbing security issue).
 * This mirrors the auto-rel behaviour already hand-rolled per-block in
 * `sgs/icon`'s `render.php` (`'_blank' === $link_target && '' === $effective_rel`),
 * now centralised so every future consumer gets it for free.
 *
 * The companion PHP render helper is `sgs_link_attributes()` in
 * `includes/helpers-link.php` — it turns this component's stored object back
 * into a safe `href`/`target`/`rel` attribute string.
 *
 * WCAG 2.1 AA: `LinkControl` is WordPress core's own accessible combobox
 * (keyboard-operable search, visible focus, labelled controls); wrapping it
 * in `BaseControl` gives the whole field a proper `<label>` +
 * `aria-describedby` help text via WP's own `BaseControl` machinery.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { LinkControl } from '@wordpress/block-editor';
import { BaseControl, ToggleControl } from '@wordpress/components';

/**
 * Core `LinkControl` STAGES every settings-drawer toggle (its own
 * `internalControlValue` state, built by `createSetInternalSettingValueHandler`
 * in `@wordpress/block-editor/src/components/link-control/index.js`) and only
 * folds it into `onChange` from `submitUrlValue()` — fired by the "Submit"
 * button (`handleSubmit`) or Enter in the URL field. There is no blur/close
 * handler that commits the staged state, so a toggle flipped without also
 * pressing Submit is silently discarded (root-caused 2026-07-28, QC-confirmed
 * across card-grid/media/trust-bar — the checkbox visually flips, `onChange`
 * never fires). SGS renders these blocks' `SgsLinkControl` inline inside an
 * Inspector `PanelBody`, not a Popover the user explicitly "submits" — so a
 * toggle-then-navigate-away is the ordinary editing flow here, not an edge
 * case.
 *
 * Fix: render the toggles OURSELVES, driven directly by `value`/`onChange`,
 * and never hand them to `LinkControl`'s `settings` prop (which is where the
 * staging lives). `LinkControl` is used ONLY for the URL search/submit UI —
 * `settings` is always `[]`, so it never seeds `internalControlValue` for
 * these keys and never intercepts them.
 */
const LINK_TOGGLES = [
	{ key: 'opensInNewTab', label: __( 'Open in new tab', 'sgs-blocks' ) },
	{ key: 'nofollow', label: __( 'Mark as nofollow', 'sgs-blocks' ) },
	{ key: 'sponsored', label: __( 'Mark as sponsored', 'sgs-blocks' ) },
];

/**
 * Split a space-separated `rel` string into the individual boolean flags
 * LinkControl's `settings` toggles expect.
 *
 * @param {string} rel Stored rel string, e.g. "nofollow noopener".
 * @return {{nofollow: boolean, sponsored: boolean}} Flag map.
 */
function relToFlags( rel ) {
	const tokens = ( rel || '' ).split( ' ' ).filter( Boolean );
	return {
		nofollow: tokens.includes( 'nofollow' ),
		sponsored: tokens.includes( 'sponsored' ),
	};
}

/**
 * Rebuild the `rel` string from LinkControl's flags, auto-adding `noopener`
 * when the link opens in a new tab.
 *
 * @param {Object}  flags                 Flag map.
 * @param {boolean} flags.nofollow        Mark as nofollow.
 * @param {boolean} flags.sponsored       Mark as sponsored.
 * @param {boolean} flags.opensInNewTab   Opens in a new tab.
 * @return {string} Space-separated rel string, or '' when no tokens apply.
 */
function flagsToRel( { nofollow, sponsored, opensInNewTab } ) {
	const tokens = [];
	if ( nofollow ) {
		tokens.push( 'nofollow' );
	}
	if ( sponsored ) {
		tokens.push( 'sponsored' );
	}
	if ( opensInNewTab ) {
		tokens.push( 'noopener' );
	}
	return tokens.join( ' ' );
}

/**
 * @param {Object}   props
 * @param {string}   props.label       Field label.
 * @param {string}   [props.help]      Help text (rendered via aria-describedby).
 * @param {Object}   props.value       Stored link value: { url, opensInNewTab, rel }.
 *                                     In `searchOnly` mode, only `value.url` is read.
 * @param {Function} props.onChange    Receives the next { url, opensInNewTab, rel }
 *                                     object — or, in `searchOnly` mode, the next
 *                                     url STRING directly.
 * @param {boolean}  [props.searchOnly] Opt-in variant for plain string-URL attributes
 *                                     that have no new-tab/rel concept (e.g. a form's
 *                                     internal `successRedirect` target). Renders
 *                                     LinkControl with `settings={ [] }` — no
 *                                     open-in-new-tab / nofollow / sponsored toggles —
 *                                     and `onChange` forwards only the url string, not
 *                                     an object. The attribute stays a plain string.
 */
export default function SgsLinkControl( { label, help, value, onChange, searchOnly = false } ) {
	const relFlags = relToFlags( value?.rel );
	const linkValue = {
		url: value?.url || '',
		opensInNewTab: !! value?.opensInNewTab,
		nofollow: relFlags.nofollow,
		sponsored: relFlags.sponsored,
	};

	const handleChange = ( next ) => {
		if ( searchOnly ) {
			onChange( next.url || '' );
			return;
		}

		const opensInNewTab = !! next.opensInNewTab;
		const rel = flagsToRel( {
			nofollow: !! next.nofollow,
			sponsored: !! next.sponsored,
			opensInNewTab,
		} );

		onChange( {
			url: next.url || '',
			opensInNewTab,
			rel,
		} );
	};

	// Toggles commit immediately — they call handleChange directly with the
	// CURRENT linkValue plus the one flag that changed, bypassing LinkControl
	// entirely (never touching its staged `internalControlValue`). See the
	// LINK_TOGGLES comment above for why this must not go through
	// LinkControl's own `settings` prop.
	const handleToggle = ( key ) => ( checked ) => {
		handleChange( { ...linkValue, [ key ]: checked } );
	};

	return (
		<BaseControl label={ label } help={ help } __nextHasNoMarginBottom>
			<LinkControl
				searchInputPlaceholder={ __( 'Search or paste a URL', 'sgs-blocks' ) }
				value={ linkValue }
				settings={ [] }
				onChange={ handleChange }
				forceIsEditingLink={ ! linkValue.url }
			/>
			{ ! searchOnly && linkValue.url && (
				<div className="sgs-link-control__toggles">
					{ LINK_TOGGLES.map( ( { key, label: toggleLabel } ) => (
						<ToggleControl
							key={ key }
							label={ toggleLabel }
							checked={ !! linkValue[ key ] }
							onChange={ handleToggle( key ) }
							__nextHasNoMarginBottom
						/>
					) ) }
				</div>
			) }
		</BaseControl>
	);
}
