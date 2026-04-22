# WaxFrame Dry-Run Test Sheet

Copy fields into Setup 3. Paste the Starting Document into Setup 4. Run rounds until convergence. Log actual round count at the bottom.

---

## Quick Start — Chocolate Chip Cookies

### Project screen

**Project name:** Chocolate Chip Cookies
**Version:** v1
**Document type:** Recipe
**Target audience:** Home cook, beginner level, someone who has never baked cookies before
**Desired outcome:** Anyone following this recipe can bake chocolate chip cookies successfully on the first try. Instructions are clear, ingredient quantities are precise, and steps are in a logical order with nothing assumed.
**Scope & constraints:** Classic American-style chocolate chip cookies. Pantry staples only. No brown butter, no overnight chilling, no stand mixer required. Include ingredient list with quantities, numbered steps, yield, and oven temperature in Fahrenheit. End with a short storage note and how to tell when they are done.
**Tone & voice:** Warm and conversational, like a friend walking someone through their first bake
**Additional instructions:** Do not substitute ingredients without flagging them as optional variations. Do not invent cooking times — flag anything uncertain.

**Length Constraint:** leave blank

### Starting Document

Use **Start from Scratch**. Before Round 1, open the Notes drawer and paste:

```
Classic chocolate chip cookies. Yields about 24 cookies. Ingredients: flour, butter, white sugar, brown sugar, eggs, vanilla, baking soda, salt, semi-sweet chocolate chips. No nuts. Oven at 375°F.
```

---

## 1. Résumé

### Project screen

**Project name:** Senior Wireless Engineer resume
**Version:** v1
**Document type:** Resume
**Target audience:** Hiring managers and technical recruiters at defense and aerospace companies. Screeners are senior wireless engineers evaluating CWNA/CWDP/CWAP-level expertise.
**Desired outcome:** A hiring manager skims this in 30 seconds and immediately sees why I belong in their interview loop. Technical depth is front-loaded, quantified wins replace generic duty statements, and every bullet ties to outcomes the reader cares about.
**Scope & constraints:** One page. Keep only relevant wireless / RF / enterprise networking experience. Do not invent certifications, employers, or dates. Prioritise the most recent five years. Summary section no longer than two sentences.
**Tone & voice:** Confident, direct, zero fluff. Past-tense action verbs. No adjectives like "passionate" or "results-driven".
**Additional instructions:** Do not change any employer names, job titles, dates, or certifications. If something in the source is unclear, flag it rather than invent. Keep the CWNA / CWDP / CWAP stack visible at the top.

**Length Constraint:** 1 Page

### Starting Document (paste into Setup 4)

```
R. David Paine III
Senior Wireless Engineer | Costa Mesa, CA | davidpaine@email.com | 555-0100

SUMMARY
Senior wireless engineer with deep experience in enterprise and industrial RF environments. Passionate about building reliable networks and delivering results-driven solutions for complex clients.

CERTIFICATIONS
CWNA, CWDP, CWAP

EXPERIENCE

Anduril Industries (Contractor) — Senior Wireless Network Engineer
2023 to present
- Responsible for wireless design across multiple manufacturing sites
- Did Ekahau predictive and post-validation surveys
- Worked on Aruba ArubaOS 8.x on-prem deployments
- Helped with integration of Okta, Kolide, and Cloudflare identity stack
- Participated in warehouse and industrial RF troubleshooting

Previous Employer — Network Engineer
2019 to 2023
- Managed Ruckus and Cisco Meraki wireless environments
- Did site surveys and client installs
- Helped junior engineers learn the ropes

Earlier Employer — Network Technician
2015 to 2019
- Maintained corporate Wi-Fi
- Handled help desk tickets
- Assisted with cable runs and AP mounting

EDUCATION
Some college coursework in information technology

TOOLS
Ekahau, iBwave, Android Studio, Jamf MDM, Okta, Kolide, Cloudflare
```

---

## 2. Cover Letter

### Project screen

**Project name:** Cover letter — Principal Wireless Engineer at Lockheed
**Version:** v1
**Document type:** Cover letter
**Target audience:** Hiring manager for a Principal Wireless Engineer role at a defense prime contractor. Reader is technical, has been burned by unqualified candidates before, and scans cover letters in under a minute.
**Desired outcome:** Hiring manager finishes reading and wants to interview me. The letter connects my specific background to the role as posted, demonstrates I understand what the job actually requires, and makes a clear case for a conversation.
**Scope & constraints:** Three paragraphs maximum. Do not repeat the resume. Do not open with "I am writing to apply for". No filler phrases. Mention one or two specific things from my background that map directly to the posted requirements.
**Tone & voice:** Professional, confident, specific. Warm but not familiar. No jargon that doesn't appear in the job posting.
**Additional instructions:** Do not invent projects or employers. If the opening paragraph sounds generic, rewrite it. The reader should know by line three why I specifically am worth interviewing.

**Length Constraint:** 400 Words

### Starting Document (paste into Setup 4)

```
Dear Hiring Manager,

I am writing to apply for the Principal Wireless Engineer position at your company. I am very passionate about wireless networking and believe I would be a great fit for your team.

I have over 10 years of experience in the networking field, including my current role at Anduril Industries as a Senior Wireless Network Engineer. I hold CWNA, CWDP, and CWAP certifications and have deep experience with Aruba, Ruckus, and Cisco Meraki platforms. I have also worked extensively with Ekahau for predictive and validation site surveys across warehouse and industrial environments.

In my current role I have designed wireless infrastructure for multiple manufacturing sites, integrated identity systems across Okta, Kolide, and Cloudflare, and mentored junior engineers. I am looking for a role where I can take on more architectural responsibility and contribute to a larger mission.

I would welcome the opportunity to discuss how my background aligns with your needs. Thank you for your consideration.

Sincerely,
R. David Paine III
```

---

## 3. Business Proposal

### Project screen

**Project name:** Warehouse Wi-Fi upgrade proposal — Acme Distribution
**Version:** v1
**Document type:** Business proposal
**Target audience:** Acme Distribution leadership — primary reader is the VP of Operations (budget authority, non-technical), secondary reader is the IT Director (technical validator). They need to agree on both the business case and the technical approach.
**Desired outcome:** Both readers approve the proposal and sign off on the project. The VP of Operations understands the ROI and operational impact. The IT Director is confident in the technical design. No one has unanswered questions after reading.
**Scope & constraints:** Cover: current state pain points, proposed solution, technical approach at high level, timeline, cost, ROI. Do not go deep on product SKUs — keep technical specifics at an architecture level. Keep the exec summary to one page.
**Tone & voice:** Professional, confident, direct. Not salesy. Data-first when discussing ROI.
**Additional instructions:** Do not change the pricing table. Do not add any new phases to the timeline. Flag any ROI claim that cannot be supported by the source data.

**Length Constraint:** 6 Pages

### Starting Document (paste into Setup 4)

```
PROPOSAL — WAREHOUSE WI-FI UPGRADE FOR ACME DISTRIBUTION

Executive Summary
Acme Distribution's current Wi-Fi is over 8 years old and causes daily disruption to warehouse operations. We propose a full wireless refresh using modern Wi-Fi 6E infrastructure across the 400,000 sq ft facility.

Current State
The existing wireless network was installed in 2016. It uses 802.11ac access points and has not been expanded as warehouse racking and operations have grown. Site surveys show coverage gaps in aisles 14-22 and on the mezzanine. Forklift-mounted scanners lose connectivity during peak hours.

Proposed Solution
We will deploy Wi-Fi 6E access points throughout the facility with a controller-based architecture. Design will be validated with Ekahau before and after install. We will also refresh the core switching and provide 90 days of post-deployment support.

Timeline
Phase 1: Site survey and design — 2 weeks
Phase 2: Procurement — 4 weeks
Phase 3: Install — 3 weeks
Phase 4: Validation and tuning — 1 week
Phase 5: Post-deployment support — 90 days

Pricing
Hardware: $185,000
Professional services: $72,000
Total: $257,000

Expected Benefits
Better coverage. Faster scanners. Less downtime.
```

---

## 4. RFP Response

### Project screen

**Project name:** RFP response — City of Oakland wireless infrastructure RFP
**Version:** v1
**Document type:** RFP response
**Target audience:** City of Oakland evaluation committee — mix of IT procurement officers, a technical evaluator from the city's IT department, and a compliance reviewer. They will score this against a published rubric.
**Desired outcome:** Every single stated requirement in the RFP is addressed explicitly, in the order the RFP presents them, with clear evidence of capability. Evaluators can check every box without hunting. Our scoring is maximised on every criterion.
**Scope & constraints:** Every requirement in Section 4 of the RFP must be addressed with a compliance statement and supporting detail. Do not skip any. Do not answer in narrative prose — use the RFP's own headings. Keep executive summary to two pages.
**Tone & voice:** Formal, disciplined, structured. No marketing language. Every claim backed by specifics.
**Additional instructions:** Do not invent past project references. If a requirement cannot be fully met, flag it as "partially compliant" and explain — do not omit. The price quote in Section 7 is final — do not let the AIs adjust it.

**Length Constraint:** 40 Pages

### Starting Document (paste into Setup 4)

```
RESPONSE TO CITY OF OAKLAND RFP 2026-WIFI-001
Prepared by: [Vendor Name]

1. Executive Summary
[Vendor Name] is pleased to respond to the City of Oakland's RFP for wireless infrastructure modernisation. We have 15 years of experience deploying enterprise wireless in municipal environments including the Cities of Fresno, Modesto, and Stockton.

2. Company Overview
Founded in 2011. Headquartered in Costa Mesa, CA. 42 employees. CWNP-certified engineering staff of 8.

3. Understanding of Requirements
The City of Oakland requires a refresh of wireless infrastructure across 12 city buildings totalling approximately 2.1M square feet, integration with existing Active Directory, 24/7 support for 3 years, and full compliance with the city's cybersecurity framework.

4. Response to Technical Requirements
4.1 Coverage: We will design for -65 dBm minimum at all client locations.
4.2 Capacity: Our design supports 3,500 concurrent devices across all buildings.
4.3 Security: WPA3-Enterprise throughout.
4.4 Management: Cloud-based management platform with role-based access.
(Other requirements to be addressed)

5. Proposed Solution Architecture
Controller-less cloud-managed Wi-Fi 6E across all buildings with redundant internet uplinks per site.

6. Implementation Plan
Phased rollout over 6 months starting with City Hall.

7. Pricing
Total fixed price: $1,285,000. DO NOT ADJUST.

8. References
To be provided.
```

---

## 5. Thank-You Letter

### Project screen

**Project name:** Thank-you letter — post-interview, Lockheed Principal role
**Version:** v1
**Document type:** Thank-you letter
**Target audience:** The hiring manager who interviewed me for the Principal Wireless Engineer role at Lockheed. Technical leader, busy, reads email on mobile.
**Desired outcome:** The hiring manager remembers me favourably and is reinforced in their decision to move me forward. The note reflects that I was paying attention in the interview — references one specific thing we discussed — without being sycophantic.
**Scope & constraints:** Short — four sentences maximum. One specific reference to something discussed. One forward-looking line. No recap of my resume. No "I am the best candidate" language.
**Tone & voice:** Warm, professional, genuine. Like a real person wrote it. Not a template.
**Additional instructions:** Do not invent interview content that wasn't in the source notes. If the opening sentence sounds generic, rewrite it.

**Length Constraint:** 120 Words

### Starting Document (paste into Setup 4)

```
Interview notes (convert this into a real thank-you email):

Interviewed Tuesday with Sarah Chen (hiring manager, Principal Wireless Engineer role).
We talked about the warehouse site survey approach she wants to standardise across 12 sites.
She mentioned frustration with inconsistent Ekahau methodology between contractors.
I offered to share the documentation template I built at Anduril for this exact problem.
Next step: panel interview next week with her team lead and two senior engineers.
```

---

## 6. Executive Summary

### Project screen

**Project name:** Exec summary — Q3 2026 wireless operations report
**Version:** v1
**Document type:** Executive summary
**Target audience:** C-suite at a defense contractor — CEO, COO, CFO. All non-technical, all time-constrained, all allergic to jargon. They will read this in 90 seconds to decide whether to ask a follow-up.
**Desired outcome:** Leadership walks away knowing the three things that matter: what's working, what isn't, and what decisions they need to make. The document does not require them to read the full 40-page report underneath.
**Scope & constraints:** One page. Lead with the business impact, not the technical detail. Translate every metric into "what this means for the business". Do not add recommendations that don't appear in the full report. No bullet point longer than two lines.
**Tone & voice:** Direct, confident, plain English. No acronyms without expansion on first use. No hedging.
**Additional instructions:** Keep the three key metrics table as-is. Do not remove it. Do not invent numbers that don't appear in the source report.

**Length Constraint:** 1 Page

### Starting Document (paste into Setup 4)

```
Q3 2026 WIRELESS OPERATIONS SUMMARY

During Q3 we completed wireless refreshes at three manufacturing sites: Anaheim, Phoenix, and Huntsville. All three deployments were on time and within 5 percent of budget. Post-deployment client metrics show average throughput improvements of 340 percent and connection stability improvements of 91 percent.

The Phoenix deployment encountered unexpected RF interference from adjacent industrial equipment which required an additional 12 access points and delayed go-live by 9 business days. Total unbudgeted cost: $34,000. We are developing a standardised pre-deployment RF scan to catch this earlier in future projects.

Headcount grew by 4 engineers, bringing the team to 22. We are still short-staffed for the Q4 deployment pipeline of 5 sites and recommend approving the 3 additional hires currently in the requisition queue.

Customer satisfaction scores rose from 7.2 to 8.9 out of 10 quarter over quarter.

Key metrics:
- Sites refreshed: 3
- Budget variance: -4.8 percent
- Throughput improvement: +340 percent average
- Unbudgeted costs: $34K (Phoenix interference issue)
- CSAT: 7.2 → 8.9

Recommendations for leadership:
1. Approve 3 additional engineer hires to support Q4 pipeline.
2. Fund development of pre-deployment RF scan methodology ($18K one-time).
3. Accelerate Huntsville-style deployment template to remaining 6 manufacturing sites.
```

---

## 7. Presentation Outline

### Project screen

**Project name:** Presentation — Wi-Fi 7 migration strategy for IT leadership
**Version:** v1
**Document type:** Presentation outline
**Target audience:** IT leadership at a mid-sized enterprise — CIO, Network Director, Infrastructure Manager. Mixed technical depth. 30-minute slot with 10 minutes for questions.
**Desired outcome:** Leadership leaves the meeting agreeing to fund a Wi-Fi 7 pilot in Q1 2027. The outline tells a complete story: why now, what's different about Wi-Fi 7, what the pilot looks like, what it costs, what we learn from it, what comes next.
**Scope & constraints:** 14 slides including title and Q&A. Each slide: headline, 3-5 speaker bullets, and a note if there's a visual needed. Do not go deep on 802.11be technical details — keep those on a "deeper technical reference" backup slide. One clear ask on the closing slide.
**Tone & voice:** Professional, confident, data-first. Exec-friendly language on narrative slides, technical precision on the technical slide.
**Additional instructions:** Do not invent vendor names or product models. If specific pricing would be useful but isn't in the source notes, flag as "[pricing TBD]" rather than inventing.

**Length Constraint:** leave blank

### Starting Document (paste into Setup 4)

```
Pilot proposal notes (convert into a 14-slide presentation outline):

We want to pilot Wi-Fi 7 at one site in Q1 2027 before recommending a broader rollout.

Reasons:
- Current Wi-Fi 6 infrastructure hitting capacity ceilings on some floors
- New AR/VR training equipment requires Wi-Fi 7 for stable multi-user sessions
- Vendor partner ecosystem for Wi-Fi 7 is now mature enough to avoid early-adopter tax
- Competitive parity — two peer companies in our industry announced Wi-Fi 7 rollouts in 2026

Pilot scope:
- Single 50,000 sq ft site: Anaheim engineering office
- Replace 24 existing APs with Wi-Fi 7 equivalents
- 8-week duration: 2 weeks design, 3 weeks deployment, 3 weeks measurement
- Success criteria: 99.5% client connectivity, latency under 5ms, zero unplanned downtime
- Estimated cost: $95K hardware + $32K services

What we'll learn:
- Real-world multi-gig client performance under our load
- Power and PoE budget impact
- Controller behavior with mixed-generation clients
- Vendor support responsiveness on new-gen platform

If pilot succeeds, recommend phased rollout to remaining 11 sites over 2027-2028.

If pilot fails or shows marginal improvement, defer Wi-Fi 7 decision to 2028 and invest in targeted Wi-Fi 6E upgrades at congested sites.
```

---

## 8. Blog Post / Article

### Project screen

**Project name:** Blog post — Ekahau survey methodology for warehouse RF
**Version:** v1
**Document type:** Blog post
**Target audience:** Mid-career wireless engineers responsible for industrial and warehouse deployments. Technical, skeptical of vendor hype, they want practical tips they can apply on their next site.
**Desired outcome:** Reader finishes the post with at least two specific techniques they'll try on their next warehouse survey. They share it with their team. Post ranks on Google for "warehouse wifi survey" within 60 days.
**Scope & constraints:** 1,000 to 1,400 words. Focus on Ekahau-specific methodology but keep it vendor-neutral enough that Hamina users get value too. Include: the common mistake, why it matters in warehouses specifically, and the corrected approach. Do not turn this into a vendor ad.
**Tone & voice:** Practical, direct, engineer-to-engineer. First-person where relevant ("I ran into this last year at a 400K sq ft DC"). Not salesy.
**Additional instructions:** Do not invent site names or client names. Do not claim industry statistics that aren't in the source notes. Keep the closing CTA soft — "let me know what you do differently" — not "contact us for a consultation".

**Length Constraint:** 1400 Words

### Starting Document (paste into Setup 4)

```
Outline notes (turn into a full 1,200-word blog post):

Title: Why your warehouse Wi-Fi survey is probably wrong

Key points to cover:

1. The common mistake: surveying at eye level with the laptop antenna.
Most surveys are done by walking the floor holding a laptop. The antenna is at ~5 feet. But your actual clients — forklift-mounted scanners, headset barcode readers, tablet-on-cart workflows — are almost never at that height. They're at 8 feet (forklift cab), 3 feet (cart-mounted), or 6 feet (head-height headset).

2. Why this hurts in warehouses specifically.
In an office, height doesn't matter much because there's drywall and furniture between you and the AP. In a warehouse, the RF environment is dominated by racking, steel shelving, and stacked pallets. Moving the survey antenna 3 feet up or down changes everything. Signal reflects, bounces, and attenuates completely differently at 3 feet vs 8 feet.

3. The corrected approach.
Use a survey rig that mounts the NIC at the actual client height. For a warehouse with forklift scanners, that means a telescoping pole survey at 8 feet. For tablet-on-cart workflows, it's 3 feet. Run separate surveys for each client height if you have mixed workflows. It's tedious. It's correct.

4. What this does to your heatmap.
I've seen the same warehouse look "fully covered" at 5 feet and show massive holes at 8 feet — coverage that would absolutely fail for forklift scanners during peak operations.

5. Practical tips:
- Ask the client what devices are on the network and at what height they operate
- Build survey runs at each operational height
- Validate with real client radios, not just the laptop

Closing: if you've been surveying at eye level your whole career, you're not alone. I did too for the first 5 years. Hopefully this saves someone else a post-deployment rework.
```

---

## 9. Job Description

### Project screen

**Project name:** Job description — Senior Wireless Network Engineer
**Version:** v1
**Document type:** Job description
**Target audience:** Mid-to-senior wireless engineers with 5-10 years of experience. They read job posts quickly and care about: what they'll actually work on, the tech stack, comp range, and how serious the employer is about wireless as a discipline.
**Desired outcome:** Strong candidates apply. The post attracts people who actually have warehouse/industrial RF experience, not generic network generalists. Weak applications drop off by self-selection.
**Scope & constraints:** Include: company one-liner, role one-liner, what you'll do (5-8 bullets), what you need (5-7 bullets), nice-to-haves (3-4 bullets), comp range, location / remote policy, interview process overview. Do not use "ninja", "rockstar", "passionate team player", or any other recruiter clichés. Do not gatekeep with unnecessary requirements like "Bachelor's degree required" if the role doesn't need one.
**Tone & voice:** Professional, direct, honest. Makes the role sound interesting without overselling it. Engineer-to-engineer where possible.
**Additional instructions:** Do not invent the company name or benefits. Keep the comp range exactly as stated in the source.

**Length Constraint:** 600 Words

### Starting Document (paste into Setup 4)

```
Internal notes for posting this role (turn into a clean job description):

Company: Defense industry contractor. Mission-driven. Growing fast.
Role: Senior Wireless Network Engineer
Location: Costa Mesa, CA. Hybrid — 3 days onsite, 2 remote.
Comp: $155K-$185K base + equity + benefits.

What they'll do:
- Design and deploy wireless across manufacturing and warehouse sites
- Predictive and validation surveys using Ekahau
- Work primarily with Aruba (ArubaOS 8.x on-prem) — occasionally Ruckus and Meraki
- Partner with Facilities, Security, and IT Ops teams
- Troubleshoot complex RF issues
- Mentor junior engineers

What we need:
- 5+ years wireless engineering experience
- CWNA required, CWDP preferred, CWAP is a strong plus
- Hands-on Ekahau experience
- Warehouse/industrial RF experience highly preferred
- Must be comfortable working with Facilities and construction teams — this isn't a server-room role

Nice to have:
- iBwave experience
- Scripting (Python preferred) for automation
- Experience with Okta/Kolide/Cloudflare identity stack

Interview: 30 min recruiter → 60 min tech screen with hiring manager → 3-hour panel with team (includes a whiteboarding RF design exercise) → offer.

Must be US person (ITAR/export control).
```

---

## 10. Email / Outreach

### Project screen

**Project name:** Cold outreach — wireless services for Acme Distribution
**Version:** v1
**Document type:** Cold outreach email
**Target audience:** IT Director at Acme Distribution. They receive 20+ cold emails a day from vendors. Skeptical by default, will delete anything that reads like a template. They respect directness and specifics.
**Desired outcome:** The IT Director replies — either to set up a call, ask a clarifying question, or say "not now but keep in touch." Anything better than silence counts as success.
**Scope & constraints:** Three paragraphs maximum. No formal greeting. No "I hope this email finds you well". Lead with why I'm emailing them specifically (not a blast). One specific reference to their business. One clear, low-friction ask at the end.
**Tone & voice:** Direct, human, respectful of their time. Like a real person, not a templated sequence.
**Additional instructions:** Do not invent mutual connections. Do not claim I've "worked with similar companies" unless the source confirms a specific one. The ask should be soft — "worth a 15-minute call?" not "please fill out this form".

**Length Constraint:** 150 Words

### Starting Document (paste into Setup 4)

```
Context notes (turn into an outreach email):

Sending to: Janet Morris, IT Director at Acme Distribution.

Why them specifically: Acme announced a new 400K sq ft facility in Fontana last month. That facility will need warehouse Wi-Fi that handles forklift scanners and tablet workflows. My company specialises in exactly that.

Hook: We recently completed similar deployments at three comparable distribution centres for different clients (names confidential). All three came in under budget and ahead of schedule. Happy to share methodology.

Ask: 15-minute call in the next two weeks to share what we learned from those projects. No pitch deck, no pressure.

Signature: David Paine, Wireless Practice Lead, [My Company]
```

---

## 11. Recipe

### Project screen

**Project name:** Southern-style braised short ribs
**Version:** v1
**Document type:** Recipe
**Target audience:** Experienced home cook who is comfortable with basic braising but has never cooked short ribs before
**Desired outcome:** The reader can produce restaurant-quality braised short ribs on the first attempt. Instructions are precise on quantities and timing, steps are in logical order, and critical technique cues are called out so nothing is left to guess.
**Scope & constraints:** Keep this classically Southern. Bourbon braise base. Serves 4. Include ingredient list with quantities, numbered steps, total time, and a serving suggestion. Do not substitute ingredients without flagging. Do not add "modern twists" — keep it traditional.
**Tone & voice:** Warm, confident, a little bit Southern. Like a recipe from an old family cookbook, but readable.
**Additional instructions:** Do not invent cooking times — the braise is 2.5 hours at 325°F and that is fixed. Include a "doneness indicator" (fall-apart tender when a fork goes in with no resistance). End with a storage note.

**Length Constraint:** leave blank

### Starting Document (paste into Setup 4)

```
Rough recipe notes (turn into a polished recipe):

Southern-style braised bourbon short ribs. Serves 4.

Ingredients I know I want:
- 4 lbs bone-in beef short ribs, English cut
- salt, black pepper
- flour for dusting
- vegetable oil for searing
- 1 large yellow onion
- 2 carrots
- 3 celery stalks
- 6 garlic cloves
- 1 cup bourbon (a real one, not cooking bourbon)
- 2 cups beef stock
- 1 cup crushed tomatoes
- 2 sprigs thyme
- 2 bay leaves
- 2 tbsp brown sugar
- 1 tbsp Worcestershire

Method rough notes:
- Season, dust in flour, sear on all sides in a Dutch oven. Remove.
- Sauté veg until soft. Add garlic last minute.
- Deglaze with bourbon. Reduce by half.
- Add stock, tomatoes, thyme, bay, brown sugar, Worcestershire.
- Return ribs. Cover. 325°F for 2.5 hours. Fork-tender.
- Rest 15 min before serving.

Serve over: creamy polenta or mashed potatoes.

Leftovers: keep 3 days refrigerated. Freezes well.
```

---

## Results Log

Record the actual round count for each test. Note anything unusual.

| # | Playbook | Current estimate | Actual | Notes |
|---|---|---|---|---|
| 0 | Quick Start — Cookies | (new) | | |
| 1 | Résumé | 3–5 | | |
| 2 | Cover Letter | 2–4 | | |
| 3 | Business Proposal | 4–6 | | |
| 4 | RFP Response | 20–60+ | | |
| 5 | Thank-You Letter | 2–4 | | |
| 6 | Executive Summary | 3–5 | | |
| 7 | Presentation Outline | 4–6 | | |
| 8 | Blog Post | 3–5 | | |
| 9 | Job Description | 3–4 | | |
| 10 | Email / Outreach | 2–3 | | |
| 11 | Recipe | 5–20+ | | |

---

**Chunk 2** will cover the 19 new playbooks (LinkedIn Profile, Interview Follow-Up, Business Case, Statement of Work, RFP Writing, Case Study, Press Release, Website Copy, Short-Form Content, Meeting Summary, Project Brief, Status Update, Technical Report, SOP, Policy, Personal Letter, Complaint Letter, Review, Event Plan).
