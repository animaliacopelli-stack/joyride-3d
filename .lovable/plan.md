# Fix music search

## Outcome
Music search will work without requiring a player login and will show clear loading, empty, and retry states.

## Changes
- Add a public, read-only music search endpoint that validates the search text and requests playable Apple song previews.
- Point the song search panel directly at that endpoint instead of the failing protected request path.
- Preserve local uploads and existing playback behavior.
- Verify search results and preview playback in the running game, then confirm the project remains error-free.

## Technical details
- Keep the endpoint under `/api/public/` and allow only GET requests with bounded input.
- Return a small normalized track payload; do not expose personal data or permit writes.
