# Optional Tickets Remaining Visibility

## Goal
Give event organizers control over whether guests can see the number of tickets remaining.

## Changes
- Add a `Show tickets remaining` setting to each event, off by default.
- Place the setting beside ticket capacity controls when creating an event.
- Include the same setting when editing an event in Organizer Studio.
- Continue enforcing capacity and sold-out behavior whether or not the count is public.
- On the event page, show the exact remaining count only when the organizer enabled it.

## Technical details
- Add a non-null boolean event field with a default of `false` so existing and new events remain private by default.
- Save and load the setting through the existing event create and edit forms.
- Keep buyer-specific ticket-limit messages visible because those describe the current buyer's allowance, not public inventory.
- Verify type safety and the event-page display condition.
