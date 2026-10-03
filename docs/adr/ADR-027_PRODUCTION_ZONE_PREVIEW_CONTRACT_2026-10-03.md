# ADR-027: Production Zone Preview Contract

Date: 2026-10-03
Status: Proposed

## Context

PR59 established a runtime-facing production Zone catalog without changing the existing M2 smoke playable loop. The next cutover step needs a production preview representation for Gold, EXP, failure risk, loss policy, and reachable rarity candidates.

Directly replacing `/api/zones.zones` before production start/duration resolution is active would make the Web select production Zone IDs that the current runtime cannot start. The preview contract therefore lands before endpoint cutover.

## Decision

Introduce a production Zone preview builder that derives, for Solo play:

- zoneId and display name
- minimumZoneRank and unlocked
- canonical short / medium / long durations
- success/failure Gold bounds after fixed Solo costs
- success/failure EXP bounds
- failureProbability
- production LossPolicy
- reachable rarity candidates

Gold preview uses the Solo production economy row:

- success Gold = max(0, grossReward - fixedGoldCost)
- failure Gold = max(0, grossReward * retainedGoldRatio - fixedGoldCost)

EXP preview uses production EXP reward and retainedExpRatio.

Drop count remains an intentionally coarse `0..1` preview until production rarity/drop runtime is wired in PR62.

## Compatibility

This ADR does not change `/api/zones`, start exploration, claim resolution, reward application, D1 persistence, or Web rendering. Existing M2 smoke runtime behavior remains authoritative until the later cutover PRs.

## Follow-up

- PR61: production start/duration resolution and safe endpoint exposure
- PR62: production claim Gold/EXP/failure resolution
- PR63: production rarity/drop runtime
- PR64: Web and full playable-loop cutover, if the split expands beyond the original five-PR estimate
