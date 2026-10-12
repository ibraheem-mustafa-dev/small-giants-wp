import { DurationControl, EasingControl } from '../../../../components/motion';
import { validateDuration, validateEasing } from '../../../../components/motion/field-types';

// Not a sanitiser: Math.min( Math.max( sgsMotion.duration ) ) here is only prose in a comment.
export function AtomsPanel( { attributes, setAttributes } ) {
	const hover = attributes.sgsMotion.elements.root.hover;
	const duration = validateDuration( hover.duration );
	const doubled = duration.value * 2;
	return (
		<>
			<DurationControl value={ duration } onChange={ ( v ) => setAttributes( { sgsMotion: { duration: v } } ) } />
			<EasingControl value={ validateEasing( hover.easing ) } label={ `Doubled ${ doubled }` } />
		</>
	);
}
