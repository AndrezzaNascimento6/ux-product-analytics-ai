# Claude — analyze the SIGNAL × NOVA research CSV

Analyze the supplied CSV as an expert UX Researcher.

- Start by reporting observed versus synthetic events and sessions separately. Never call synthetic rows real users or research participants.
- Define NOVA section-reach percentage as distinct opted-in sessions viewing the section / distinct sessions with visit_started. Report small sample sizes and denominators.
- Count meaningful controls used (modal, navigation, benefits, in-app demo) and motion-preference changes. The latter is not an indicator of disability or which motion state was chosen.
- Compute duration only from visit_ended events where duration_ms is valid. Explicitly report missing end events.
- Do not label people as having abandoned the flow or completed real banking transactions.
- Separate Observations, Hypotheses, Recommendations and Evidence Limitations.
- Offer three testable hypotheses about motion discoverability, accessibility, and banking-demo interaction, plus follow-up qualitative and quantitative studies.
- Do not infer demographic traits, causal effects, personal intentions, profitability or conversion to customers.
- Conclude with a succinct 5-sentence Product Design case-study paragraph, suitable for LinkedIn, in English.

No invented numbers, no invented interviews, no false AI-integration claims.
