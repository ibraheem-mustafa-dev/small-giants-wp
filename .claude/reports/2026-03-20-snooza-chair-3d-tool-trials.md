# Snooza Chair 3D model-generation tool trials (2026-03-20/21)

Moved verbatim from `plugins/sgs-configurator-pro/CLAUDE.md` (research history, not current plugin truth).

- **AI model tests (2026-03-20/21):**
  - Tripo AI 3.0 (web UI): 8/10 quality from single photo. Export paywalled ($10/month Pro)
  - Meshy AI (web UI): 7/10 quality. Export also paywalled ($10/month Pro)
  - TripoSR (local, free): 5/10 at 512 marching cubes resolution. Usable for dev/testing, not production
  - Meshroom photogrammetry (local, free): FAILED — reconstructed the man (Randall) instead of the chair. Video frames with a person touching the product are unusable for photogrammetry. Would need dedicated product photos (100+ stills, no person, 3 orbit heights) to work
  - Gate 1 verdict: **PASS** — AI model approach validated. TripoSR 5/10 is usable as dev placeholder. Tripo Pro ($10/month) recommended for production quality
- **Video frame pipeline:** 203 frames extracted from Ophir product video. 3 segments identified. rembg could not separate man from chair (touching). Meshroom cache cleaned up
- **Image sources:** ophirsolutions.co.uk (15 thumbnails + video), fledglings.org.uk, fortunamobility.com
- **Local tools installed:** TripoSR (Python 3.12 venv), Meshroom 2023.3.0, rembg (background removal). All at `C:/Users/Bean/Projects/`
