// No `MediaElementPanel` mount, and the `opacity` attribute's dump row is
// seeded as `exempt:true` (see `_dead-controls-dump.json` at the fixture
// root) — proves Part A respects an existing dump exemption rather than
// flagging every controlPresent:false row unconditionally.
export default function Edit() {
	return null;
}
