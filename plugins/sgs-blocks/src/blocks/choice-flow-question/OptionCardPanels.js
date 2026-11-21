/**
 * sgs/choice-flow-question: the option card's own look and its parts (Spec 02 FR-2-33): the Styles-tab panels, the
 * colour rows for the block's one `SgsColourPanel`, and the canvas twin of `helpers-option-card-style.php`
 * (`OptionCardStyle`), which paints the preview options with the same values: the option flagged "Selected by
 * default" previews the chosen look.
 *
 * Every setting is unset by default; an unset value adds nothing to the canvas or the page.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	PanelBody,
} from '@wordpress/components';
import {
	ShadowControl,
	SgsBorderControl,
	SgsBoxControl,
	ResponsiveOverride,
	BOX_UNITS,
	normaliseResponsiveBox,
	fillRow,
} from '../../components';
import { colourVar, resolveShadowPreviewComposed, sgsBorderPreview, tierBoxLonghands, usePreviewTier } from '../../utils';

/**
 * One responsive padding box, as sgs/nav-bar-menu's badge padding.
 *
 * @param {Object}   props
 * @param {string}   props.label    Visible label.
 * @param {Object}   props.value    `{ desktop, tablet, mobile }` boxes.
 * @param {Function} props.onChange Receives the next tier object.
 * @return {JSX.Element} The control.
 */
function TierPadding( { label, value, onChange } ) {
	return (
		<ResponsiveOverride value={ value } onChange={ onChange }>
			{ ( { ownValue, setOwnValue } ) => (
				<SgsBoxControl
					label={ label }
					values={ ownValue && 'object' === typeof ownValue ? ownValue : {} }
					units={ BOX_UNITS }
					presets
					onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * The "Option card" panel: border (width, style, colour at rest and on hover, corners), padding and the three shadows.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {JSX.Element} The panel.
 */
export function OptionCardPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Option card', 'sgs-blocks' ) } initialOpen={ false }>
			<SgsBorderControl
				widthValues={ attributes.optionCardBorderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { optionCardBorderWidth: next } ) }
				styleValue={ attributes.optionCardBorderStyle }
				onStyleChange={ ( val ) => setAttributes( { optionCardBorderStyle: val } ) }
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourStates={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: attributes.optionCardColourBorder,
						onChange: ( val ) => setAttributes( { optionCardColourBorder: val ?? '' } ),
						linked: true,
					},
					{
						key: 'hover',
						label: __( 'Hover', 'sgs-blocks' ),
						value: attributes.optionCardColourBorderHover,
						onChange: ( val ) => setAttributes( { optionCardColourBorderHover: val ?? '' } ),
						linked: true,
					},
				] }
				radiusValues={ { base: attributes.optionCardBorderRadius ?? {} } }
				showRadiusResponsive={ false }
				onRadiusChange={ ( _tier, next ) => setAttributes( { optionCardBorderRadius: next } ) }
			/>
			<TierPadding
				label={ __( 'Card padding', 'sgs-blocks' ) }
				value={ attributes.optionCardPadding }
				onChange={ ( obj ) => setAttributes( { optionCardPadding: obj } ) }
			/>
			<ShadowControl
				label={ __( 'Card shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ { base: 'optionCardShadow', colour: 'optionCardShadowColour' } }
			/>
			<ShadowControl
				label={ __( 'Card hover shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ { base: 'optionCardHoverShadow', colour: 'optionCardHoverShadowColour' } }
			/>
			<ShadowControl
				label={ __( 'Chosen card shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ { base: 'optionCardSelectedShadow', colour: 'optionCardSelectedShadowColour' } }
			/>
		</PanelBody>
	);
}

/**
 * The colour rows for the option card, the chosen card, the picture band and the tick.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Array} The rows.
 */
export function optionCardColourRows( { attributes, setAttributes } ) {
	const rows = [
		fillRow( {
			key: 'optionCardFill',
			heading: __( 'Option cards', 'sgs-blocks' ),
			label: __( 'Option card fill', 'sgs-blocks' ),
			attrs: { base: 'optionCardColourBackground', hover: 'optionCardColourBackgroundHover' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'optionCardSelectedFill',
			label: __( 'Chosen card fill', 'sgs-blocks' ),
			attrs: { base: 'optionCardSelectedBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'optionCardSelectedBorder',
			label: __( 'Chosen card border', 'sgs-blocks' ),
			attrs: { base: 'optionCardSelectedBorderColour' },
			attributes,
			setAttributes,
		} ),
	];
	return rows;
}

/**
 * A React style object as CSS text, for the scoped canvas rule.
 *
 * @param {Object} style Style object (camelCase keys, custom properties as-is).
 * @return {string} Declarations; '' when nothing is set.
 */
function cssText( style ) {
	return Object.entries( style )
		.filter( ( [ , value ] ) => undefined !== value && null !== value && '' !== value )
		.map( ( [ key, value ] ) => `${ key.startsWith( '--' ) ? key : key.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ) }:${ value }` )
		.join( ';' );
}

/**
 * The canvas twin of `sgs_choice_flow_question_option_card_css()`: one scoped `<style>` for the preview options.
 *
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @param {string} props.clientId   The block's client id, for the canvas selector.
 * @return {JSX.Element|null} A style element, or null when nothing is set.
 */
export function OptionCardStyle( { attributes, clientId } ) {
	const tier = usePreviewTier();
	const a = attributes;
	const scope = `#block-${ clientId }`;
	const card = `${ scope } .sgs-choice-flow-question__option-preview`;
	const rest = `${ card }:not(.sgs-choice-flow-question__option-preview--selected)`;
	const rules = [
		[
			card,
			{
				...sgsBorderPreview( { widthValues: a.optionCardBorderWidth ?? {}, styleValue: a.optionCardBorderStyle, radiusValues: { base: a.optionCardBorderRadius ?? {} } }, 'desktop' ),
				...tierBoxLonghands( a.optionCardPadding, tier, 'padding' ),
			},
		],
		[
			rest,
			{
				backgroundColor: colourVar( a.optionCardColourBackground ),
				borderColor: colourVar( a.optionCardColourBorder ),
				boxShadow: resolveShadowPreviewComposed( a.optionCardShadow, a.optionCardShadowColour ),
			},
		],
		[
			`${ rest }:hover`,
			{
				backgroundColor: colourVar( a.optionCardColourBackgroundHover ),
				borderColor: colourVar( a.optionCardColourBorderHover ),
				boxShadow: a.optionCardHoverShadow || a.optionCardHoverShadowColour ? resolveShadowPreviewComposed( a.optionCardHoverShadow || a.optionCardShadow, a.optionCardHoverShadowColour || a.optionCardShadowColour ) : undefined,
			},
		],
		[
			`${ card }.sgs-choice-flow-question__option-preview--selected`,
			{
				backgroundColor: colourVar( a.optionCardSelectedBackgroundColour ),
				borderColor: colourVar( a.optionCardSelectedBorderColour ),
				boxShadow: resolveShadowPreviewComposed( a.optionCardSelectedShadow, a.optionCardSelectedShadowColour ),
			},
		],
	];
	const css = rules
		.map( ( [ selector, style ] ) => [ selector, cssText( style ) ] )
		.filter( ( [ , body ] ) => '' !== body )
		.map( ( [ selector, body ] ) => `${ selector }{${ body }}` )
		.join( '' );
	return css ? <style>{ css }</style> : null;
}
