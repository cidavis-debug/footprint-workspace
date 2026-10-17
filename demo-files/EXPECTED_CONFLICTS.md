# Atlas Rover demo set — planted conflicts

Fictional project. Upload all four files into one workspace, then run Analyze (it runs automatically on upload) and open Radar.

| # | Topic | Source A | Source B | Expected alert |
|---|---|---|---|---|
| 1 | Main bus voltage | Requirements PDF p.2: 24 V (approved) | Design review slide 2: 12 V; BOM: driver rated 12 V | Conflict (high) |
| 2 | Bus current | Requirements PDF: 15 A continuous | Slide 2: 10 A budget; BOM: driver max 10 A | Conflict |
| 3 | CAN bit rate | Requirements PDF + sync notes: 500 kbit/s | Slide 3: 1 Mbit/s | Interface mismatch |
| 4 | Operating temperature | Requirements PDF: -20 to 60 °C | Sync notes: -10 to 50 °C | Changed constraint |
| 5 | Enclosure rating | Requirements PDF: IP54 | Slide 4: IP65 | Conflict (lower severity) |
| 6 | Runtime assumption | Requirements PDF: 4 h (assumed) | Slide 5: 6 h (assumed); sync notes: not measured | Unsupported assumption |

Not conflicts (should NOT alert): mass 18 kg (PDF and notes agree), Wi-Fi 5 GHz (PDF and slides agree).

Suggested questions: "What is the main bus voltage?", "Which documents disagree about CAN speed?", "Which parts might not survive the 24 V bus?"

## Change-detection demo (`v2/Atlas-Rover-Requirements-v1.2.pdf`)

Same file name as the original, revised content. After the original set is uploaded and analyzed, upload the `v2` file and confirm the replace prompt. Expected in Radar → "Recent source changes" (v1 → v2):

- Changed: main bus 24 V → 12 V, CAN 500 kbit/s → 1 Mbit/s, temperature -20…60 °C → -10…50 °C, enclosure IP54 → IP65.
- Added: maximum vehicle speed 1.5 m/s.
- Alerts likely cleared: bus voltage, temperature, enclosure conflicts (the spec now agrees with the deck and notes).
- Alert likely raised: CAN rate (spec now says 1 Mbit/s, sync notes say 500 kbit/s).
- Note: the model's wording may vary; judge by the claim diff, which is computed deterministically.
