/**
 * "_sgs_is_default" Document sidebar toggle (client build, 2026-09-17).
 *
 * Adds a "Default" panel to the block editor's Document sidebar on the
 * `sgs_modal` CPT screen, which carries the `_sgs_is_default` post-meta
 * boolean registered by `Sgs_Cpt_Default_Meta` (PHP).
 *
 * ⚠ REDUCED SCOPE (2026-09-17, same-day correction): this originally also
 * covered `sgs_header` and `sgs_footer`. Removed — those two CPTs already
 * have the exact same "which one is live" concept via `Sgs_Active_Layout`'s
 * "Active"/"Set as active"/"Clear active" admin-list-table mechanism (PHP:
 * `class-sgs-active-layout-admin.php`), so the toggle here would have been a
 * second, unwired control for the same fact. `sgs_modal` has no such
 * mechanism to duplicate (see `class-sgs-cpt-default-meta.php`'s docblock for
 * why it was not folded into `Sgs_Active_Layout` either), so it keeps this
 * panel.
 *
 * Loaded from the SAME global `enqueue_block_editor_assets` bundle every other
 * extension in this directory rides on (see this directory's index.js), so it
 * is present on every post-type screen — this component reads the current
 * post type and renders null everywhere it does not apply, exactly the guard
 * shape `conditional-visibility.js` and friends already use for a block-scoped
 * equivalent.
 *
 * Double-registration guard mirrors every sibling extension in this directory
 * (responsive-device-toggle.js, animation.js, parallax.js,
 * conditional-visibility.js) — registerPlugin no-ops with a console warning on
 * a duplicate name rather than throwing, so "renders once" only holds while
 * this file is imported from exactly one place (this directory's index.js).
 */
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const META_KEY = '_sgs_is_default';

/** Toggle label per eligible post type. */
const LABELS = {
	sgs_modal: __( 'Default modal', 'sgs-blocks' ),
};

/** Toggle help text per eligible post type. */
const HELP_TEXT = {
	sgs_modal: __(
		'Used as the fallback modal. Turning this on turns it off on every other modal.',
		'sgs-blocks'
	),
};

if ( ! window.__sgsCptDefaultPanelRegistered ) {
	window.__sgsCptDefaultPanelRegistered = true;

	const SgsCptDefaultPanel = () => {
		const postType = useSelect(
			( select ) => select( 'core/editor' ).getCurrentPostType(),
			[]
		);

		// useEntityProp must run unconditionally (hooks rule) — it is a no-op
		// read/write on a post type with no matching entity record yet, and the
		// eligibility guard below is what actually gates rendering.
		const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' );

		if ( ! Object.prototype.hasOwnProperty.call( LABELS, postType ) ) {
			return null;
		}

		const isDefault = Boolean( meta && meta[ META_KEY ] );

		return (
			<PluginDocumentSettingPanel
				name="sgs-cpt-default-panel"
				title={ __( 'Default', 'sgs-blocks' ) }
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ LABELS[ postType ] }
					help={ HELP_TEXT[ postType ] }
					checked={ isDefault }
					onChange={ ( value ) =>
						setMeta( { ...meta, [ META_KEY ]: value } )
					}
				/>
			</PluginDocumentSettingPanel>
		);
	};

	registerPlugin( 'sgs-cpt-default-panel', { render: SgsCptDefaultPanel } );
}
