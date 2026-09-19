# Threat Model

## Assets

- User prompts and locally saved settings
- Generated audio
- Exported project files
- Repository integrity and release artifacts
- Future provider credentials

## Current threats and controls

| Threat | Current control |
|---|---|
| Prompt disclosure | Browser-local processing and storage |
| Script injection through names or prompts | Escaping before library rendering |
| Oversized or malformed project import | 1 MB browser limit, strict schema and field validation, 100-track limit, no imported HTML execution |
| Sensitive values hidden in imported records | Allowlisted track fields; unknown fields are discarded before storage |
| Dependency compromise | Runtime has no third-party dependencies |
| Malicious repository changes | Pull-request checks, CodeQL, dependency review, owner approval |
| Release tampering | Tag-driven build from repository source |

Hosted generation, uploads, authentication, and payments are outside the current trust boundary and require a new review.
