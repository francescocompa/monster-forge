# CR calibration memo — T1.2 (settles Q1.A's numbers)

> Produced 2026-07-08 by the Phase 1 calibration spike (TASKS.md T1.2). This memo is the paper
> trail for the numbers in `data.js`'s `CR_EXPECT` table: what was measured, against what, and
> which judgment calls shaped the final values. T1.5 (corpus regression run) re-grades this table
> with the real DPR extractor; expect a rev then.

## Verdict

**The hybrid model (Q1.A) lands on the app's existing empirical line, not on the book table.**
The raw 2014 DMG p.274 table misses published 2024 monsters badly — its HP column alone is off by
a **median 44%** (a corpus-typical CR 5 monster has ~94 HP; the 2014 table expects 131–145, and
would read it as defensive CR ~2). The app's pre-existing `BOH` table — an empirical
Blog-of-Holding-style fit — tracks the 2024 corpus closely at almost every CR. The calibrated
`CR_EXPECT` is therefore **BOH's shape, re-anchored on 2024 corpus medians**, with the raw 2014
table kept below for reference only.

Median |residual| vs the corpus (dense CRs 0–17; HP/DPR relative, others absolute):

| table | AC | HP | Atk | DC | DPR |
|---|---|---|---|---|---|
| **calibrated (adopted)** | 1 | **0.15** | 1 | **0.5** | **0.17** |
| BOH (live UI today) | 1 | 0.16 | 1 | 1 | 0.18 |
| 2014 DMG p.274 | 1 | **0.44** | 1 | 1 | 0.20 |

The calibrated table's real wins over BOH are the **save DC column** (BOH runs ~1 low throughout,
~2 low at CR 0) and **low-CR AC** (corpus median is 11.5–13 at CR 0–2, not 13–14). HP/Atk/DPR are
a statistical wash vs BOH — which is exactly why BOH was left driving the live Forge suggestions
untouched (see Decisions).

## Corpus & method

- **Corpus:** `XMM_Statblocks.md` (2024 Monster Manual mirror, 503 monsters), parsed 503/503.
  Coverage is dense to CR 13, thin at 14–17 (n=4–7), sparse at 18+ (n≤5), **empty at 26–29**.
- **Extractor** (spike-grade, scratch scripts — not the T1.4 DPR extractor):
  - AC/HP/CR read directly; attack bonus = best parsed `m/r N` to-hit; save DC = best of
    save-effect DCs and spell save DC (present on 231/503 blocks — selection bias noted).
  - DPR = 3-round estimate: multiattack routine (named counts, "N other attacks", generic
    fallback) with best "or"-branch damage + "plus" riders; save-effect damage at full failure
    value, ×2 targets when AoE; a limited-use nova (recharge/X-day) replaces round 1 when it
    beats the routine. 487/503 rated ok-confidence.
  - **Known blind spots:** legendary actions and most spellcaster routines are NOT counted →
    parsed DPR above ~CR 12 is a **floor**, not an estimate (an Ancient Red Dragon parses at
    ~119; its legendary Rends add ~+40). Handled in construction (below), fixed properly in T1.4.

## Construction rules for the calibrated table

1. **Dense region (CR 0–11):** pooled corpus medians — the window widens over adjacent CR
   buckets until ≥12 samples (max ±2 buckets); forced monotone.
2. **Thin region (CR 12–17):** pooled medians blended 50/50 with BOH — the corpus genuinely dips
   below BOH's HP here (medians 178–243 vs BOH 195–270) but n is too small to fully trust the
   dip, and an unblended table plateaus (three CRs at HP 197), which would make the inverse
   lookup (HP → defensive CR) ambiguous.
3. **Sparse region (CR 18–30):** BOH values, with two corpus-documented nudges: **Atk +1 at CR
   19–25** and **DC +1 at CR 21+** (the few real monsters there sit consistently above BOH on
   both). CR 26–29 are pure interpolation — no 2024 monsters exist at those CRs.
4. **DPR at CR 13+:** BOH's line, not the parsed corpus (see blind spots — the corpus number is
   a legendary-blind floor; BOH's own line was fit on published books including legendaries and
   the parsed floor + estimated legendary damage lands on it).
5. **HP/DPR mids strictly increasing**; bands drawn halfway to the neighboring CR's midpoint, so
   the bands tile the number line with no gaps or overlaps.

## The calibrated table (adopted into `CR_EXPECT`, Batch 259)

| CR | n | AC | HP (mid) | Atk | DPR (mid) | DC |
|---|---|---|---|---|---|---|
| 0 | 32 | 12 | 1–6 (3) | +2 | 1–3 (1) | 11 |
| 1/8 | 24 | 12 | 7–11 (8) | +4 | 4–5 (5) | 11 |
| 1/4 | 44 | 13 | 12–16 (13) | +4 | 6–7 (6) | 11 |
| 1/2 | 34 | 13 | 17–23 (19) | +4 | 8–9 (7) | 11 |
| 1 | 41 | 13 | 24–36 (26) | +4 | 10–13 (10) | 12 |
| 2 | 59 | 13 | 37–55 (45) | +5 | 14–19 (16) | 12 |
| 3 | 41 | 14 | 56–68 (65) | +5 | 20–24 (22) | 13 |
| 4 | 27 | 15 | 69–82 (71) | +5 | 25–30 (27) | 13 |
| 5 | 36 | 15 | 83–102 (94) | +7 | 31–39 (34) | 14 |
| 6 | 23 | 15 | 103–118 (110) | +7 | 40–45 (44) | 14 |
| 7 | 16 | 16 | 119–131 (127) | +7 | 46–51 (45) | 15 |
| 8 | 23 | 16 | 132–146 (136) | +7 | 52–57 (56) | 15 |
| 9 | 12 | 18 | 147–159 (157) | +9 | 58–58 (57) | 16 |
| 10 | 16 | 18 | 160–179 (162) | +9 | 59–66 (59) | 17 |
| 11 | 12 | 18 | 180–198 (197) | +10 | 67–76 (74) | 17 |
| 12 | 7 | 18 | 199–200 (198) | +10 | 77–81 (78) | 17 |
| 13 | 9 | 18 | 201–206 (201) | +10 | 82–87 (84) | 17 |
| 14 | 4 | 18 | 207–219 (210) | +10 | 88–93 (90) | 18 |
| 15 | 6 | 18 | 220–236 (228) | +11 | 94–99 (96) | 18 |
| 16 | 7 | 19 | 237–251 (245) | +12 | 100–105 (102) | 19 |
| 17 | 7 | 19 | 252–271 (257) | +12 | 106–111 (108) | 20 |
| 18 | 1 | 20 | 272–293 (285) | +13 | 112–117 (114) | 20 |
| 19 | 1 | 20 | 294–308 (300) | +14 | 118–123 (120) | 20 |
| 20 | 4 | 20 | 309–333 (315) | +15 | 124–129 (126) | 21 |
| 21 | 5 | 21 | 334–375 (350) | +15 | 130–135 (132) | 22 |
| 22 | 3 | 21 | 376–425 (400) | +16 | 136–141 (138) | 23 |
| 23 | 5 | 21 | 426–475 (450) | +16 | 142–147 (144) | 23 |
| 24 | 2 | 22 | 476–525 (500) | +17 | 148–153 (150) | 24 |
| 25 | 1 | 22 | 526–575 (550) | +17 | 154–159 (156) | 24 |
| 26 | 0 | 22 | 576–625 (600) | +17 | 160–165 (162) | 25 |
| 27 | 0 | 22 | 626–675 (650) | +17 | 166–171 (168) | 25 |
| 28 | 0 | 22 | 676–725 (700) | +18 | 172–177 (174) | 26 |
| 29 | 0 | 22 | 726–775 (750) | +18 | 178–183 (180) | 26 |
| 30 | 1 | 22 | 776–825 (800) | +19 | 184–189 (186) | 27 |

(`n` = 2024 MM monsters at that CR. PB is not in the tuple — `crExpected()` folds in `pbForCR`.)

## Reference: the raw 2014 DMG p.274 table (NOT adopted)

Kept only so future sessions don't re-transcribe it. Columns: AC · HP · Atk · DPR · DC.

| CR | AC | HP | Atk | DPR | DC | | CR | AC | HP | Atk | DPR | DC |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 13 | 1–6 | +3 | 0–1 | 13 | | 14 | 18 | 266–280 | +8 | 87–92 | 18 |
| 1/8 | 13 | 7–35 | +3 | 2–3 | 13 | | 15 | 18 | 281–295 | +8 | 93–98 | 18 |
| 1/4 | 13 | 36–49 | +3 | 4–5 | 13 | | 16 | 18 | 296–310 | +9 | 99–104 | 18 |
| 1/2 | 13 | 50–70 | +3 | 6–8 | 13 | | 17 | 19 | 311–325 | +10 | 105–110 | 19 |
| 1 | 13 | 71–85 | +3 | 9–14 | 13 | | 18 | 19 | 326–340 | +10 | 111–116 | 19 |
| 2 | 13 | 86–100 | +3 | 15–20 | 13 | | 19 | 19 | 341–355 | +10 | 117–122 | 19 |
| 3 | 13 | 101–115 | +4 | 21–26 | 13 | | 20 | 19 | 356–400 | +10 | 123–140 | 19 |
| 4 | 14 | 116–130 | +5 | 27–32 | 14 | | 21 | 19 | 401–445 | +11 | 141–158 | 20 |
| 5 | 15 | 131–145 | +6 | 33–38 | 15 | | 22 | 19 | 446–490 | +11 | 159–176 | 20 |
| 6 | 15 | 146–160 | +6 | 39–44 | 15 | | 23 | 19 | 491–535 | +11 | 177–194 | 20 |
| 7 | 15 | 161–175 | +6 | 45–50 | 15 | | 24 | 19 | 536–580 | +12 | 195–212 | 21 |
| 8 | 16 | 176–190 | +7 | 51–56 | 16 | | 25 | 19 | 581–625 | +12 | 213–230 | 21 |
| 9 | 16 | 191–205 | +7 | 57–62 | 16 | | 26 | 19 | 626–670 | +12 | 231–248 | 21 |
| 10 | 17 | 206–220 | +7 | 63–68 | 16 | | 27 | 19 | 671–715 | +13 | 249–266 | 22 |
| 11 | 17 | 221–235 | +8 | 69–74 | 17 | | 28 | 19 | 716–760 | +13 | 267–284 | 22 |
| 12 | 17 | 236–250 | +8 | 75–80 | 17 | | 29 | 19 | 761–805 | +13 | 285–302 | 22 |
| 13 | 18 | 251–265 | +8 | 81–86 | 18 | | 30 | 19 | 806–850 | +14 | 303–320 | 23 |

## Decisions taken (2026-07-08, via AskUserQuestion)

- **Q1.A resolved as hybrid**, and the hybrid resolved to the calibrated table above —
  **adopted into `CR_EXPECT` in Batch 259** (the raw 2014 numbers lived in `CR_EXPECT` for one
  batch, B258, and survive only in this memo).
- **`BOH` stays as the live Forge-suggestion driver until T1.5.** The two tables differ by ±1 on
  most columns and +1–2 on DCs; unifying them (BOH deriving from `CR_EXPECT`, or retiring) is
  T1.5's job, after the regression run grades the calibrated table. Do not let a third table
  appear in the meantime.

## Open items

- **T1.4** (real DPR extractor) re-grades the DPR column — the CR 13+ values are inherited from
  BOH's line, not measured, and the sub-13 values come from a spike parser with documented blind
  spots.
- **T1.5** (corpus regression run) decides the BOH unification and may retune any column;
  outliers get dispositioned with the user (parser bug / miscalibration / mislabeled monster).
- CR 26–29 have **no 2024 monsters at all** — those rows are interpolation and should be marked
  low-confidence in any UI that surfaces divergence.
