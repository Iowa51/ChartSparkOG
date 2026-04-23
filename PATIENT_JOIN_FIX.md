# Fix patient telehealth join + professional invite link

## Fix 1: Patient join flow (2 files)

Same SameSite cookie problem as provider. The accept-invite sets a cookie and redirects to /telehealth/join, but the cookie never arrives. Fix by passing room credentials via query params instead.

### src/app/api/telehealth/accept-invite/route.ts

After successfully consuming the invite token and looking up the patient session ref via getPatientSessionRefByAppointment, instead of ONLY setting a cookie, also resolve the actual room URL and meeting token. Import and call resolveTelehealthJoinSession with the sessionRef to get the roomUrl and meetingToken. Then base64url-encode both values and append them as query params to the redirect URL: /telehealth/join?r=BASE64_ROOM_URL&t=BASE64_MEETING_TOKEN. Keep the cookie setting as fallback.

If resolveTelehealthJoinSession returns null (session already consumed), try a different approach: query telehealth_session_tokens directly using requireServiceRoleClient for the appointment_id and participant_role='patient' where used=false, get the encrypted_room_url and encrypted_meeting_token, decrypt them with decryptPHI, then encode and redirect.

### src/app/telehealth/join/page.tsx

In the PatientVideoCall component, use useSearchParams to read the r and t query params. If both are present, base64-decode them to get roomUrl and meetingToken. Set sessionAccessRef directly and setSessionReady(true), skipping the join-session fetch entirely. Only fall back to the join-session fetch if the query params are missing.

## Fix 2: Professional link preview (1 file)

### src/app/layout.tsx (or the root layout file)

Check the existing OpenGraph and meta tags. The link preview currently shows "ChartSpark - Clinical Documentation for Nurse Practitioners" which is wrong for telehealth invite links. This is fine for the main site, but the telehealth join page needs its own metadata.

### src/app/telehealth/join/layout.tsx (create if it doesn't exist)

Create a layout or use generateMetadata in the join page to override the meta tags for the telehealth join route specifically:
- title: "ChartSpark Telehealth - Join Your Session"
- description: "Join your secure, HIPAA-compliant video session with your healthcare provider."
- og:title: "ChartSpark Telehealth Session"
- og:description: "Your provider has invited you to a secure telehealth session. Click to join."

## Do not
- Do not remove existing cookie or join-session logic, just add query param path as priority
- Do not change the provider flow
- Do not modify create-room

Commit: `git commit --no-verify -m "fix: patient joins via query params + professional telehealth link metadata"`
Push: `git push origin main --no-verify`