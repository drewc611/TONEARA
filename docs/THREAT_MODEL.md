# Threat Model

## Assets

- User prompts and locally saved settings
- Generated audio
- Repository integrity and release artifacts
- Future provider credentials

## Current threats and controls

| Threat | Current control |
|---|---|
| Prompt disclosure | Browser-local processing and storage |
| Script injection through names or prompts | Escaping before library rendering |
| Dependency compromise | Runtime has no third-party dependencies |
| Malicious repository changes | Pull-request checks, CodeQL, dependency review, owner approval |
| Release tampering | Tag-driven build from repository source |

Hosted generation, uploads, authentication, and payments are outside the current trust boundary and require a new review.
