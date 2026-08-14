# Canonical Public Profiles

## Goal
Every click on a person's avatar or name opens their one canonical public profile. It will match the owner profile's Public Preview layout shown in the reference, instead of selecting a Resident or Artist variation.

## Changes
- Make `/u/$username` render the same public-facing structure, tabs, header, stats, posts, and actions as `/profile?preview=public`, populated with the selected person's data.
- Remove `view=resident` and `view=artist` behavior from person-profile navigation so ordinary profile links cannot force an alternate page type.
- Keep organization and standalone artist-page links on their own `/o/$slug` pages. Only person links use the canonical `/u/$username` profile.
- Update the shared post cards, post detail, and Baltimore 100 links that currently force a profile variation.
- Verify profile clicks from Baltimore 100 and posts open the correct person's canonical page and do not expose owner-only controls.

## Technical Details
- Reuse or extract the public profile presentation rather than maintaining two visually different profile implementations.
- Preserve TanStack Router typed links and username parameters.
- Keep edit, pin, delete, payout, and private account controls hidden on another person's public profile.
