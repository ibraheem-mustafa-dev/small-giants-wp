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
import { PanelBody, ToggleControl } from '@wordpress/components';
import {
	ShadowControl,
	SgsBorderControl,
	SgsBoxControl,
	SgsLengthControl,
	TierBorderControl,
	ResponsiveOverride,
	BOX_UNITS,
	normaliseResponsiveBox,
	fillRow,
	textRow,
} from '../../components';
import {
	colourVar,
	resolveShadowPreviewComposed,
	sgsBorderPreview,
	tierBoxLonghands,
	usePreviewTier,
} from '../../utils';

/**
 * One responsive padding box, as sgs/nav-bar-menu's badge padding.
 *
 * @param {Object}   props
 * @param {string}   props.label    Visible label.
 * @param {Object}   props.value    `{ desktop, tablet, mobile }` boxes.
 * @param {Function} props.onChange Receives the next tier object.
 * @return {JSX.Element} The control.
 */
export function TierPadding( { label, value, onChange } ) {
	return (
		<ResponsiveOverride label={ label } value={ value } onChange={ onChange }>
			{ ( { ownValue, setOwnValue } ) => (
				<SgsBoxControl
					label={ label }
					values={
						ownValue && 'object' === typeof ownValue ? ownValue : {}
					}
					units={ BOX_UNITS }
					presets
					onChange={ ( next ) =>
						setOwnValue( normaliseResponsiveBox( next ) )
					}
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * The "Option card" panel: border (width, style, one colour swatch whose Normal, Hover and Current tabs are the card at
 * rest, on hover and chosen, corners), padding, the card shadow (Normal and Hover tabs) and the chosen card's shadow.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {JSX.Element} The panel.
 */
export function OptionCardPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody
			title={ __( 'Option card', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SgsBorderControl
				widthValues={ attributes.optionCardBorderWidth ?? {} }
				onWidthChange={ ( next ) =>
					setAttributes( { optionCardBorderWidth: next } )
				}
				styleValue={ attributes.optionCardBorderStyle }
				onStyleChange={ ( val ) =>
					setAttributes( { optionCardBorderStyle: val } )
				}
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourStates={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: attributes.optionCardColourBorder,
						onChange: ( val ) =>
							setAttributes( {
								optionCardColourBorder: val ?? '',
							} ),
						linked: true,
					},
					{
						key: 'hover',
						label: __( 'Hover', 'sgs-blocks' ),
						value: attributes.optionCardColourBorderHover,
						onChange: ( val ) =>
							setAttributes( {
								optionCardColourBorderHover: val ?? '',
							} ),
						linked: true,
					},
					{
						key: 'current',
						label: __( 'Current', 'sgs-blocks' ),
						value: attributes.optionCardSelectedBorderColour,
						onChange: ( val ) =>
							setAttributes( {
								optionCardSelectedBorderColour: val ?? '',
							} ),
						linked: true,
					},
				] }
				radiusValues={ {
					base: attributes.optionCardBorderRadius ?? {},
				} }
				showRadiusResponsive={ false }
				onRadiusChange={ ( _tier, next ) =>
					setAttributes( { optionCardBorderRadius: next } )
				}
			/>
			<TierPadding
				label={ __( 'Card padding', 'sgs-blocks' ) }
				value={ attributes.optionCardPadding }
				onChange={ ( obj ) =>
					setAttributes( { optionCardPadding: obj } )
				}
			/>
			<ShadowControl
				label={ __( 'Card shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ {
					base: 'optionCardShadow',
					colour: 'optionCardShadowColour',
					hover: 'optionCardHoverShadow',
					hoverColour: 'optionCardHoverShadowColour',
				} }
			/>
			{ /* ShadowControl has Normal and Hover states only, so the chosen card's shadow is its own control. */ }
			<ShadowControl
				label={ __( 'Chosen card shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ {
					base: 'optionCardSelectedShadow',
					colour: 'optionCardSelectedShadowColour',
				} }
			/>
		</PanelBody>
	);
}

/**
 * The "Option badge" panel (the option-badge element's label): the badge tag's border per device, its corners and its padding per device.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {JSX.Element} The panel.
 */
export function OptionBadgeBoxPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody
			title={ __( 'Option badge', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<TierBorderControl
				label={ __( 'Badge border', 'sgs-blocks' ) }
				value={ attributes.optionBadgeBorder }
				onChange={ ( next ) =>
					setAttributes( { optionBadgeBorder: next } )
				}
			/>
			<SgsLengthControl
				presets={ false }
				label={ __( 'Badge corner radius', 'sgs-blocks' ) }
				value={ attributes.optionBadgeRadius || '' }
				onChange={ ( val ) =>
					setAttributes( { optionBadgeRadius: val || '' } )
				}
			/>
			<TierPadding
				label={ __( 'Badge padding', 'sgs-blocks' ) }
				value={ attributes.optionBadgePadding }
				onChange={ ( obj ) =>
					setAttributes( { optionBadgePadding: obj } )
				}
			/>
		</PanelBody>
	);
}

/**
 * The "Chosen option tick" panel: the switch, then the disc's size and its distance from the card's corner.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {JSX.Element} The panel.
 */
export function OptionCheckPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody
			title={ __( 'Chosen option tick', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<ToggleControl
				label={ __( 'Show a tick on the chosen option', 'sgs-blocks' ) }
				help={ __(
					'A tick disc in the top corner of the card a shopper picks. Its colours are in the Colour panel.',
					'sgs-blocks'
				) }
				checked={ !! attributes.optionCheckShow }
				onChange={ ( val ) =>
					setAttributes( { optionCheckShow: val } )
				}
				__nextHasNoMarginBottom
			/>
			{ !! attributes.optionCheckShow && (
				<>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Tick size', 'sgs-blocks' ) }
						help={ __( 'Empty keeps 20px.', 'sgs-blocks' ) }
						value={ attributes.optionCheckSize || '' }
						onChange={ ( val ) =>
							setAttributes( { optionCheckSize: val || '' } )
						}
					/>
					<SgsLengthControl
						presets={ false }
						label={ __(
							'Tick distance from the corner',
							'sgs-blocks'
						) }
						help={ __( 'Empty keeps 0.5rem.', 'sgs-blocks' ) }
						value={ attributes.optionCheckInset || '' }
						onChange={ ( val ) =>
							setAttributes( { optionCheckInset: val || '' } )
						}
					/>
				</>
			) }
		</PanelBody>
	);
}

/**
 * The colour rows for the option card (its Current tab is the chosen card), the picture band and the tick.
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
			attrs: {
				base: 'optionCardColourBackground',
				hover: 'optionCardColourBackgroundHover',
				current: 'optionCardSelectedBackgroundColour',
			},
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'optionMediaBand',
			label: __( 'Picture band', 'sgs-blocks' ),
			attrs: { base: 'optionMediaBackground' },
			attributes,
			setAttributes,
		} ),
	];
	if ( attributes.optionCheckShow ) {
		rows.push(
			fillRow( {
				key: 'optionCheckDisc',
				label: __( 'Chosen option tick disc', 'sgs-blocks' ),
				attrs: { base: 'optionCheckBackgroundColour' },
				attributes,
				setAttributes,
			} ),
			textRow( {
				key: 'optionCheckMark',
				label: __( 'Chosen option tick', 'sgs-blocks' ),
				attrs: { base: 'optionCheckColour' },
				attributes,
				setAttributes,
			} )
		);
	}
	return rows;
}

/**
 * A React style object as CSS text, for the scoped canvas rule.
 *
 * @param {Object} style Style object (camelCase keys, custom properties as-is).
 * @return {string} Declarations; '' when nothing is set.
 */
export function cssText( style ) {
	return Object.entries( style )
		.filter(
			( [ , value ] ) =>
				undefined !== value && null !== value && '' !== value
		)
		.map(
			( [ key, value ] ) =>
				`${
					key.startsWith( '--' )
						? key
						: key.replace(
								/[A-Z]/g,
								( c ) => `-${ c.toLowerCase() }`
						  )
				}:${ value }`
		)
		.join( ';' );
}

/**
 * The badge border for one previewed device: each member a device leaves empty takes the wider device's, as
 * `sgs_tiered_border_specs` cascades it on the page.
 *
 * @param {Object} border `{ desktop, tablet, mobile }` of `{ width, style, colour }`.
 * @param {string} tier   The previewed device.
 * @return {Object} Style object.
 */
export function tierBorderPreview( border, tier ) {
	const source = border && 'object' === typeof border ? border : {};
	const order = [ 'desktop', 'tablet', 'mobile' ].slice(
		0,
		[ 'desktop', 'tablet', 'mobile' ].indexOf( tier ) + 1
	);
	const merged = {};
	order.forEach( ( device ) => {
		Object.entries( source[ device ] || {} ).forEach(
			( [ member, value ] ) => {
				if ( value ) {
					merged[ member ] = value;
				}
			}
		);
	} );
	return {
		borderWidth: merged.width,
		borderStyle: [ 'none', 'solid', 'dashed', 'dotted' ].includes(
			merged.style
		)
			? merged.style
			: undefined,
		borderColor: colourVar( merged.colour ),
	};
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
	const scope = `#block-${ clientId }`;
	const card = `${ scope } .sgs-choice-flow-question__option-preview`;
	const rest = `${ card }:not(.sgs-choice-flow-question__option-preview--selected)`;
	const rules = [
		[
			card,
			{
				...sgsBorderPreview(
					{
						widthValues: attributes.optionCardBorderWidth ?? {},
						styleValue: attributes.optionCardBorderStyle,
						radiusValues: {
							base: attributes.optionCardBorderRadius ?? {},
						},
					},
					'desktop'
				),
				...tierBoxLonghands(
					attributes.optionCardPadding,
					tier,
					'padding'
				),
			},
		],
		[
			rest,
			{
				backgroundColor: colourVar(
					attributes.optionCardColourBackground
				),
				borderColor: colourVar( attributes.optionCardColourBorder ),
				boxShadow: resolveShadowPreviewComposed(
					attributes.optionCardShadow,
					attributes.optionCardShadowColour
				),
			},
		],
		[
			`${ rest }:hover`,
			{
				backgroundColor: colourVar(
					attributes.optionCardColourBackgroundHover
				),
				borderColor: colourVar(
					attributes.optionCardColourBorderHover
				),
				boxShadow:
					attributes.optionCardHoverShadow ||
					attributes.optionCardHoverShadowColour
						? resolveShadowPreviewComposed(
								attributes.optionCardHoverShadow ||
									attributes.optionCardShadow,
								attributes.optionCardHoverShadowColour ||
									attributes.optionCardShadowColour
						  )
						: undefined,
			},
		],
		[
			`${ card }.sgs-choice-flow-question__option-preview--selected`,
			{
				backgroundColor: colourVar(
					attributes.optionCardSelectedBackgroundColour
				),
				borderColor: colourVar(
					attributes.optionCardSelectedBorderColour
				),
				boxShadow: resolveShadowPreviewComposed(
					attributes.optionCardSelectedShadow,
					attributes.optionCardSelectedShadowColour
				),
			},
		],
		[
			`${ scope } .sgs-choice-flow-question__option-badge`,
			{
				...tierBorderPreview( attributes.optionBadgeBorder, tier ),
				borderRadius: attributes.optionBadgeRadius || undefined,
				...tierBoxLonghands(
					attributes.optionBadgePadding,
					tier,
					'padding'
				),
			},
		],
		[
			`${ scope } .sgs-choice-flow-question__option-media`,
			{ backgroundColor: colourVar( attributes.optionMediaBackground ) },
		],
	];
	if ( attributes.optionCheckShow ) {
		rules.push(
			[ card, { position: 'relative' } ],
			[
				`${ card }--selected > .sgs-choice-flow-question__option-check`,
				{ display: 'block' },
			],
			[
				`${ scope } .sgs-choice-flow-question__option-check`,
				{
					color: colourVar( attributes.optionCheckColour ),
					backgroundColor: colourVar(
						attributes.optionCheckBackgroundColour
					),
					'--sgs-cfq-check-size':
						attributes.optionCheckSize || undefined,
					top: attributes.optionCheckInset || undefined,
					insetInlineEnd: attributes.optionCheckInset || undefined,
				},
			]
		);
	}
	const css = rules
		.map( ( [ selector, style ] ) => [ selector, cssText( style ) ] )
		.filter( ( [ , body ] ) => '' !== body )
		.map( ( [ selector, body ] ) => `${ selector }{${ body }}` )
		.join( '' );
	return css ? <style>{ css }</style> : null;
}
