// Deliberately hand-rolled: this block declares `supports.sgs.mediaElements`
// but never mounts the real runtime dispatcher (`MediaElementPanel`), so the
// atom-injected `opacity` attribute has no way for the client to set it.
export default function Edit() {
	return null;
}
