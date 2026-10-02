# Clean page links and complete testing

## What will change
- Remove the random number suffix from Harwood Community Association's public address while preserving its old links as redirects.
- Update remaining page links so each page type consistently uses its short letter prefix.
- Test one real public page for every page type, including old-link redirects, wrong-prefix redirects, sharing links, and signed-out access.

## Page address format
- Artists: `/a/name`
- Arts organizations: `/ao/name`
- Businesses: `/b/name`
- Community associations: `/ca/name`
- Groups: `/g/name`
- Residents: `/r/name`
- Visitors: `/v/name`

## Safety
- Existing `/o/...` links will continue to work.
- If a clean address is already taken, the existing address will remain unchanged rather than overwriting another page.
- Only Harwood Community Association's stored address will be renamed in this change.

## Verification
- Check desktop and mobile-sized pages for each type.
- Confirm each canonical link loads the correct page.
- Confirm old and incorrect-prefix links forward to the canonical link.
- Confirm no build or runtime errors remain.
