# Security and payout policy

## Immediate controls

- API credentials are server-side only.
- Never commit Gemini, payment, payout, signing, OAuth, or database secrets.
- Production AI calls use `/api/gemini`; the browser never receives `GEMINI_API_KEY`.
- Production responses include baseline security headers through `vercel.json`.
- Treat all client save data, balances, inventory, rewards, timestamps, location, and game results as untrusted.

## Critical payout finding

The current game economy is client-authoritative: the browser calculates pension income, ad rewards, investments, dividends, and the withdrawal action. The existing withdrawal action only clears the local balance and displays a success message; it is not a real payment transaction. A user can also modify/import local save data.

**Do not enable real-money payouts from this build.** A secure payout system must move monetary authority to a backend and must never accept a client-supplied balance or payout amount as proof of entitlement.

Required production flow: authenticated server identity; server-side reward calculation; append-only ledger; unique transaction IDs; idempotency keys; eligibility/age/jurisdiction checks; fraud and velocity controls; server-only payout provider credentials; signed webhook verification; payout-state reconciliation; and audit logs. Imported saves, localStorage, sync codes, and client JavaScript must never authorize money movement.

## Google Play warning

The current game combines a cash-denominated balance/withdrawal UI with chance-based Bingo and other game-performance mechanics. Google Play's current real-money games policy generally does not allow game apps to let users wager/stake and obtain prizes of real-world monetary value except within permitted programs and loyalty rules. Review the current policy and applicable law before enabling cash redemption.

For a normal Google Play release, keep real-money payout functionality disabled unless the complete reward program has been reviewed for policy/legal compliance and the required Play declarations/approvals are complete.

## Credential rotation

A Gemini API key was previously embedded in the public `index.html`. It has been removed from this branch, but **removal from source does not revoke the old credential**. Rotate/revoke the exposed key in Google Cloud immediately and create a replacement key stored only as the deployment provider's server-side `GEMINI_API_KEY` secret.

## Release security tests

Run `npm ci`, `npm run lint`, `npm run build`, and `npm audit --audit-level=high`. Search tracked source and `dist/` for `AIza`, `GEMINI_API_KEY`, private keys, payment secrets, and OAuth secrets. Test corrupted/tampered saves, reward replay, duplicate payout requests, clock manipulation, offline-time manipulation, rapid ad rewards, and concurrent reward/withdrawal attempts.
