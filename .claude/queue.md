# Cross-track queue

The signal between parallel sessions working the cloning tool plan (`.claude/plans/2026-10-23-cloning-tool-completion.md`, "How the work runs"): one line per event (`- <date> <track> <event> (<detail>)`), appended, committed and pushed at once. Read it before any reseed, deploy, calibration, mirror use, Fill run or framework-DB read, and write a start and an end line around each. It holds only events still running or awaited: a `/handoff` deletes every finished start and end pair (git keeps the history).

