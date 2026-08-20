import { FixtureCleanSharedRowPanel } from '../_components/FixtureCleanSharedRowPanel';

// Mounts the SHARED, fully conformant panel fixture (C4 step 2, 2026-08-20)
// — the negative control proving the shared-owner walk does not flag a
// conformant row it can reach. Genuinely fails if the walk stops resolving
// SgsColourPanel `rows` correctly in a shared file, or starts flagging a
// conformant row wholesale.
export default function Edit( { attributes, setAttributes } ) {
	return <FixtureCleanSharedRowPanel attributes={ attributes } setAttributes={ setAttributes } />;
}
