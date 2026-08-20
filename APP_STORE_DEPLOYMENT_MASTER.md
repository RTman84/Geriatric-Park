# Geriatric Park — App Store Deployment Master Plan

**Project:** Geriatric Park  
**Repository:** `RTman84/Geriatric-Park`  
**Current deployment phase:** Phase 2 — account, cloud-save, and backend foundation  
**Current PR:** #4 — Phase 2 account, cloud-save, and backend foundation  
**Working branch:** `phase2/account-backend-foundation-clean`  
**Last consolidated:** 2026-08-20  

> This is the single project-status document for the app-store deployment effort. Update this file as work is completed. Do not repeat completed setup or re-run old troubleshooting steps unless a regression is demonstrated.

---

## 1. Executive status

### Current state

The project has moved from the original client-only architecture toward a production-oriented architecture with:

- Supabase authentication and cloud accounts
- server-validated sessions
- authenticated cloud saves
- append-only player-event ingestion
- Supabase RLS/privilege hardening
- server-side Gemini access
- Vercel server environment secrets
- security/credential scanning
- dependency auditing
- CI build/security gates
- payouts deliberately disabled during this phase

**We are NOT yet ready for App Store / Google Play production submission.**

The immediate gate is to finish and verify the current Phase 2 CI/security run. After that, work shifts from code repair into live integration testing, packaging, store preparation, and release testing.

---

## 2. Non-negotiable deployment principles

1. **Do not repeat completed steps.** Verify state first; only redo a step if a regression or failed verification proves it is necessary.
2. **Do not guess from stale GitHub Actions runs.** Always verify the latest PR head and latest workflow run before declaring a check passed or failed.
3. **Do not treat PR approval as a passing CI check.** Approval and automated checks are separate gates.
4. **Do not suppress security scanners to make CI green.** Fix the underlying architecture or dependency problem.
5. **Client code must never contain server secrets.** Browser-safe Supabase publishable credentials are acceptable; service-role, Gemini, payout, and other secrets are server-only.
6. **Keep temporary repair workflows out of production branches.** Temporary automation may be used to diagnose/repair a branch, but remove it after the intended change is applied.
7. **Payouts remain disabled until the complete authoritative economy and compliance architecture is ready.** `PAYOUTS_ENABLED=false` is intentional.
8. **Never paste secrets into chat, GitHub issues, source code, or this document.**
9. **Do not revoke a replacement secret until the replacement is verified in the deployed environment.**
10. **Use live integration tests for live integration behavior.** A successful TypeScript build does not prove authentication, OAuth, cloud save, or Gemini production behavior.

---

## 3. What was completed

### 3.1 Account/auth foundation — DONE

Implemented/established:

- Supabase Auth client
- email/password signup and sign-in
- magic-link/passwordless email foundation
- Google OAuth foundation
- persistent Supabase session handling
- session refresh/sign-out
- normalized internal account user/session model
- account configuration and safe browser configuration

Current auth client uses the Supabase publishable key and persistent session storage. The service-role key is not intended for browser use.

### 3.2 Cloud-save/backend foundation — IMPLEMENTED

Implemented:

- authenticated server-side API boundary
- session validation
- cloud-save read/write behavior
- optimistic revision checks
- bounded payloads
- player-event intent ingestion
- nonce-based deduplication
- authenticated access patterns

Still requires live production verification before being considered release-complete.

### 3.3 Supabase database security — IMPLEMENTED

A security-hardening migration removes broad direct privileges from `anon` and `authenticated`, then grants only the required operations to authenticated users on the intended tables.

Important: database privileges/RLS are part of the security boundary, but they still need a final deployed-environment verification after all migrations are applied.

### 3.4 Vercel environment architecture — CONFIGURED

The intended environment separation is:

**Server-only / sensitive**

- `GEMINI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Server configuration**

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `PAYOUTS_ENABLED=false`

**Browser-safe Vite variables**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not add service-role, Gemini, payout, or other secret credentials to `VITE_*` variables.

### 3.5 Gemini security architecture — IMPLEMENTED, CI VERIFICATION PENDING

Previous problem:

- a Gemini credential was present in tracked `index.html`
- browser-side Gemini SDK/key handling was possible
- the production bundle security scanner correctly caught Gemini-related client exposure

Corrections made:

- removed the exposed Gemini key from `index.html`
- removed the browser-side Gemini import map entry
- moved Gemini API access behind `/api/gemini`
- kept `@google/genai` server-side
- removed the `@google/genai` import from the browser service
- browser `geminiService.ts` now calls `/api/gemini`
- server reads `GEMINI_API_KEY` from environment

Architecture now intended to be:

`Browser → Vercel /api/gemini → server-side Gemini SDK → Gemini API`

The old exposed Google key must still be revoked after the replacement key is confirmed working.

### 3.6 Dependency/security work — SUBSTANTIALLY COMPLETE

Resolved problems encountered:

- package.json / package-lock mismatch causing `npm ci` failure
- dependency audit vulnerabilities
- broken shell quoting in the credential scan
- Gemini SDK appearing in the browser bundle

The dependency audit was previously verified at 0 vulnerabilities after repair. The current security run must be re-verified against the latest branch head after the final Gemini client cleanup.

### 3.7 Temporary repair automation — CLEANED UP

Temporary workflows were used during troubleshooting to synchronize the lockfile and apply safe audit fixes.

They are not part of the intended permanent architecture.

The temporary dependency-repair workflow has now been removed from the Phase 2 branch.

---

## 4. Current CI/security gate

### Latest known required checks

- [ ] Phase 2 build check — verify latest run
- [ ] Security and build gate — verify latest run
- [ ] `npm ci`
- [ ] TypeScript check
- [ ] production build
- [ ] dependency audit
- [ ] credential scan
- [ ] production-bundle Gemini scan

### Important history / lessons

Earlier failures were sometimes checked against stale workflow runs or merge refs. From this point forward, always identify:

- current PR head SHA
- workflow run ID
- job ID
- actual conclusion

before making a claim about CI status.

Do not assume that a PR approval means the checks passed.

---

## 5. Security incident / credential history

### Exposed Gemini key — ACTION STILL REQUIRED

A Gemini API key was previously present in tracked `index.html`.

Actions taken:

- removed from source
- replaced Vercel `GEMINI_API_KEY` with a newly created key
- removed browser-side Gemini credential path
- moved Gemini access server-side
- added production-bundle scanning

**Remaining:** revoke/delete the old exposed Google key after the new key is confirmed functional.

Never record either key value in this document.

---

## 6. What is intentionally NOT enabled yet

These are planned later phases, not forgotten tasks:

- local-save → cloud migration automation
- server-authoritative rewards/economy
- authoritative currency ledger
- real leaderboard writes
- real-money payout processing
- payout provider integration
- KYC/eligibility/compliance flow
- Steam authentication / Steamworks integration

`PAYOUTS_ENABLED=false` must remain in effect until those prerequisites are complete.

---

# 7. Remaining roadmap to app-store deployment

## Phase A — Finish Phase 2 CI/security

**Status: IN PROGRESS**

- [ ] Confirm latest Phase 2 build check green
- [ ] Confirm latest Security and build gate green
- [ ] Confirm dependency audit green
- [ ] Confirm credential scan green
- [ ] Confirm Gemini production-bundle scan green
- [ ] Confirm no temporary repair workflow remains

**Exit criteria:** latest PR head passes all required CI/security checks.

---

## Phase B — Security cleanup

**Status: NEXT**

- [ ] Verify new Gemini key works through `/api/gemini` in Preview
- [ ] Verify new Gemini key works through `/api/gemini` in Production
- [ ] Revoke/delete old exposed Gemini key
- [ ] Verify no secrets remain in tracked source
- [ ] Verify no secrets appear in production bundle
- [ ] Confirm Vercel environment separation for Preview/Production
- [ ] Confirm Supabase service-role key is server-only
- [ ] Confirm payouts remain disabled

**Exit criteria:** no known credential exposure and all server secrets verified server-side only.

---

## Phase C — Supabase live integration testing

**Status: NOT STARTED**

### Email/password

- [ ] create test account
- [ ] verify email confirmation behavior
- [ ] sign in
- [ ] sign out
- [ ] sign back in
- [ ] refresh browser and confirm session persistence
- [ ] test invalid credentials
- [ ] test expired/invalid session handling

### Magic link

- [ ] request magic link
- [ ] follow link
- [ ] confirm session established
- [ ] confirm return URL works in Preview
- [ ] confirm return URL works in Production

### Google OAuth

- [ ] configure provider in Supabase if not already complete
- [ ] configure allowed redirect URLs
- [ ] sign in with Google in Preview
- [ ] sign in with Google in Production
- [ ] verify existing account behavior
- [ ] verify sign-out/session persistence

**Exit criteria:** all intended auth methods work in the actual deployed environment.

---

## Phase D — Cloud-save integration testing

**Status: NOT STARTED**

- [ ] create/save game state on test account
- [ ] reload and restore state
- [ ] sign in from second browser/device
- [ ] verify same account sees cloud state
- [ ] test stale revision/conflict behavior
- [ ] test oversized/invalid save payload rejection
- [ ] test unauthenticated save rejection
- [ ] verify RLS prevents cross-user access
- [ ] verify server-side API authorization
- [ ] decide and document local-save → cloud migration policy
- [ ] implement migration only after policy is approved

**Exit criteria:** cloud saves are reliable and cross-account access is demonstrably blocked.

---

## Phase E — Gemini production integration

**Status: CODE IMPLEMENTED; LIVE TEST PENDING**

- [ ] test battle dialogue through `/api/gemini`
- [ ] test elder bio generation
- [ ] test daily mission generation
- [ ] test fallback behavior if Gemini fails
- [ ] verify Gemini key never reaches browser
- [ ] verify production bundle contains no Gemini credential/SDK exposure
- [ ] verify rate/error handling is acceptable for production

**Exit criteria:** Gemini works through the server boundary without client secret exposure.

---

## Phase F — Gameplay/economy architecture

**Status: PLANNED / LATER**

- [ ] define authoritative game-state boundaries
- [ ] define reward rules server-side
- [ ] implement authoritative currency ledger
- [ ] implement anti-replay/anti-duplication controls
- [ ] implement authoritative leaderboard writes
- [ ] add abuse/rate limiting where appropriate
- [ ] define payout eligibility rules
- [ ] integrate payout provider only after compliance requirements are satisfied
- [ ] keep `PAYOUTS_ENABLED=false` until complete

**Exit criteria:** competitive/economic data cannot be trusted from the browser.

---

## Phase G — Platform integrations

**Status: PLANNED**

### Steam

- [ ] obtain/configure Steamworks App ID
- [ ] implement Steam authentication if required
- [ ] test Steam identity linking
- [ ] document account-linking rules

### Mobile platform identity / services

- [ ] determine final iOS/Android auth requirements
- [ ] implement Apple/Google platform-specific requirements if needed
- [ ] test account linking and restore behavior

---

## Phase H — Mobile packaging

**Status: NOT STARTED**

- [ ] select/finalize mobile wrapper architecture (Capacitor or equivalent)
- [ ] create iOS project
- [ ] create Android project
- [ ] configure app IDs/bundle IDs
- [ ] configure icons
- [ ] configure splash screen
- [ ] configure safe-area behavior
- [ ] configure orientation
- [ ] configure status/navigation bars
- [ ] configure external OAuth/browser callback behavior
- [ ] configure production API URLs
- [ ] test offline/poor-network behavior
- [ ] test app resume/background behavior
- [ ] test authentication persistence
- [ ] test cloud-save behavior on real devices

---

## Phase I — Store compliance and release materials

**Status: NOT STARTED**

### Apple App Store

- [ ] Apple Developer account
- [ ] App Store Connect app record
- [ ] bundle ID
- [ ] privacy policy URL
- [ ] support URL
- [ ] age rating
- [ ] content declarations
- [ ] privacy/data collection declarations
- [ ] screenshots
- [ ] app description
- [ ] keywords
- [ ] icon
- [ ] review notes
- [ ] TestFlight build
- [ ] internal testing
- [ ] external testing if needed
- [ ] App Review submission

### Google Play

- [ ] Google Play Console app record
- [ ] package name
- [ ] privacy policy URL
- [ ] Data Safety form
- [ ] content rating
- [ ] target SDK requirements
- [ ] screenshots
- [ ] feature graphic
- [ ] app description
- [ ] internal testing
- [ ] closed testing requirements if applicable
- [ ] production release

---

## Phase J — Production release gate

**Status: NOT STARTED**

Before submission:

- [ ] latest main branch passes CI
- [ ] Preview passes integration tests
- [ ] Production passes integration tests
- [ ] no exposed credentials
- [ ] old exposed Gemini key revoked
- [ ] Supabase RLS verified
- [ ] cloud save verified
- [ ] OAuth verified
- [ ] Gemini verified
- [ ] analytics/privacy behavior documented
- [ ] crash/error monitoring configured if used
- [ ] legal/privacy policy complete
- [ ] app-store metadata complete
- [ ] production environment backup/recovery plan documented
- [ ] payouts still disabled unless full economy/compliance phase is complete
- [ ] final real-device QA complete

Only after this gate is green should we submit to Apple/Google.

---

# 8. Known architecture decisions

## Authentication

Supabase Auth is the account identity foundation.

## Browser credentials

Only browser-safe publishable Supabase configuration belongs in `VITE_*` variables.

## Server secrets

Gemini and Supabase service-role credentials stay on the server/Vercel environment.

## Gemini

All Gemini requests go through `/api/gemini`.

## Cloud saves

Cloud save is authenticated and revision-aware. The browser is not trusted as an authority for economy/reward decisions.

## Events

Player-event intents are append-only/deduplicated and are not themselves authoritative reward grants.

## Economy

Server-authoritative economy is a later phase.

## Payouts

Disabled until the complete authoritative economy, fraud prevention, eligibility, payout provider, and compliance architecture is ready.

---

# 9. Mistakes already encountered — do not repeat

### Mistake 1: assuming a PR approval means CI passed
**Lesson:** Approval is not a check result. Always inspect the latest workflow run.

### Mistake 2: checking stale workflow runs
**Lesson:** Always identify the current PR head SHA before diagnosing a failure.

### Mistake 3: treating `npm audit fix` output as the root cause
**Lesson:** Inspect the actual failed job step. The first dependency issue was initially `npm ci`/lockfile synchronization, not necessarily the audit itself.

### Mistake 4: leaving temporary repair automation in the branch
**Lesson:** Use repair workflows only when necessary and remove them after the repair.

### Mistake 5: trying to satisfy a credential scanner without fixing architecture
**Lesson:** When a scanner finds client-side credential handling, remove the client secret path rather than weakening the scanner.

### Mistake 6: confusing SDK code in the browser bundle with a leaked new API key
**Lesson:** Inspect the exact matched bundle text. The Gemini SDK itself can contain credential-related strings. The correct solution is server-only SDK usage.

### Mistake 7: rotating a secret before replacement is verified
**Lesson:** Add and verify the replacement first; revoke the old exposed key afterward.

### Mistake 8: moving to store submission before live integration testing
**Lesson:** CI proves code/build/security properties; it does not prove OAuth, cloud saves, device behavior, or store compliance.

---

# 10. Current next action

**Do not start another architecture change while the current CI/security run is pending.**

First:

1. Verify the latest Phase 2 build check.
2. Verify the latest Security and build gate.
3. If green, proceed to Security Cleanup (new Gemini key live verification → revoke old key).
4. Then begin live Supabase authentication testing.

If a check fails, diagnose the newest failure only. Do not repeat earlier repairs unless the new failure proves the same issue has returned.

---

# 11. Quick status legend

- ✅ **DONE** — implemented and verified sufficiently for the current phase
- 🟢 **READY** — prerequisites complete; next action can begin
- 🟡 **IN PROGRESS** — actively being verified or implemented
- 🟠 **PENDING** — planned but blocked by prerequisite work
- 🔴 **BLOCKED** — requires a specific fix before continuing
- ⚪ **LATER** — intentionally deferred to a later phase

---

# 12. Single source of truth rule

When project work resumes in a new chat:

1. Read this file first.
2. Check the current PR/branch head.
3. Check the latest CI runs.
4. Compare the current repository state against this checklist.
5. Continue from the first incomplete gate.
6. Do not repeat completed environment setup or prior troubleshooting without evidence of regression.
7. Update this file whenever a milestone changes.

**Goal:** reach App Store and Google Play production release without repeating work, exposing credentials, bypassing security gates, or enabling financial/economic functionality before the backend architecture is ready.
