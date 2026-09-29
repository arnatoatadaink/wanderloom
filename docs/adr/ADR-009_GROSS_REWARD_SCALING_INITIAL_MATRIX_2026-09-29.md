# ADR-009 — Initial Gross Reward Scaling Matrix — 2026-09-29

## Status

**Accepted as initial L3 simulation baseline / tunable balance values**

This ADR extends `ADR-006`, `ADR-007`, and `ADR-008` with a simple gross-reward model that can be compared against the initial Gold-denominated Operational Cost model.

It does not select M6 scope, create CP-50+, or declare these values final production balance.

## Goal

Provide a deliberately simple reward matrix that satisfies the current product direction:

- larger formations can produce more total gross output,
- Solo remains competitive through very low operating cost and strong per-participant efficiency,
- the gross-output advantage of larger formations should diminish as operation duration becomes longer,
- the model must remain parameterized so a later formula can replace the initial matrix.

## Reward unit

For the first simulation model, reward is expressed in **Gold-equivalent reward units**.

This does not mean every expedition must literally award Gold only. EXP, drops, rarity value, or other rewards may later be converted to a Gold-equivalent valuation for simulator comparison.

The first reference value is:

```text
Solo / Short gross reward = 10 Gold-equivalent units
```

This is a simulation anchor, not a production reward amount.

## Initial gross-reward matrix

| Formation | Short | Medium | Long |
|---|---:|---:|---:|
| Solo | 10 | 40 | 120 |
| Party | 22 | 70 | 180 |
| Caravan | 45 | 120 | 260 |

Equivalent normalized multipliers relative to `Solo / Short = 1.0`:

| Formation | Short | Medium | Long |
|---|---:|---:|---:|
| Solo | 1.0 | 4.0 | 12.0 |
| Party | 2.2 | 7.0 | 18.0 |
| Caravan | 4.5 | 12.0 | 26.0 |

## Intended shape

The model intentionally gives larger formations higher total output while reducing their relative advantage at longer duration.

Relative gross-output advantage versus Solo:

```text
Party / Solo
Short  = 2.20x
Medium = 1.75x
Long   = 1.50x

Caravan / Solo
Short  = 4.50x
Medium = 3.00x
Long   = 2.17x
```

This creates the intended qualitative direction:

```text
short operations  -> larger formations have stronger gross-output advantage
long operations   -> Solo closes the relative gap through sustainability/efficiency
```

The exact crossover behavior remains tuning work.

## Initial net-reward matrix

Using ADR-008 formation operating costs and assuming no Travel Cost, explicit content cost, or cost reduction:

| Formation | Short | Medium | Long |
|---|---:|---:|---:|
| Solo | 10 | 40 | 120 |
| Party | 21 | 67 | 172 |
| Caravan | 41 | 108 | 228 |

Calculation:

```text
netReward = grossReward - effectiveOperationalCost
```

with initial operational costs:

```text
Solo    = 0 / 0 / 0
Party   = 1 / 3 / 8
Caravan = 4 / 12 / 32
```

Total formation net reward is therefore still larger for Party/Caravan, which preserves the reason to form groups.

## Per-participant interpretation

ADR-008 currently keeps cost flat inside each formation class. ADR-009 also does not yet vary gross reward by exact participant count.

Therefore per-participant values are intentionally reported as a range based on the current class boundaries.

### Party (2–4 participants)

| Duration | Net total | Per participant at 2 | Per participant at 4 |
|---|---:|---:|---:|
| Short | 21 | 10.5 | 5.25 |
| Medium | 67 | 33.5 | 16.75 |
| Long | 172 | 86.0 | 43.0 |

### Caravan (5–12 participants)

| Duration | Net total | Per participant at 5 | Per participant at 12 |
|---|---:|---:|---:|
| Short | 41 | 8.2 | 3.42 |
| Medium | 108 | 21.6 | 9.0 |
| Long | 228 | 45.6 | 19.0 |

### Solo

| Duration | Net per participant |
|---|---:|
| Short | 10 |
| Medium | 40 |
| Long | 120 |

This initial baseline intentionally makes Solo strong on per-participant efficiency while allowing larger formations to win on total output.

## Reward-per-cost metric

Because Solo formation operational cost is exactly zero in ADR-008, a direct `reward / operationalCost` ratio is undefined/infinite for Solo.

Therefore the simulator should not use that metric alone.

At minimum it should expose separately:

- gross reward,
- net reward,
- net reward per participant,
- net reward per hour,
- operational Gold consumed,
- sustainable repetition count under a finite Gold budget.

If Travel Cost or content entry cost is present, reward-per-total-Gold may also become meaningful for Solo.

## Parameterized reward boundary

As with Operational Cost, reward calculation should use one parameterized boundary rather than hard-coding this table across gameplay code.

Conceptual input:

```text
GrossRewardInput {
  formationClass,
  participantCount,
  durationClass,
  durationValue,
  zone,
  difficulty,
  risk,
  formationRewardParameters,
  durationRewardParameters,
  participantScalingParameters,
  contentModifiers,
  otherModifiers
}
```

Initial strategy:

```text
grossReward = rewardMatrix[formationClass][durationClass]
```

Future strategy:

```text
grossReward = g(
  formationClass,
  participantCount,
  duration,
  zone,
  risk,
  composition,
  progression,
  modifiers
)
```

The future function is intentionally not fixed here.

## Important simplification

The first model deliberately does **not** define Party reward splitting or Caravan reward distribution.

It treats reward as total formation output.

This allows the simulator to evaluate formation economics before deciding whether rewards are:

- evenly split,
- individually generated,
- role weighted,
- contribution weighted,
- partially shared and partially personal.

Those choices belong to later L3/L4 design.

## Tuning invariants

The exact values in this ADR may change without superseding ADR-006/007 provided that the later model preserves the intended product constraints:

1. Solo remains viable because of low operational cost.
2. Party and Caravan may have greater total gross output.
3. Larger formations do not dominate both total output and per-participant/net efficiency across all durations.
4. Longer duration should generally reduce the relative gross-output advantage of larger formations, unless an explicit specialization says otherwise.
5. Reward and Operational Cost remain independently measurable.

## Deferred decisions

Not fixed here:

- actual production Gold reward,
- actual EXP reward,
- drop valuation,
- rarity valuation,
- Party split rules,
- Caravan distribution rules,
- exact participant-count scaling,
- zone-specific reward curves,
- risk/reward premium,
- stamina interaction,
- Social Stress effects,
- cost-reduction item balance,
- final Short/Medium/Long durations.

## Result

The first complete L3 comparison model is now:

```text
Formation + Duration
      |                |
      |                +--> Gross Reward Matrix
      |
      +--> Operational Cost Model
                |
                v
        Effective Gold Cost
                |
                +------+
                       v
                Net Reward / Efficiency
```

The next design action is to define the **simulation metrics and acceptance ranges** used to judge whether a candidate balance preserves Solo competitiveness while still rewarding Party/Caravan formation.
