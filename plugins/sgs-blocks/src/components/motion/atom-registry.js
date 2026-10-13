/**
 * The motion atom for each schema field type (Spec 38A FR-38A-54): every field type in the schema's `$defs`
 * (`x-sgs-kind: fieldType`) has one atom here, so a panel can draw any field without a raw WordPress control.
 * `tokenReference` is the one type with no atom of its own: it exists only as a branch inside the duration, distance and
 * easing types, which their atoms offer as token choices.
 *
 * @package
 */

import DurationAtom from './DurationAtom';
import EasingAtom from './EasingAtom';
import DistanceAtom from './DistanceAtom';
import AngleAtom from './AngleAtom';
import NumberAtom from './NumberAtom';
import ColourReferenceAtom from './ColourReferenceAtom';
import ChoiceAtom from './ChoiceAtom';
import AssetAtom from './AssetAtom';
import PropertyRowAtom from './PropertyRowAtom';
import BooleanAtom from './BooleanAtom';
import PartReferenceAtom from './PartReferenceAtom';

/** Field type name to its atom component. `ratio`, `scale`, `percentage` and `opacity` share `NumberAtom` (its `type` prop). */
export const ATOM_FOR_FIELD_TYPE = Object.freeze( {
	duration: DurationAtom,
	easing: EasingAtom,
	distance: DistanceAtom,
	angle: AngleAtom,
	ratio: NumberAtom,
	scale: NumberAtom,
	percentage: NumberAtom,
	opacity: NumberAtom,
	colourReference: ColourReferenceAtom,
	assetReference: AssetAtom,
	choice: ChoiceAtom,
	propertyRow: PropertyRowAtom,
	boolean: BooleanAtom,
	partReference: PartReferenceAtom,
} );

/** Field types that appear only inside other field types and so have no atom of their own. */
export const EMBEDDED_FIELD_TYPES = Object.freeze( [ 'tokenReference' ] );
