# Proving a test discriminates

A test that passes tells you nothing until you have seen it fail for the right
reason. Before trusting any test that pins behaviour you cannot re-derive —
parity ports, golden replays, scoring and pricing formulas — **break the
implementation on purpose and watch that specific test go red.**

## Where this came from

The LogicRush contest scoring formula was ported from legacy Java as
`P − M × (P / 250) …`. In Java both operands are `int`, so `P / 250` is integer
division: a 100-point problem decays by `100/250 = 0` points per minute. It was
written up as real division in four places — the glossary, the shared package,
an ADR, and the issue that specified it.

The issue's one numeric check was *"a 500-point problem loses 2 points per
minute"*. That is true under **both** readings, because `500/250` is exactly 2
either way. The test was green, looked like a parity pin, and could not detect
the defect it existed to prevent. Every production point value is a multiple of
250, which is why nine years of use never surfaced it either.

The fix was two extra cases — 100 points and 300 points — chosen precisely
because integer and real division **disagree** there. Then the implementation was
mutated back (`Math.trunc(p / 250)` → `p / 250`) to confirm those two cases fail
and the 500-point case still passes.

## The practice

1. Write the test.
2. Change the implementation to the wrong thing you are guarding against.
3. Confirm **that** test fails, and note which of your cases did not.
4. Revert, confirm green.

Step 3 is the whole point. A case that stays green through the mutation is
decoration, and the mutation tells you so in seconds.

## How to pick the cases

Choose inputs where the right and wrong implementations **produce different
outputs**. Round numbers are usually where the two agree — which is exactly why
they are the tempting example and the useless test. Reach for the boundary, the
non-multiple, the negative, the empty set.

Corollary for ports: integer division, truncation toward zero versus floor, and
integer overflow are the three places a language-to-language port silently
diverges. Pin each with a case that could only pass in one language.
