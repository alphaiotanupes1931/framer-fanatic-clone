# Roadmap

## In progress
- [x] Festival back button should go back one step, not to /events
- [x] Redesign Updates tab to match reference screenshot and seed sample content

## Active
- [x] Speed up organization directory images by signing avatar and banner paths directly in the avatars bucket. Verified a cold signed-in visit only calls the avatars signing endpoint.
- [x] Add incremental card loading to organization directories and verify business filtering, scrolling and image requests. Verified 24 initial cards at the test viewport, all 44 after scrolling, 12 Arts Orgs after filtering, and no runtime errors.
- [x] Remove tool branding from project documentation, editable source comments and email preview wording, preserving required service identifiers and connections.
- [x] Restore artist pages in their selected neighborhood's Artists tab. Verified Harwood lists Ainsley Burrows Mighty, Laurielle Noel, LN Fashion and Marz.D, and the artist link opens its canonical page. Three tests pass with no runtime errors.
- [x] Add Both to business offers and offer-specific Products/Services tabs, with Lookbook-style product categories and items. Nine rule/caption tests pass, schema confirmed, signed-in category form and unchanged Services verified on desktop and mobile using a temporary Both preview without changing existing data.
- [ ] Verify product category creation, photo upload and saved item viewing with real owner content. Blocked: no real product category or product photos supplied; existing blank offers remain unchanged and no sample content was saved.
- [x] Add existing business story editing for the page owner, preserving tags and rich text. Verified owner composer access, bold, italic and tags with a signed-in session; preview builds successfully.
- [ ] Verify an existing business story saves and reads back through the owner editor. Blocked: the requesting owner's business has no existing stories, and no test content was published.
- [x] Add custom tags to business story creation. Verified bold, italic, tag addition, duplicate prevention and removal on the signed-in owner's business Stories tab; tag storage column confirmed. No test story published.
- [x] Enable bold and italic across story composers and preserve formatting in readers. Verified selecting text and applying both controls in the signed-in story writer; no stories were published during testing.
- [x] Update referral parsing and retained recipient lists, restore own-invite deletion, and pass three recipient rule tests.
- [ ] Verify referral deletion and retained recipients in the signed-in screen and provide screenshot proof. Blocked: preview is signed out and requesting user has no matching account for automatic sign-in.
- [x] Replace calendar organizer tabs with independent Monthly Calendar and Upcoming dropdowns. Verified view switching, retained filters, all four choices, six rule tests and passing page validation.
- [x] Make Calendar open on Monthly Calendar with All by default, from every entry point. Verified bare /calendar, the Events page Calendar chip, and switching to Upcoming.
- [x] Include all public pages owned by people matched in Search and label each profile/page type. Verified Ainsley Burrows and all four public pages, Artists filter, Fashion LN, and five search rule tests.
- [x] Combine Mission and Rules into About on Groups and Community Associations. Verified Harwood content and both tab lists; private group content remains membership-protected.
- [x] Rename page audience to Followers and verify searchable follower list.
- [x] Verify admin "Live now" heartbeat works in browser (last_seen_at updates)
- [x] Verify smaller attending privacy toggle renders
- [x] Remove dashes from all page links, preserve redirects, and verify collisions and page loading
- [x] Replace grey hover fills with the warm brand tint across all buttons and tabs. Verified the Followers chip and page tabs render a warm peach tint in the browser.

- [x] Fashion Line cover images (test)
- [x] Lookbook and Fashion Line keep separate items
- [x] Verify photo arrows in Fashion Line and Lookbook albums
- [x] Remove numeric photo counts from Lookbook cards
- [x] Hide Category, Neighborhood, Tag and audience options when posting to Groups and Community Associations. Verified on Boom Selecta, Founding 100 and Greenmount West; other pages keep every option.


- [x] Remove the Gifts tab from the Referral Network dialog (2026-10-18)

- [x] Rename the referral "Parse emails" button to "Complete upload" (2026-10-18)
- [x] Artist search: all artist pages, owner names, spelling tolerance
- [x] Groups: Documents tab for uploads
- [x] Top search bar: pages incl. Arts Orgs
- [x] Back arrows return to previous page
- [x] Lookbook: required name, optional captions, caption-less items show photo only. Verified required-name toast, optional caption placeholder, photo-only item view and grid, caption added later renders, and the test item was removed.

- [ ] Waiting on user go-ahead: email each business owner asking them to pick Product or Service (Edit Profile > Edit profile details). Wording approved.

- [x] Make Create Business dropdowns and Communities tabs rounded with a light grey hover. Verified pill options with grey hover in the browser (9 types), Communities tab hover, and dark mode readability for both plus sidebar links.
- [x] Remove the Posts & Updates section from the Services tab on business pages. Verified on /b/mike: Services & Pricing remains, no Posts & Updates heading or New post button; posts still show under the Posts tab.


