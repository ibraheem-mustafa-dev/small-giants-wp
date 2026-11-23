"""seed_fixtures.py::entry_for names the sources a seeded fixture came from, and only those."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import seed_fixtures as SF  # noqa: E402


def test_the_note_names_only_the_sources_that_gave_something():
    """MUST FAIL before 2026-11-23: with no fixtures given the note said "from its render paths" whatever the block had,
    and doubled the source when render paths existed."""
    with_paths = SF.entry_for('sgs/x', {}, {'x': {'paths': {'p1': {'attrs': {'a': 1}}}}})['notes']
    assert 'from render-paths.json.' in with_paths and 'its render paths' not in with_paths
    none = SF.entry_for('sgs/x', {}, {})['notes']
    assert 'no curated source' in none and 'render paths' not in none
    given = SF.entry_for('sgs/x', {'sgs/x': {'attributes': {'a': 1}}}, {})['notes']
    assert 'from the fixtures given.' in given
