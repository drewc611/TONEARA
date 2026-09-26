# Browser and device support

Toneara targets current evergreen browsers. The application uses ES modules, dynamic import, `AbortController`, `AbortSignal`, Canvas 2D, the Web Audio-free WAV pipeline, `localStorage`, service workers, and `Element.replaceChildren`. Every one of these is available in the versions below.

## Supported matrix

| Platform | Minimum version | Qualification status |
|---|---|---|
| Chrome (desktop) | 111 | Not yet run |
| Edge (desktop) | 111 | Not yet run |
| Firefox (desktop) | 113 | Not yet run |
| Safari (macOS) | 16.4 | Not yet run |
| Safari (iOS/iPadOS) | 16.4 | Not yet run |
| Chrome (Android) | 111 | Not yet run |

Minimum versions come from the newest baseline among the features listed above; `:has()`-free CSS and `replaceChildren` set the floor.

## What "qualified" means

A platform is qualified when a person completes this pass on real hardware and records the date and build:

1. Generate a track from an empty state and play it to the end.
2. Seek with the pointer, then with the keyboard only (arrows, Home, End).
3. Use the section markers and the five-second skip controls.
4. Regenerate, then open settings from a library entry.
5. Create a project, rename it, archive it, restore it, and delete it.
6. Export a project, reload the page, and import it back.
7. Download the WAV and confirm it opens in a system player.
8. Install the application, go offline, and restart it.
9. Repeat the primary flow at 200% text zoom and at 320 CSS pixels wide.
10. Run the flow with a screen reader (VoiceOver on Apple platforms, NVDA on Windows, TalkBack on Android) and confirm the waveform description, progress announcements, and library status are read.

## Automated coverage

`npm run check` and `npm test` enforce the structural half of this: accessible names on every control, resolvable ARIA references, no positive `tabindex`, heading order, a focus-visible rule on every interactive control, a reduced-motion rule, and a working skip link. See `test/accessibility.test.mjs`.

Automation cannot judge colour contrast against a rendered page, screen-reader output quality, or touch-target comfort. Those stay manual.
