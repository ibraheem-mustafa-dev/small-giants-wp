/**
 * Media block canvas: Lottie mode (poster with a badge; the editor never plays the animation, which is a Lottie effect
 * layer in the Motion panel).
 */
import { __ } from '@wordpress/i18n';

export default function LottieCanvas( { blockProps, inspectorControls, thumbnail } ) {
	const posterUrl = thumbnail || '';
	return (
		<div { ...blockProps }>
			{ inspectorControls }
			{ thumbnail ? (
				<div className="sgs-media-el sgs-media__lottie-preview" style={ { position: 'relative' } }>
					<img
						src={ posterUrl }
						alt=""
						aria-hidden="true"
						style={ { display: 'block', maxWidth: '100%', height: 'auto' } }
					/>
					<span
						className="sgs-media__lottie-badge"
						aria-hidden="true"
						style={ {
							position: 'absolute',
							top: '8px',
							left: '8px',
							padding: '2px 6px',
							fontSize: '10px',
							fontWeight: 600,
							letterSpacing: '0.05em',
							background: 'rgba(0,0,0,0.7)',
							color: '#fff',
							borderRadius: '2px',
						} }
					>
						{ __( 'LOTTIE', 'sgs-blocks' ) }
					</span>
				</div>
			) : (
				<div className="components-placeholder">
					<div className="components-placeholder__label">
						{ __( 'SGS Media — Lottie animation', 'sgs-blocks' ) }
					</div>
					<div className="components-placeholder__instructions">
						{ __(
							'Add a poster image in the block settings panel, then add a Lottie layer in the Motion panel.',
							'sgs-blocks'
						) }
					</div>
				</div>
			) }
		</div>
	);
}
