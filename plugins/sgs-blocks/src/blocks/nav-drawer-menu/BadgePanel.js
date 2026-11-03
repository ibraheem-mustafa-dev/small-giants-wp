/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu): Styles tab "Badge" PanelBody.
 *
 * A badge's words come from the menu item's Description field. Here each top-level item can be set to badge tone A or
 * B (`itemBadgeTones`, `{ [item identifier]: 'a' | 'b' }`, the identifier scheme of `itemTrailingIcons`), the two
 * tones carry their own background and text colour, every badge can take a per-device border (`badgeBorder`) and an
 * opacity (`itemBadgeOpacity`, over the stylesheet's 0.65). Rendered by `includes/nav-drawer-menu-parity-css.php` and
 * `includes/nav-menu-markup.php::sgs_nav_shared_badge_html`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { DesignTokenPicker, TierBorderControl } from '../../components';

/**
 * @param {Object}   props               Props.
 * @param {Array}    props.resolvedItems From `useNavMenuSource()`, filtered here to top-level items (the rows that paint a badge).
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The panel.
 */
export default function BadgePanel( { resolvedItems, attributes, setAttributes } ) {
	const topLevelItems = resolvedItems.filter( ( item ) => 0 === ( item.depth || 0 ) );
	const tones = attributes.itemBadgeTones && 'object' === typeof attributes.itemBadgeTones ? attributes.itemBadgeTones : {};

	const setTone = ( identifier, tone ) => {
		const next = { ...tones };
		if ( 'a' === tone || 'b' === tone ) {
			next[ identifier ] = tone;
		} else {
			delete next[ identifier ];
		}
		setAttributes( { itemBadgeTones: next } );
	};

	const colourPicker = ( label, attr ) => (
		<DesignTokenPicker
			label={ label }
			states={ [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes[ attr ] || '',
					onChange: ( value ) => setAttributes( { [ attr ]: value || '' } ),
				},
			] }
		/>
	);

	const opacity = '' === ( attributes.itemBadgeOpacity ?? '' ) ? undefined : Number( attributes.itemBadgeOpacity );

	return (
		<PanelBody title={ __( 'Badge', 'sgs-blocks' ) } initialOpen={ false }>
			{ 0 === topLevelItems.length && <p>{ __( 'Choose a menu above to set a badge tone per item.', 'sgs-blocks' ) }</p> }
			{ topLevelItems.map( ( item ) => (
				<SelectControl
					key={ item.identifier }
					label={ item.label }
					help={ __( 'Badge tone', 'sgs-blocks' ) }
					value={ tones[ item.identifier ] || '' }
					options={ [
						{ label: __( 'Default badge colours', 'sgs-blocks' ), value: '' },
						{ label: __( 'Tone A', 'sgs-blocks' ), value: 'a' },
						{ label: __( 'Tone B', 'sgs-blocks' ), value: 'b' },
					] }
					onChange={ ( tone ) => setTone( item.identifier, tone ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) ) }
			{ colourPicker( __( 'Tone A background', 'sgs-blocks' ), 'badgeColourA' ) }
			{ colourPicker( __( 'Tone A text', 'sgs-blocks' ), 'badgeTextColourA' ) }
			{ colourPicker( __( 'Tone B background', 'sgs-blocks' ), 'badgeColourB' ) }
			{ colourPicker( __( 'Tone B text', 'sgs-blocks' ), 'badgeTextColourB' ) }
			<TierBorderControl
				label={ __( 'Badge border', 'sgs-blocks' ) }
				value={ attributes.badgeBorder }
				onChange={ ( next ) => setAttributes( { badgeBorder: next } ) }
			/>
			<RangeControl
				label={ __( 'Badge opacity', 'sgs-blocks' ) }
				help={ __( 'Empty keeps the default, 0.65.', 'sgs-blocks' ) }
				value={ opacity }
				min={ 0 }
				max={ 1 }
				step={ 0.05 }
				allowReset
				resetFallbackValue={ undefined }
				onChange={ ( value ) => setAttributes( { itemBadgeOpacity: undefined === value ? '' : String( value ) } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
