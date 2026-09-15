# Match the Festival Overview Reference

## Goal
Make the festival Overview tab match the supplied screenshots while keeping all content connected to real festival, organizer, artist, and organization data.

## Changes
- Replace headliner rows with two-column image cards using overlaid name, date/time/stage, description, and admission action.
- Replace featured-experience rows with the same dense two-column image-card grid, while preserving creator drag ordering and edit controls.
- Split the right column into distinct bordered panels for At a Glance, About the Festival, and Organizer.
- Move the About content and its festival facts into the right column, matching the reference hierarchy.
- Restyle Nearby on Planet Baltimore as a full-width section below the overview columns, with horizontal image cards for organizations and artists.
- Keep creator-only Add, Edit, Remove, drag, and Up/Down controls visible without changing the public visitor layout.
- Preserve the existing colors, typography, tabs, real records, and mobile behavior.

## Verification
- Sign in as terellebony@gmail.com using the managed test session.
- Create a temporary draft festival through the full Create Festival form, add representative section content, and compare its owner view with the reference.
- Confirm visitor preview hides editing controls while retaining the same card layout.
- Check desktop and mobile screenshots, console errors, image display, reordering controls, and all festival tabs.
- Remove the temporary test festival after verification so no test content remains public or in drafts.

## Technical Details
- Update the existing festival detail route and shared editable-list presentation only where needed.
- Extend nearby queries to use existing organization and artist images, with clean token-based fallbacks when no image exists.
- Do not add placeholder records or alter existing user festival data.
