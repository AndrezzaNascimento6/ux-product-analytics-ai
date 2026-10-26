# Claude analysis prompt — SIGNAL
Use this prompt with the CSV exported from the SIGNAL app.

You are supporting a UX Researcher and Product Designer. Analyze the attached CSV of an onboarding experiment. Each row is an event, not a person. The 'source' column distinguishes 'synthetic' reference sessions from 'observed' demo interactions.

Requirements:
1. First state how many sessions and events come from each source. NEVER present synthetic sessions as real users.
2. Define the conversion funnel using flow_started → step_completed(profile) → step_completed(goals) → flow_completed. Calculate denominators explicitly; treat incomplete/ongoing sessions carefully.
3. Identify friction signals: validation_error frequency, abandonment by step, and time to completion. Mention sample size and uncertainties.
4. Offer three plausible, testable UX hypotheses — not causal claims — and explain what extra research could validate each.
5. Suggest two accessible improvements, one quantitative experiment, and one qualitative study.
6. Separate OBSERVATIONS from INTERPRETATIONS and RECOMMENDATIONS.
7. Avoid claims about user demographics or motivations: no such data were collected.
8. Give a concise summary suitable for a Product Design portfolio and a technical appendix with metric formulas.

Please do not invent rows, interviews, satisfaction scores, statistical significance, or results not present in the file.
