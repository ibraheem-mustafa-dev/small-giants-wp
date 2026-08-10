/**
 * MUST NOT FLAG — one non-responsive control, nothing to merge.
 *
 * The floor case. A rule that flags this is asserting every control must be
 * responsive, which contract §12 does not say — the wrapper is required only
 * when the attr family DECLARES Tablet/Mobile siblings.
 */
export default function SingleControlNoTiers( { attributes, setAttributes } ) {
	return (
		<UnitControl
			label="Padding"
			value={ attributes.padding || '' }
			onChange={ ( val ) => setAttributes( { padding: val ?? '' } ) }
		/>
	);
}
