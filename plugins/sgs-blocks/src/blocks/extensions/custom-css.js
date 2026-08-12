/**
 * Custom CSS extension - adds a textarea to the block inspector
 * allowing per-block scoped CSS rules.
 *
 * The CSS is scoped automatically to `.sgs-custom-{uniqueId}` on the
 * block wrapper, preventing style leakage between blocks.
 *
 * Server-side: includes/custom-css.php handles output and scoping.
 *
 * Also disables WordPress core's native `customCSS` block support
 * (WP 7.0+, https://make.wordpress.org/core/2026/03/15/custom-css-for-individual-block-instances-in-wordpress-7-0/).
 * That native support auto-enables on any block declaring color/typography/
 * spacing/border supports (i.e. effectively every sgs/* and core block) and
 * renders its OWN "Additional CSS" textarea in the same Advanced panel,
 * writing to `attributes.style.css` — a DIFFERENT attribute our pipeline
 * (includes/custom-css.php, Spec 32 FR-32-4) never reads. Left enabled it
 * produced two visually adjacent CSS controls ("Additional CSS" then
 * "Custom CSS") bound to two unrelated attributes — proven live 2026-08-03
 * by writing to the native control and reading block attributes:
 * `attributes.style.css` populated, `attributes.sgsCustomCss` untouched.
 * `sgsCustomCss` is the one load-bearing attribute (the cloning pipeline's
 * residual-band passthrough, Spec 31 FR-31-5.2) — never remove it. Disabling
 * the native support here, not deleting our own control.
 */
import { addFilter } from '@wordpress/hooks';
import { PanelBody, TextareaControl } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';
import { SgsAdvancedTabBottomDestination } from './inspector-tab-routing';

// Add `sgsCustomCss` attribute to every block, and disable WP core's own
// native `customCSS` block support (see file header) so only one CSS control
// appears in the Advanced panel, bound to the one attribute our pipeline reads.
function addCustomCssAttribute( settings ) {
	if ( ! settings.attributes ) {
		return settings;
	}
	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsCustomCss: { type: 'string', default: '' },
		},
		supports: {
			...settings.supports,
			customCSS: false,
		},
	};
}
addFilter(
	'blocks.registerBlockType',
	'sgs/custom-css-attribute',
	addCustomCssAttribute
);

// Add the textarea to every block's inspector Advanced panel.
const withCustomCssControl = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { name, attributes, setAttributes, isSelected } = props;
		const { sgsCustomCss } = attributes;

		return (
			<>
				<BlockEdit { ...props } />
				{ isSelected && (
					<SgsAdvancedTabBottomDestination name={ name }>
						<PanelBody
							title={ __( 'Custom CSS', 'sgs-blocks' ) }
							initialOpen={ false }
						>
							<TextareaControl
								label={ __( 'Custom CSS', 'sgs-blocks' ) }
								hideLabelFromVision
								help={ __(
									'CSS rules applied to this block only. Use & selector to target the block wrapper.',
									'sgs-blocks'
								) }
								value={ sgsCustomCss || '' }
								onChange={ ( val ) =>
									setAttributes( { sgsCustomCss: val } )
								}
								rows={ 6 }
								__nextHasNoMarginBottom
							/>
						</PanelBody>
					</SgsAdvancedTabBottomDestination>
				) }
			</>
		);
	};
}, 'withCustomCssControl' );

addFilter(
	'editor.BlockEdit',
	'sgs/custom-css-control',
	withCustomCssControl
);

// Save filter - attribute is stored in block comment markup by default.
function saveCustomCssAttribute( extraProps ) {
	return extraProps;
}
addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/custom-css-save',
	saveCustomCssAttribute
);
