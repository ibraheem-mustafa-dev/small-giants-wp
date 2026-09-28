/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Styles tab: "Trailing icon"
 * PanelBody (G-7, 2026-09-28).
 *
 * A per-item trailing glyph after ANY row's label (not only rows with a
 * submenu — that is the accordion expander, `itemExpanderIcon`, a separate
 * element). Storage mirrors `featuredItemIds`/`disabledItemIds`'s identifier
 * scheme, but as a MAP rather than an id list, since each item's icon
 * CHOICE — not just membership — is the value being set:
 * `itemTrailingIcons: { [identifier]: { source, name } | { source: 'custom', svg } }`.
 * Colour/size are block-level Styles-tab controls (`itemTrailingIconColour`/
 * `itemTrailingIconSize`), same split as the badge family.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { Button, PanelBody } from '@wordpress/components';
import { IconPicker, ResponsiveOverride, SgsLengthControl } from '../../components';

const tierObject = ( value ) => ( value && 'object' === typeof value ? value : {} );

/**
 * @param {Object}   root0
 * @param {Array}    root0.resolvedItems From `useNavMenuSource()` (includes
 *                                       nested sub-items) — filtered here to
 *                                       TOP-LEVEL ONLY, matching what the
 *                                       render path actually paints
 *                                       (sgs_nav_drawer_menu_label_inner() —
 *                                       leaf items and accordion-parent
 *                                       rows, never a nested sub-item link).
 * @param {Object}   root0.attributes    Block attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function TrailingIconPanel( { resolvedItems, attributes, setAttributes } ) {
	const topLevelItems = resolvedItems.filter( ( item ) => 0 === ( item.depth || 0 ) );
	const map = attributes.itemTrailingIcons && 'object' === typeof attributes.itemTrailingIcons
		? attributes.itemTrailingIcons
		: {};

	const setIcon = ( identifier, next ) => {
		const nextMap = { ...map };
		if ( next && ( next.name || next.svg ) ) {
			nextMap[ identifier ] = next;
		} else {
			delete nextMap[ identifier ];
		}
		setAttributes( { itemTrailingIcons: nextMap } );
	};

	return (
		<PanelBody title={ __( 'Trailing icon', 'sgs-blocks' ) } initialOpen={ false }>
			{ 0 === topLevelItems.length && (
				<p>{ __( 'Choose a menu above to set a trailing icon per item.', 'sgs-blocks' ) }</p>
			) }
			{ topLevelItems.map( ( item ) => (
				<div key={ item.identifier } className="sgs-nav-trailing-icon-row">
					<IconPicker
						label={ item.label }
						sources={ [ 'lucide', 'wp-icon', 'dashicon', 'emoji', 'custom' ] }
						value={ map[ item.identifier ] || {} }
						onChange={ ( next ) => setIcon( item.identifier, next ) }
					/>
					{ !! ( map[ item.identifier ]?.name || map[ item.identifier ]?.svg ) && (
						<Button
							variant="link"
							isDestructive
							onClick={ () => setIcon( item.identifier, null ) }
						>
							{ __( 'Remove icon', 'sgs-blocks' ) }
						</Button>
					) }
				</div>
			) ) }
			{ topLevelItems.length > 0 && (
				<ResponsiveOverride
					label={ __( 'Icon size', 'sgs-blocks' ) }
					value={ tierObject( attributes.itemTrailingIconSize ) }
					onChange={ ( obj ) => setAttributes( { itemTrailingIconSize: obj } ) }
				>
					{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
						<SgsLengthControl
							label={ __( 'Icon size', 'sgs-blocks' ) }
							help={ __( 'Applies to every trailing icon. Empty keeps the default 10px.', 'sgs-blocks' ) }
							value={ ownValue || '' }
							placeholder={ inherited ? effectiveValue : '' }
							onChange={ ( val ) => setOwnValue( val || undefined ) }
							presets={ false }
						/>
					) }
				</ResponsiveOverride>
			) }
			<p className="sgs-nav-panel__inspector-note">
				{ __(
					'Icon colour applies to every trailing icon and lives in the Colour panel above.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
