# Privacy Design

The beta processes prompts and generates audio inside the browser. It sends no prompts, track settings, or audio to a Toneara server because no application backend exists.

Recent track settings are stored in browser local storage and can be deleted with **Clear all** or through browser storage controls. Downloaded WAV files are controlled by the user and are not retained by Toneara.

Exported Toneara project files contain prompts, track names, musical settings, variations, and creation timestamps. They do not contain generated audio, credentials, browser identifiers, or provider secrets. Project files leave the browser only when the user downloads or shares them. Importing a project reads the selected file locally and does not upload it.

Before adding accounts, analytics, hosted generation, uploads, or payments, the project must define retention, deletion, consent, subprocessors, data classification, and a public privacy notice.
