# Fix telehealth: pass room credentials directly, skip join-session for provider

The join-session token flow keeps failing due to HMAC validation issues across serverless instances. For the provider flow, pass the Daily.co room URL and meeting token directly from create-room to the video component via React state. The join-session endpoint is still used by patients via invite links.

## Changes (3 files only)

### 1. src/app/api/telehealth/create-room/route.ts
In BOTH the demo and production response JSON blocks, add two new fields: `roomUrl` (the Daily.co room URL string) and `meetingToken` (the provider meeting token string, which is `providerToken.token` in production or `"demo-provider-token"` in demo mode). These go alongside the existing fields in the NextResponse.json call.

### 2. src/app/(app)/telehealth/page.tsx
Update the CallSession interface to add `roomUrl?: string` and `meetingToken?: string`. In handleStartCall after the create-room fetch succeeds, save `data.roomUrl` and `data.meetingToken` into callSession state. Pass both as props to DailyVideoCall: `roomUrl={callSession.roomUrl}` and `meetingToken={callSession.meetingToken}`.

### 3. src/components/telehealth/DailyVideoCall.tsx
Add optional props `roomUrl?: string` and `meetingToken?: string`. In the loadSession useEffect, check if roomUrl is provided. If it IS provided, skip the fetch to /api/telehealth/join-session entirely and set sessionAccessRef directly: `sessionAccessRef.current = { roomUrl, token: meetingToken }; setSessionReady(true);`. Only fall back to the join-session fetch if roomUrl is NOT provided (this preserves the patient flow).

## Do not
- Do not modify join-session endpoint or patient flow
- Do not remove existing code, just add the direct path as priority
- Do not change any other files

Commit: `git commit --no-verify -m "fix: provider joins Daily room directly from create-room response, skips join-session"`
Push: `git push origin main --no-verify`