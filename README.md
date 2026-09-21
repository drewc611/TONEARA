<div align="center">
  <img src="app/assets/toneara-logo.png" alt="Toneara" width="240" />
  <h1>Toneara</h1>
  <p><strong>Make the music you imagine.</strong></p>
  <p>A browser-first AI-assisted studio for creating, remixing, previewing, and exporting original instrumentals.</p>

  [![Release candidate](https://img.shields.io/badge/status-release%20candidate-ff9f1c?style=for-the-badge)](https://github.com/drewc611/TONEARA/releases)
  [![CI](https://img.shields.io/github/actions/workflow/status/drewc611/TONEARA/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/drewc611/TONEARA/actions/workflows/ci.yml)
  [![CodeQL](https://img.shields.io/github/actions/workflow/status/drewc611/TONEARA/codeql.yml?branch=main&style=for-the-badge&label=CodeQL)](https://github.com/drewc611/TONEARA/actions/workflows/codeql.yml)
  [![License](https://img.shields.io/badge/license-proprietary-f5f2ea?style=for-the-badge)](LICENSE)
</div>

![Toneara beta product interface](docs/images/toneara-beta.png)

## What it does

Describe a sound, choose a genre and mood, set the tempo, and generate a playable instrumental directly in the browser. Toneara renders a waveform, supports seeking and remix variations, remembers recent settings on the device, and exports a WAV file.

The release candidate needs no account, API key, backend, or paid generation provider. Prompts and track settings stay in the browser.

## Release-candidate features

- Prompt-to-instrumental generation
- Electronic, hip-hop, ambient, and cinematic palettes
- Focused, uplifting, dark, and dreamy moods
- Tempo and 10, 20, or 30-second duration controls
- Twelve deterministic variations per brief
- Waveform, playback, seeking, regeneration, and WAV export
- Device-local recent-track library
- Portable, validated Toneara project import and export
- Installable progressive web application with offline startup
- Strict browser content security policy with no third-party runtime requests
- Responsive desktop and mobile interface

## How it works

```mermaid
flowchart LR
    B[Music brief] --> G[Local generation engine]
    G --> S[PCM samples]
    S --> W[WAV encoder]
    W --> P[Preview and waveform]
    W --> D[Download]
    B --> L[Local track settings]
```

## Run locally

Requires Node.js 20 or newer.

```bash
git clone https://github.com/drewc611/TONEARA.git
cd TONEARA
npm run verify
python3 -m http.server 4173 --directory app
```

Open `http://localhost:4173`.

## Repository map

| Path | Purpose |
|---|---|
| `app/` | Shippable browser application |
| `test/` | Deterministic engine tests |
| `server/` | Server-side hosted-provider adapter, rate limiting, and instrumentation (not deployed) |
| `scripts/` | Dependency-free validation and build |
| `docs/` | Product, architecture, privacy, threat model, security operations, support matrix, and roadmap |
| `.github/agents/` | Guarded GitHub Copilot custom-agent team |
| `.github/workflows/` | CI, security, Pages, agent governance, and releases |

## Product direction

The local engine and provider-neutral job contract deliver the complete credential-free experience. A later hosted-provider adapter can use the same contract while keeping provider keys off the client.

See the [product requirements](docs/PRODUCT_REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), [security operations](docs/SECURITY_OPERATIONS.md), [browser support](docs/BROWSER_SUPPORT.md), and [AI team operating model](docs/AGENT_OPERATING_MODEL.md).

## Ownership and license

Toneara is proprietary software. Source is visible for evaluation, but reuse, redistribution, hosted deployment, derivative works, and commercial use require written permission. See [LICENSE](LICENSE).

Copyright © 2026 Andrew Clark. All rights reserved.
