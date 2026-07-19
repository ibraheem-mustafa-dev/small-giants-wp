/**
 * SgsLinkControl — shared wrapper around WordPress core `LinkControl`.
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
import { BaseControl } from '@wordpress/components';

/**
 * Rel-token settings surfaced as LinkControl's extra checkbox toggles
 * (rendered alongside its built-in "Open in new tab" toggle).
 */
const REL_SETTINGS = [
	{ id: 'nofollow', title: __( 'Mark as nofollow', 'sgs-blocks' ) },
	{ id: 'sponsored', title: __( 'Mark as sponsored', 'sgs-blocks' ) },
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
 * @param {string}   props.label    Field label.
 * @param {string}   [props.help]   Help text (rendered via aria-describedby).
 * @param {Object}   props.value    Stored link value: { url, opensInNewTab, rel }.
 * @param {Function} props.onChange Receives the next { url, opensInNewTab, rel } object.
 */
export default function SgsLinkControl( { label, help, value, onChange } ) {
	const relFlags = relToFlags( value?.rel );
	const linkValue = {
		url: value?.url || '',
		opensInNewTab: !! value?.opensInNewTab,
		nofollow: relFlags.nofollow,
		sponsored: relFlags.sponsored,
	};

	const handleChange = ( next ) => {
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

	return (
		<BaseControl label={ label } help={ help } __nextHasNoMarginBottom>
			<LinkControl
				searchInputPlaceholder={ __( 'Search or paste a URL', 'sgs-blocks' ) }
				value={ linkValue }
				settings={ REL_SETTINGS }
				onChange={ handleChange }
				forceIsEditingLink={ ! linkValue.url }
			/>
		</BaseControl>
	);
}
