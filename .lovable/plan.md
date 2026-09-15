# Make image adjustment consistent everywhere

## What will change
- Use the same image adjustment window whenever someone adds, replaces, or clicks an editable photo.
- Make each image crop use the shape where that photo is actually displayed, so the saved result matches the preview.
- Add clear Adjust, Replace, and Remove controls to existing editable photos across profiles, organizations, events, festivals, posts, stories, galleries, listings, and other shared upload forms.
- Preserve video and document upload behavior unchanged.

## Crop shapes
- Profile and logo photos: square, with a circular guide where displayed round.
- Profile and organization banners: the existing wide banner ratio.
- Event, festival, and story covers: 16:9.
- Card and gallery photos: the ratio used by that card, or the selected ratio only where the final layout supports it.

## Technical details
- Strengthen the shared image upload control so image clicks reopen adjustment, including already-saved private images.
- Pass a fixed target ratio from each page instead of offering ratios that the final card cannot preserve.
- Update the separate post, story, profile, organization, and event editors that do not use the shared control.
- Validate the result in the browser on desktop and mobile, including re-adjusting an existing saved image.
