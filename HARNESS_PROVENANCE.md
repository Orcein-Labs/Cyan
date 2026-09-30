# Cyan Harness — provenance and scope

**Born:** 2026-09-30, extracted from `Palette` @ `8eeadd6a8` (branch `rpd-rsi-shadow`).
**What this repo is:** the Cyan harness — the long-horizon agentic engineering
chassis (Node/TypeScript, pi-derived): `prime-agent-runtime`, `packages/`
(agent, ai, coding-agent, tui), `modes/`, `subharness/`, driver/release
machinery in `scripts/`, CI (`.github`), hooks (`.husky`), packaging and
release scripts, and the repo-level docs/config that belong to the harness
itself.

**What this repo is NOT:** the Palette operator surface. Palette (its own
repo, symlinked into `Project Cyan/` as `Palette(Cyan's operator surface)`)
owns the persistent Julia kernel (`src/Neura.jl`, `host/`, `security/`),
CyanTunnel, Buffys Lab, and the research record (`docs/research/`).
`scripts/ijulia_test_harness.jl`, `scripts/real_ijulia_proof.py`,
`scripts/lab_suite.sh` etc. are harness-side *drivers* of the surface — they
exercised the kernel from the harness and stay here. The surface's own tests
of itself live in Palette.

**Why the split:** the mega-sprint's scope firewall (master doc §3) gives the
harness (Cyan) and the operator surface (Palette) different owners of
concern. One repo pretending to be both made every layout question ambiguous
and produced this session's recurring confusion. Cyan's folder on disk
(`Project Cyan/`) is the natural home of the harness; Palette remains its own
repo, nested by symlink.

**Phase 2 (pending, in Palette):** remove these files from the Palette repo
in one commit with the provenance pointer to this repo and this sha; then
`Palette(Cyan's operator surface)` keeps pointing at Palette and *this*
directory is the harness canon. Until that commit lands, Palette is the
canon for the files above and this copy is a snapshot (do not edit both).

**Known 9P note:** the extraction was done with tar-pipes in chunks because
rsync/mass-walks stall on this mount; if a directory looks empty, compare
against the Palette sha before assuming loss — shallow `ls` counts were
verified equal during extraction.
