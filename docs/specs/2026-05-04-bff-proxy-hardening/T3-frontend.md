## Status: DONE

## Files Changed
- `apps/rpg-tracker/app/api/[...path]/route.ts` (modified)
- `apps/rpg-tracker/app/__tests__/api-proxy.test.ts` (new)

## Notes

### Changes Made

**route.ts — hardening summary:**

1. **Upstream Content-Type preserved**: Response no longer forces `Content-Type: application/json`. All upstream headers are forwarded verbatim via `response.headers.forEach`, so `text/plain`, `text/csv`, `application/octet-stream`, etc. pass through correctly.

2. **Request Content-Type — body-aware**: Replaced the `Content-Type: request.headers.get('Content-Type') ?? 'application/json'` default with conditional logic:
   - Methods in `NO_BODY_METHODS` (GET, HEAD, DELETE, OPTIONS): no Content-Type sent to upstream.
   - Body methods (POST, PUT, PATCH): Content-Type forwarded only if the client supplied one; if absent, nothing is set (upstream decides).

3. **Null-body statuses (204, 205, 304)**: Now returns `new Response(null, { status })` instead of `new Response(text, { status })`, which is required by the Fetch spec and avoids runtime errors in jsdom/Node environments.

4. **Hop-by-hop header stripping**: Transfer-Encoding, Connection, Keep-Alive, Upgrade, Proxy-Authenticate, Proxy-Authorization, TE, Trailers are stripped from upstream responses before forwarding to clients.

5. **Auth token forwarding**: Behaviour unchanged — `Authorization: Bearer <token>` is set when a Supabase session exists; omitted otherwise.

### Pre-existing Test Failures (unrelated)
The following test files have pre-existing failures unrelated to this PR:
- `skills-list.test.tsx`: missing `listCategories` mock export
- `skill-detail.test.tsx`: missing `listTags` mock export
- `skill-detail-sessions.test.tsx`: missing `listTags` mock export
- `skill-create.test.tsx`: missing `listSkills` mock export
- `account.test.tsx`: missing `getAccountStats` mock export
- `login.test.tsx`: login page now has multiple "sign in" buttons (social OAuth added)

## Test Results

19/19 proxy tests pass (`app/__tests__/api-proxy.test.ts`):

- preserves JSON Content-Type from upstream response ✓
- preserves plain-text Content-Type from upstream response ✓
- preserves CSV Content-Type from upstream response ✓
- passes through 201 Created status ✓
- passes through 204 No Content status ✓
- passes through 404 status ✓
- passes through 500 status ✓
- forwards Authorization header when session exists ✓
- omits Authorization header when no session ✓
- does not send Content-Type for GET requests ✓
- does not send Content-Type for DELETE requests ✓
- does not send body for GET requests ✓
- forwards JSON body and Content-Type for POST ✓
- forwards multipart/form-data Content-Type for POST ✓
- does not set Content-Type when POST has no Content-Type header ✓
- passes extra upstream headers (e.g. X-Request-Id) to the client ✓
- strips transfer-encoding hop-by-hop header from upstream response ✓
- appends query string to upstream URL ✓
- builds correct upstream path from catch-all segments ✓

## Known Risks

- **Body buffering**: The proxy still reads the entire body as text (`request.text()`) before forwarding. Binary/large payloads are not streamed. This was the pre-existing behaviour; no regression introduced. A streaming proxy would require a separate refactor.
- **Content-Type absent on POST**: If a client sends a POST with no Content-Type (e.g. raw webhook), nothing is set and the upstream must tolerate it. This is more correct than the old behaviour which would have sent `application/json` by default.
