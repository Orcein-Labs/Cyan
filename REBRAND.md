# Cyan identity and upstream attribution

Cyan is a fork of Prime Agent, built on Mario Zechner's pi. The README and MIT
license preserve that lineage and the upstream copyright notices.

The interactive welcome screen, terminal wordmark, model-facing product prose,
CLI help, daemon diagnostics and ACP agent identity identify Cyan. The source
launcher is `cyan.sh`, and configuration defaults to `~/.cyan/agent`.
`CYAN_AGENT_DIR` selects an isolated configuration; `CYAN_CODING_AGENT_DIR` and
legacy `PRIME_AGENT_CODING_AGENT_DIR` are also read in that order.

Fresh onboarding offers provider/model configuration. Prime Intellect is an
optional provider, not a login requirement. Usage analytics require explicit
opt-in. Cyan does not install upstream binary updates or advertise them as Cyan
updates; update this source checkout instead.

Actual third-party provider IDs, package imports, protocol namespaces and
historical log parsers retain their original names. The Python runtime package
`prime-agent-runtime` remains the optional IPython implementation. The inherited
`install.sh` is upstream release infrastructure, not the Cyan installation path;
use the source setup in README.md until Cyan release packaging is prepared.

No credentials are automatically copied or migrated from upstream directories.
