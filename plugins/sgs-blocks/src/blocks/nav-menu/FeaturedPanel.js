import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl, SelectControl } from '@wordpress/components';
import { SgsLengthControl } from '../../components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: "Featured" PanelBody (featured
 * item checklist, corner radius, font weight).
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim JSX.
 * Text/background colour (Normal + Hover) lives in the top-level
 * SgsColourPanel (D618/D609), unchanged by this split.
 *
 * ⚠ REUSE LEVER IDENTIFIED, NOT APPLIED (owner ruling 7 / .claude/verify/
 * spec-41-reuse-ledger.md) — `featuredFontWeight`/`featuredFontWeightHover`
 * below use a hand-rolled 4-option array where the shared
 * `SGS_FONT_WEIGHT_OPTIONS` (`src/components/TypographyControls.js`) exists.
 * NOT swapped in this step: this step is a PURE REFACTOR (zero control/
 * attribute/default change), and swapping in the shared option list would
 * widen the SelectControl's available choices — a real behaviour change,
 * not a refactor. Left as a named, deferred fix rather than risked here.
 *
 * @param {Object}   root0                        Props.
 * @param {number}   root0.menuRef                The block's `ref` attribute (menu id).
 *                                                 Named `menuRef`, NOT `ref` — see
 *                                                 SettingsPanels.js's docblock for why.
 * @param {Array}    root0.resolvedItems           From useNavMenuSource().
 * @param {Function} root0.toggleFeatured          From useNavMenuSource().
 * @param {string[]} root0.featuredItemIds         The block's `featuredItemIds` attribute.
 * @param {Function} root0.setAttributes           The block's attribute setter.
 * @param {number}   root0.featuredRadius          The block's `featuredRadius` attribute.
 * @param {number}   root0.featuredRadiusHover     The block's `featuredRadiusHover` attribute.
 * @param {number}   root0.featuredFontWeight      The block's `featuredFontWeight` attribute.
 * @param {number}   root0.featuredFontWeightHover The block's `featuredFontWeightHover` attribute.
 */
export default function FeaturedPanel( {
	menuRef,
	resolvedItems,
	toggleFeatured,
	featuredItemIds,
	setAttributes,
	featuredRadius,
	featuredRadiusHover,
	featuredFontWeight,
	featuredFontWeightHover,
} ) {
	return (
		<PanelBody title={ __( 'Featured', 'sgs-blocks' ) } initialOpen={ false }>
			{ 0 === menuRef && (
				<p>
					{ __(
						'Choose a specific menu above to pick which items are featured.',
						'sgs-blocks'
					) }
				</p>
			) }
			{ 0 !== menuRef && 0 === resolvedItems.length && (
				<p>
					{ __(
						'This menu has no top-level items yet.',
						'sgs-blocks'
					) }
				</p>
			) }
			{ resolvedItems.map( ( item ) => (
				/*
				 * Nested items are indented so the list reads as the menu's
				 * own shape. Children appear at all now — the list was
				 * top-level only, which made render.php's featured-child
				 * support unreachable from the editor.
				 */
				<div
					key={ item.identifier }
					style={ {
						marginLeft: `${ ( item.depth || 0 ) * 20 }px`,
					} }
				>
					<CheckboxControl
						label={ item.label }
						checked={ ( featuredItemIds || [] ).includes(
							item.identifier
						) }
						onChange={ ( checked ) =>
							toggleFeatured( item.identifier, checked )
						}
						__nextHasNoMarginBottom
					/>
				</div>
			) ) }

			{ /* Text/background colour (Normal + Hover) moved to the
			   top-level SgsColourPanel (D618/D609). Radius and font
			   weight are not colours, so they stay here as plain
			   Normal/Hover pairs. */ }
			<SgsLengthControl
				label={ __( 'Corner radius', 'sgs-blocks' ) }
				value={ `${ featuredRadius }px` }
				units={ [ { value: 'px', label: 'px', default: 8 } ] }
				onChange={ ( val ) =>
					setAttributes( { featuredRadius: parseFloat( val ) || 0 } )
				}
				presets={ false }
			/>
			<SgsLengthControl
				label={ __( 'Corner radius on hover', 'sgs-blocks' ) }
				value={ `${ featuredRadiusHover ?? featuredRadius }px` }
				units={ [ { value: 'px', label: 'px', default: 8 } ] }
				onChange={ ( val ) =>
					setAttributes( { featuredRadiusHover: parseFloat( val ) || 0 } )
				}
				presets={ false }
			/>
			<SelectControl
				label={ __( 'Font weight', 'sgs-blocks' ) }
				value={ String( featuredFontWeight ) }
				options={ [
					{ label: 'Regular', value: '400' },
					{ label: 'Medium', value: '500' },
					{ label: 'Semi-bold', value: '600' },
					{ label: 'Bold', value: '700' },
				] }
				onChange={ ( val ) =>
					setAttributes( { featuredFontWeight: parseInt( val, 10 ) } )
				}
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Font weight on hover', 'sgs-blocks' ) }
				value={ String( featuredFontWeightHover ?? featuredFontWeight ) }
				options={ [
					{ label: 'Regular', value: '400' },
					{ label: 'Medium', value: '500' },
					{ label: 'Semi-bold', value: '600' },
					{ label: 'Bold', value: '700' },
				] }
				onChange={ ( val ) =>
					setAttributes( { featuredFontWeightHover: parseInt( val, 10 ) } )
				}
				__next40pxDefaultSize
			/>
			<p className="sgs-nav-menu__inspector-note">
				{ __(
					'Applies to the items ticked under Settings → Featured items. Set a background to render them as a filled pill; leave it empty for a coloured label. The text colour is checked for contrast against the background and falls back to a readable one if it would be hard to read.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
