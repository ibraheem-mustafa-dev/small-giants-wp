/**
 * "Short format" extension for the core Post Time to Read block.
 *
 * Adds `sgsShortFormat` (boolean, default false) to `core/post-time-to-read` ONLY. On, the frontend
 * prints "2 min read" (or "2–3 min read" as a range) instead of "2 minutes"; the rewrite is done by
 * includes/post-time-to-read-short.php.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const TARGET_BLOCK_NAME = 'core/post-time-to-read';

/** Guard against double registration. */
if ( ! window.__sgsPostTimeToReadShortRegistered ) {
	window.__sgsPostTimeToReadShortRegistered = true;

	addFilter(
		'blocks.registerBlockType',
		'sgs/post-time-to-read-short/attributes',
		( settings, name ) => {
			if ( TARGET_BLOCK_NAME !== name ) {
				return settings;
			}
			return {
				...settings,
				attributes: {
					...settings.attributes,
					sgsShortFormat: { type: 'boolean', default: false },
				},
			};
		}
	);

	const withShortFormatControl = createHigherOrderComponent(
		( BlockEdit ) => ( props ) => {
			if ( TARGET_BLOCK_NAME !== props.name ) {
				return <BlockEdit { ...props } />;
			}
			const { attributes, setAttributes } = props;
			return (
				<>
					<BlockEdit { ...props } />
					<InspectorControls>
						<PanelBody title={ __( 'Reading time format', 'sgs-blocks' ) } initialOpen>
							<ToggleControl
								label={ __( 'Short format (e.g. 2 min read)', 'sgs-blocks' ) }
								checked={ !! attributes.sgsShortFormat }
								onChange={ ( val ) => setAttributes( { sgsShortFormat: !! val } ) }
								__nextHasNoMarginBottom
							/>
						</PanelBody>
					</InspectorControls>
				</>
			);
		},
		'withSgsShortFormatControl'
	);

	addFilter( 'editor.BlockEdit', 'sgs/post-time-to-read-short/control', withShortFormatControl );
}
