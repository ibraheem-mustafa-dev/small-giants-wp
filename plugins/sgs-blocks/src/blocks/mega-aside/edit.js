/**
 * SGS Mega Aside — block editor UI.
 *
 * GROUND-TRUTH: verified against .claude/plans/2026-07-24-mega-menu-BUILD-SPEC.md
 * §8 (aside formats) + mega-panel/edit.js's own Aside PanelBody + the shared
 * ResponsiveBoxControl doc-comment for the values/onChange contract.
 *
 * A locked-content side panel: media + tag/eyebrow + heading + text + a
 * call-to-action button. `asideFormat` (feature|preview|cta) is a LIVE control
 * (unlike the parent panel's insert-time-only `variant`, CF-5) — it only
 * changes which of the five fixed children are visible and how they're
 * arranged, never the structure, so switching it live never orphans content.
 *
 * This block owns its own FILL (background/padding/radius/border) — the
 * parent sgs/mega-panel still owns GRID POSITION (width/divider, CF-10). No
 * typography/colour control exists here for any inner element (media/tag/
 * heading/text/button) — that's all child-owned (HC2); a parent duplicate
 * would be dead by CSS specificity against the child's own inline styles.
 *
 * @return {JSX.Element} The block editor UI.
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveBoxControl } from '../../components';

const TEMPLATE = [
	[ 'sgs/media', {} ],
	[
		'sgs/label',
		{ text: __( 'Featured', 'sgs-blocks' ), textColour: 'accent' },
	],
	[
		'sgs/heading',
		{ level: 3, content: __( 'Explore more', 'sgs-blocks' ) },
	],
	[
		'sgs/text',
		{
			text: __(
				'Hover a link to preview it here, or read on to find out more.',
				'sgs-blocks'
			),
		},
	],
	[ 'sgs/button', {} ],
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		asideFormat,
		asideBg,
		asidePadding,
		asideRadius,
		asideBorderColour,
		asideBorderWidth,
	} = attributes;

	const format = asideFormat || 'feature';

	const blockProps = useBlockProps( {
		className: 'sgs-mega-aside',
		'data-aside-format': format,
	} );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
		templateLock: 'all',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Aside', 'sgs-blocks' ) }>
					<ToggleGroupControl
						label={ __( 'Format', 'sgs-blocks' ) }
						help={ __(
							'Feature shows media, a tag, a title, text and a button. Preview swaps its title and text to match whichever link in this menu is being hovered. CTA is a compact pill, text and button with no media.',
							'sgs-blocks'
						) }
						value={ format }
						onChange={ ( value ) =>
							setAttributes( { asideFormat: value || 'feature' } )
						}
						isBlock
						__nextHasNoMarginBottom
					>
						<ToggleGroupControlOption
							value="feature"
							label={ __( 'Feature', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="preview"
							label={ __( 'Preview', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="cta"
							label={ __( 'CTA', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>

					<DesignTokenPicker
						label={ __( 'Background', 'sgs-blocks' ) }
						value={ asideBg }
						onChange={ ( value ) =>
							setAttributes( { asideBg: value || '' } )
						}
						linked
						enableAlpha
						clearable
					/>

					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: asidePadding?.desktop ?? {},
							tablet: asidePadding?.tablet ?? {},
							mobile: asidePadding?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( {
								asidePadding: {
									...asidePadding,
									[ key ]: next,
								},
							} );
						} }
					/>

					<UnitControl
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						value={ asideRadius || '' }
						onChange={ ( value ) =>
							setAttributes( { asideRadius: value || '' } )
						}
						__next40pxDefaultSize
					/>

					<DesignTokenPicker
						label={ __( 'Border colour', 'sgs-blocks' ) }
						value={ asideBorderColour }
						onChange={ ( value ) =>
							setAttributes( { asideBorderColour: value || '' } )
						}
						linked
						clearable
					/>

					<UnitControl
						label={ __( 'Border width', 'sgs-blocks' ) }
						value={ asideBorderWidth || '' }
						onChange={ ( value ) =>
							setAttributes( {
								asideBorderWidth: value || '0px',
							} )
						}
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
