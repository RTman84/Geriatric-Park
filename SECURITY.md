# Security and payout policy

## Immediate security controls

- API credentials must be server-side only.
- Never commit Gemini, payment, payout, signing, OAuth, or database secrets.
- Production AI calls use `/api/gemini`; the browser never receives `GEMINI_API_KEY`.
- Production responses include baseline security headers through `vercel.json`.
- Treat all client save data, balances, inventory, rewards, timestamps, location, and game results as untrusted.

## Critical payout finding

The current game economy is client-authoritative: the browser calculates pension income, ad rewards, investments, dividends, and the withdrawal action. The existing withdrawal action only clears the local balance and displays a success message; it is not a real payment transaction. A user can also modify/import local save data.

**Do not enable real-money payouts from this build.** A secure payout system must move the monetary authority to a backend and must never accept a client-supplied balance or payout amount as proof of entitlement.

Required production flow:

1. Authenticate the player with a durable server-side identity.
2. Verify the player is eligible to receive the reward in the applicable jurisdiction and age category.
3. Record game/reward events server-side.
4. Calculate rewards server-side from trusted events.
5. Maintain an append-only ledger with unique transaction IDs.
6. Use idempotency keys for every payout request.
7. Re-check balance, eligibility, fraud/velocity limits, and transaction state immediately before payout.
8. Send the payout through a regulated payment provider from the server only.
9. Verify the provider's signed/webhook result server-side.
10. Mark the ledger transaction paid only after provider confirmation.
11. Reconcile provider transactions against the internal ledger.
12. Never let imported saves, localStorage, sync codes, or client JavaScript authorize money movement.

## Google Play warning

The current game contains chance-based Bingo and other game-performance mechanics alongside a cash-denominated balance and a withdrawal control. Google Play's real-money games policy generally does not allow game apps to let users wager/stake and obtain prizes of real-world monetary value except within its permitted programs and loyalty rules. Review the current policy before enabling any cash redemption on Google Play.

For a normal Google Play release, keep real-money payout functionality disabled unless the complete reward program has been reviewed for policy and legal compliance and the required Play declarations/approvals are complete.

## Credential rotation

A Gemini API key was previously embedded in the public `index.html`. It has been removed from the branch, but **removal from source does not revoke the old credential**. Rotate/revoke the exposed key in Google Cloud immediately and create a replacement key stored only as the deployment provider's server-side `GEMINI_API_KEY` secret.

## Security testing before release

- Run `npm ci` from the lockfile.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm audit` and review every high/critical finding.
- Search the repository and built artifacts for `AIza`, `GEMINI_API_KEY`, payment secrets, private keys, and OAuth secrets.
- Test imported/tampered save files; they must never create a path to real-money redemption.
- Test replaying reward requests and duplicate payout requests.
- Test client clock manipulation and offline-time manipulation.
- Test rapid repeated ad reward calls.
- Test concurrent reward/withdrawal requests.
- Test invalid JSON and oversized inputs to all server endpoints.

## Responsible deployment rule

A release is not considered payout-safe merely because the UI looks correct. Real-money entitlement must be established by trusted server records and independently reconciled payment-provider records.
