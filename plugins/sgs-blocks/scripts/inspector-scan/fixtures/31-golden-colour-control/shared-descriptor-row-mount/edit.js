import { FixtureSharedDescriptorRowPanel } from '../_components/FixtureSharedDescriptorRowPanel';

// Mounts the SHARED descriptor-row panel fixture — proves rule 31's
// shared-owner walk resolves a `states={ ident.states }` descriptor binding
// the SAME way the per-block walk does. Membership is decided purely by the
// literal JSX tag name, never by the import path resolving.
export default function Edit( { attributes, setAttributes } ) {
	return <FixtureSharedDescriptorRowPanel attributes={ attributes } setAttributes={ setAttributes } />;
}
