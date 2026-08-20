import { FixtureSharedRowPanel } from '../_components/FixtureSharedRowPanel';

// Mounts the SHARED panel fixture (C4 step 2, 2026-08-20) — proves rule 31
// now reaches a colour row that lives outside this block's own edit.js, the
// blind spot the header used to declare unconditionally. Membership is
// decided purely by the literal JSX tag name below, never by this import
// path resolving — same discipline as the shared component resolver.
export default function Edit( { attributes, setAttributes } ) {
	return <FixtureSharedRowPanel attributes={ attributes } setAttributes={ setAttributes } />;
}
