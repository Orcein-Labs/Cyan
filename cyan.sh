#!/usr/bin/env bash
set -euo pipefail
CYAN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Resolve source workspace packages regardless of the caller's working directory.
export TSX_TSCONFIG_PATH="$CYAN_ROOT/tsconfig.json"
export PRIME_AGENT_LAUNCHER_PATH="$CYAN_ROOT/cyan.sh"
export CYAN_SUBSTRATE="${CYAN_SUBSTRATE:-palette}"
export PRIME_AGENT_CODING_AGENT_DIR="${CYAN_AGENT_DIR:-${CYAN_CODING_AGENT_DIR:-${PRIME_AGENT_CODING_AGENT_DIR:-$HOME/.cyan/agent}}}"
if [[ "${1:-}" == "setup" ]]; then
    shift
    exec python3 "$CYAN_ROOT/scripts/setup-cyan.py" "$@"
fi
(umask 077; mkdir -p "$PRIME_AGENT_CODING_AGENT_DIR")
exec bash "$CYAN_ROOT/prime-agent.sh" "$@"
