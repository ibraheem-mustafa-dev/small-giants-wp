import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, RangeControl, Notice } from '@wordpress/components';

/**
 * DECORATIVE-ONLY roster (Spec 38 FR-38-27 / D447). Every entry here renders
 * with no operable control and no must-read body copy, which is what
 * dissolves WCAG 2.5.7 for this block: nothing a user must reach is ever
 * throwable, so no discrete single-pointer alternative is owed. Do NOT add a
 * block that can carry a link, button, form field, or primary body copy —
 * if you find yourself reaching for one, that is this constraint firing as
 * intended, not a gap to patch.
 */
const ALLOWED_BLOCKS = [
	'core/image',
	'sgs/media',
	'sgs/icon',
	'sgs/decorative-image',
];

export default function Edit( { attributes, setAttributes } ) {
	const { physicsGravity, physicsBounce, physicsEdgeResistance } = attributes;

	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		templateLock: false,
		renderAppender: undefined,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Physics', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<Notice status="info" isDismissible={ false }>
						{ __(
							"Physics run on the live site only — the editor always shows the resting layout. Under a visitor's reduced-motion setting, physics turn off and every body stays put where you placed it.",
							'sgs-blocks'
						) }
					</Notice>
					<RangeControl
						label={ __( 'Gravity', 'sgs-blocks' ) }
						help={ __(
							'How fast a thrown body falls once released.',
							'sgs-blocks'
						) }
						value={ physicsGravity }
						onChange={ ( value ) =>
							setAttributes( { physicsGravity: value } )
						}
						min={ 0 }
						max={ 4000 }
						step={ 50 }
					/>
					<RangeControl
						label={ __( 'Bounce', 'sgs-blocks' ) }
						help={ __(
							'How much energy a body keeps when it hits the edge of the canvas.',
							'sgs-blocks'
						) }
						value={ physicsBounce }
						onChange={ ( value ) =>
							setAttributes( { physicsBounce: value } )
						}
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
					/>
					<RangeControl
						label={ __( 'Drag resistance', 'sgs-blocks' ) }
						help={ __(
							'How firmly the canvas edge resists a body being dragged past it.',
							'sgs-blocks'
						) }
						value={ physicsEdgeResistance }
						onChange={ ( value ) =>
							setAttributes( { physicsEdgeResistance: value } )
						}
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...innerBlocksProps }>
				<p className="wp-block-sgs-physics-canvas__editor-notice">
					{ __(
						'Decorative content only — images, media and icons. No links, buttons or body text (they would have no keyboard/reduced-motion alternative once thrown).',
						'sgs-blocks'
					) }
				</p>
				{ innerBlocksProps.children }
			</div>
		</>
	);
}
