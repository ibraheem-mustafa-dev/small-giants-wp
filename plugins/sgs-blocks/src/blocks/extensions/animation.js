/**
 * Animation extension — injects scroll-triggered animation controls
 * into ALL sgs/* blocks via WordPress filters.
 *
 * Adds three attributes (sgsAnimation, sgsAnimationDelay, sgsAnimationDuration)
 * and outputs them as data-* attributes on the saved markup. The frontend
 * IntersectionObserver reads these and triggers CSS transitions.
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AnimationControl } from '../../components';

/**
 * Human-readable labels for each animation type.
 * Used in the editor indicator badge.
 */
const ANIMATION_LABELS = {
	'none':        __( 'None', 'sgs-blocks' ),
	'fade-up':     __( 'Fade Up', 'sgs-blocks' ),
	'fade-down':   __( 'Fade Down', 'sgs-blocks' ),
	'fade-in':     __( 'Fade In', 'sgs-blocks' ),
	'fade-left':   __( 'Fade Left', 'sgs-blocks' ),
	'fade-right':  __( 'Fade Right', 'sgs-blocks' ),
	'slide-up':    __( 'Slide Up', 'sgs-blocks' ),
	'slide-down':  __( 'Slide Down', 'sgs-blocks' ),
	'slide-left':  __( 'Slide Left', 'sgs-blocks' ),
	'slide-right': __( 'Slide Right', 'sgs-blocks' ),
	'scale-in':    __( 'Scale In', 'sgs-blocks' ),
	'scale-out':   __( 'Scale Out', 'sgs-blocks' ),
	'rotate-in':   __( 'Rotate In', 'sgs-blocks' ),
	'flip-in':     __( 'Flip In', 'sgs-blocks' ),
	'blur-in':     __( 'Blur In', 'sgs-blocks' ),
	'bounce-in':   __( 'Bounce In', 'sgs-blocks' ),
	'reveal-up':   __( 'Reveal Up', 'sgs-blocks' ),
};

/**
 * Core blocks that support the animation extension.
 */
const CORE_ANIMATION_BLOCKS = [
	'core/group',
	'core/columns',
	'core/cover',
	'core/image',
];

/**
 * Inner/child blocks that should NOT show the animation panel.
 * These are never scroll targets — only their parents are.
 */
const ANIMATION_DENYLIST = [
	'sgs/tab',
	'sgs/accordion-item',
	'sgs/form-step',
	'sgs/form-review',
	'sgs/form-field-text',
	'sgs/form-field-email',
	'sgs/form-field-phone',
	'sgs/form-field-textarea',
	'sgs/form-field-checkbox',
	'sgs/form-field-radio',
	'sgs/form-field-select',
	'sgs/form-field-tiles',
	'sgs/form-field-file',
	'sgs/form-field-consent',
];

function shouldHaveAnimation( name ) {
	if ( ANIMATION_DENYLIST.includes( name ) ) {
		return false;
	}
	return name.startsWith( 'sgs/' ) || CORE_ANIMATION_BLOCKS.includes( name );
}

function addAnimationAttributes( settings, name ) {
	if ( ! shouldHaveAnimation( name ) ) {
		return settings;
	}

	// Preserve per-block defaults declared in block.json.
	// If a block explicitly sets a default (even '' or false), it wins over the
	// extension fallback. Only undefined falls through to the extension default.
	const existingAnimation = settings.attributes?.sgsAnimation?.default;
	const existingDelay     = settings.attributes?.sgsAnimationDelay?.default;
	const existingDuration  = settings.attributes?.sgsAnimationDuration?.default;
	const existingEasing    = settings.attributes?.sgsAnimationEasing?.default;

	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsAnimation:         { type: 'string', default: existingAnimation     ?? 'none' },
			sgsAnimationDelay:    { type: 'string', default: existingDelay         ?? '0' },
			sgsAnimationDuration: { type: 'string', default: existingDuration      ?? 'medium' },
			sgsAnimationEasing:   { type: 'string', default: existingEasing        ?? 'default' },
		},
	};
}

/**
 * Guard against double registration.
 *
 * This file is the canonical source — imported only by extensions/index.js.
 * The container block previously also imported it directly, which caused
 * addFilter('editor.BlockEdit', ...) to run twice (one per webpack bundle),
 * producing two Animation panels in the inspector on every sgs/* block.
 * That direct import was removed (D148 / 2026-06-02) — the guard is kept
 * as a defensive measure in case the dual-import is accidentally re-introduced.
 *
 * Matches the identical pattern in responsive-visibility.js and parallax.js.
 */
if ( ! window.__sgsAnimationRegistered ) {
window.__sgsAnimationRegistered = true;

addFilter(
	'blocks.registerBlockType',
	'sgs/animation-attributes',
	addAnimationAttributes
);

const withAnimationControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		if ( ! shouldHaveAnimation( props.name ) ) {
			return <BlockEdit { ...props } />;
		}

		const { attributes, setAttributes } = props;

		const hasAnimation =
			attributes.sgsAnimation && attributes.sgsAnimation !== 'none';
		const animationLabel =
			ANIMATION_LABELS[ attributes.sgsAnimation ] ||
			attributes.sgsAnimation;

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'Animation', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						{ hasAnimation && (
							<Notice
								status="info"
								isDismissible={ false }
								style={ { marginBottom: '12px' } }
							>
								{ __(
									'Will animate on scroll: ',
									'sgs-blocks'
								) }
								<strong>{ animationLabel }</strong>
								{ attributes.sgsAnimationDelay &&
									attributes.sgsAnimationDelay !== '0' && (
										<>
											{ ' — ' }
											{ __(
												'delay',
												'sgs-blocks'
											) }{ ' ' }
											<strong>
												{ attributes.sgsAnimationDelay }
												ms
											</strong>
										</>
									) }
							</Notice>
						) }
						<AnimationControl
							animation={ attributes.sgsAnimation }
							animationDelay={ attributes.sgsAnimationDelay }
							animationDuration={
								attributes.sgsAnimationDuration
							}
							animationEasing={
								attributes.sgsAnimationEasing
							}
							onChangeAnimation={ ( val ) =>
								setAttributes( { sgsAnimation: val } )
							}
							onChangeDelay={ ( val ) =>
								setAttributes( { sgsAnimationDelay: val } )
							}
							onChangeDuration={ ( val ) =>
								setAttributes( {
									sgsAnimationDuration: val,
								} )
							}
							onChangeEasing={ ( val ) =>
								setAttributes( {
									sgsAnimationEasing: val,
								} )
							}
						/>
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withAnimationControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/animation-controls',
	withAnimationControls
);

function addAnimationSaveProps( props, blockType, attributes ) {
	if ( ! shouldHaveAnimation( blockType.name ) ) {
		return props;
	}

	if ( attributes.sgsAnimation && attributes.sgsAnimation !== 'none' ) {
		return {
			...props,
			'data-sgs-animation': attributes.sgsAnimation,
			'data-sgs-animation-delay': attributes.sgsAnimationDelay || '0',
			'data-sgs-animation-duration':
				attributes.sgsAnimationDuration || 'medium',
			'data-sgs-animation-easing':
				attributes.sgsAnimationEasing || 'default',
		};
	}

	return props;
}

addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/animation-save-props',
	addAnimationSaveProps
);

} // end guard: window.__sgsAnimationRegistered
