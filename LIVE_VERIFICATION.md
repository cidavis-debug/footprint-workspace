# Live verification checklist (Radar)

Automated tests cover only the deterministic parts (numeric mismatch hints, alert sorting, confidence and out-of-date hints, truncation notices, report output). They do **not** call Gemini or Supabase. Run this checklist in the real app, signed in, to verify the rest. Do not tick the roadmap item until it is done.

Demo files: `demo-files/` (see `demo-files/EXPECTED_CONFLICTS.md`). Model wording varies; judge by values and sources.

## Setup
- [ ] Create a new empty workspace.
- [ ] Upload `Atlas-Rover-Requirements-v1.2.pdf`, `Atlas-Design-Review.pptx`, `Atlas-BOM-v0.4.xlsx`, `Atlas-Weekly-Sync-Notes.docx`.
- [ ] Wait for analysis to finish on all four (source list shows "Analyzed").
- [ ] Open Radar for that workspace.

## Six planted conflicts (each should appear as an alert with both sources)
- [ ] 1. Main bus voltage: 24 V (PDF) vs 12 V (deck, BOM). Expected high severity.
- [ ] 2. Bus current: 15 A (PDF) vs 10 A (deck, BOM).
- [ ] 3. CAN bit rate: 500 kbit/s (PDF, notes) vs 1 Mbit/s (deck).
- [ ] 4. Operating temperature: -20 to 60 °C (PDF) vs -10 to 50 °C (notes).
- [ ] 5. Enclosure rating: IP54 (PDF) vs IP65 (deck). Lower severity.
- [ ] 6. Runtime: 4 h assumed (PDF) vs 6 h assumed (deck); notes say not measured. Unsupported assumption.

## Two non-conflicts (should NOT alert)
- [ ] Mass 18 kg (PDF and notes agree).
- [ ] Wi-Fi 5 GHz (PDF and deck agree).

## On each alert, also check
- [ ] Both source links open the evidence drawer with the quoted text and page/slide/sheet.
- [ ] Confidence label and "Likely out of date: …" or "Cannot tell which is current" line are shown and read sensibly.
- [ ] Claim confidence is shown in Claims & evidence and in the drawer.
- [ ] Feed is ordered high, medium, low (open before reviewed), newest first within a level.
- [ ] Review, Resolve, Dismiss work and the Resolved filter shows resolved alerts.
- [ ] Download report (.md) and Print/PDF include confidence and the out-of-date line.

## Chat
- [ ] "What is the main bus voltage?" cites both conflicting sources.
- [ ] "Which documents disagree about CAN speed?" names the PDF/notes and the deck.
- [ ] "Which parts might not survive the 24 V bus?" is grounded in the BOM.

## Change-detection demo (v2)
- [ ] Upload `demo-files/v2/Atlas-Rover-Requirements-v1.2.pdf` (same name) and confirm the replace prompt.
- [ ] Radar → Recent source changes (v1 → v2) shows: 24 V → 12 V, 500 kbit/s → 1 Mbit/s, -20…60 → -10…50 °C, IP54 → IP65; added max vehicle speed 1.5 m/s.
- [ ] Voltage, temperature and enclosure alerts clear; a CAN rate alert is raised.

## Long documents
- [ ] Upload a source with more than 60,000 characters: the source's Engineering context, Radar ("Limited analysis") and the evidence drawer all say only the first 60,000 characters were analyzed.
- [ ] Optional: a source over 200,000 characters shows the extraction notice.

## Hardware claims (part numbers, revisions, BOM quantities, tolerances, ECO/ECN)
- [ ] After analysis, the BOM source has claims such as subject = part/assembly, attribute = part number / revision / quantity per assembly.
- [ ] A document citing a different revision or quantity of the same part produces a possible-conflict alert.

## Not verifiable offline
- [ ] Cross-workspace RLS: a second account cannot see this workspace's alerts or sources.
- [ ] `GEMINI_MODEL` (or the default `gemini-3.8-flash`) is a model ID the Gemini API accepts. A 404 in chat shows "its name needs updating".
