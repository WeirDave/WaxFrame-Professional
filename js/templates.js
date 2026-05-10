// ============================================================
//  WaxFrame — templates.js  (v3.32.0)
//  THE source of truth for Document Templates on the Project
//  screen. Each entry maps directly to the Project Goal fields
//  + Notes payload. Adding a template = paste a new object;
//  no other code changes needed.
//
//  Categories match document-playbooks.html headings; the
//  Use Template modal renders the gallery grouped by these.
//
//  Field semantics:
//    id              — unique slug (used as DOM ids and keys)
//    name            — short display name on the gallery card
//    icon            — emoji shown on the card and in the
//                      Project field after applying
//    category        — one of: Quick Start, Career & Hiring,
//                      Business & Sales, Content & Marketing,
//                      Personal & Everyday
//    description     — 1-line explanation (shown on the card)
//    goalDocType     — populates #goalDocType
//    goalAudience    — populates #goalAudience
//    goalOutcome     — populates #goalOutcome
//    goalScope       — populates #goalScope
//    goalTone        — populates #goalTone
//    goalNotes       — populates #goalNotes
//    suggestedNotes  — pre-filled Notes drawer text on the
//                      work screen (optional, not shipped in
//                      v3.32 — kept here as data for v3.33+)
//    hint            — array of {field, text} entries shown in
//                      the amber "Template Applied" banner above
//                      the Project fields. Each entry tells the
//                      user which form field to look at and what
//                      to fix. Empty array = no banner shown.
//                      Format: [{field: 'Tone & voice',
//                               text: 'Pick ONE...'}, ...]
// ============================================================

const WAXFRAME_TEMPLATES = [
  {
    "id": "quick-start",
    "name": "Quick Start",
    "icon": "⭐",
    "category": "Quick Start",
    "description": "Try the system end-to-end with a low-stakes example: the perfect chocolate chip cookie recipe. Converges in just a few rounds and shows you how the whole hive works — recommended for your first WaxFrame run.",
    "goalDocType": "Recipe",
    "goalAudience": "Myself and friends that enjoy chocolate chip cookies that are easy to make",
    "goalOutcome": "Create a recipe that is simple and easy but makes great cookies",
    "goalScope": "",
    "goalTone": "",
    "goalNotes": "No extra ingredients like nuts",
    "suggestedNotes": "",
    "hint": []
  },
  {
    "id": "cover-letter",
    "name": "Cover Letter",
    "icon": "✉️",
    "category": "Career & Hiring",
    "description": "Create or refine a cover letter that connects your background directly to a specific role.",
    "goalDocType": "Cover letter",
    "goalAudience": "Hiring manager at [company name] reviewing applications for a [job title] position",
    "goalOutcome": "Reader wants to interview me. Three short paragraphs: a strong opening hook, a direct connection between my experience and the role, and a confident close with a clear call to action.",
    "goalScope": "Three paragraphs maximum. No generic openers like \"I am writing to express my interest.\" No filler phrases. No sign-offs like \"I look forward to hearing from you.\"",
    "goalTone": "[Professional / conversational / enthusiastic] — pick one that fits the company",
    "goalNotes": "Do not add claims about my experience that are not supported by what I provide. Do not fabricate anything.",
    "suggestedNotes": "",
    "lengthMode": "hardcap",
    "lengthLimit": "1",
    "lengthUnit": "pages",
    "hint": [
      {
        "field": "Target audience",
        "text": "Replace [company name] and [job title] with your specifics"
      },
      {
        "field": "Tone & voice",
        "text": "Pick ONE adjective from the brackets and remove the rest"
      }
    ]
  },
  {
    "id": "job-description",
    "name": "Job Description",
    "icon": "🔍",
    "category": "Career & Hiring",
    "description": "Write a job posting that attracts the right candidates and accurately represents the role.",
    "goalDocType": "Job description",
    "goalAudience": "Candidates applying for a [job title] role — be specific: e.g. Mid-level software engineers with 3–5 years of experience, Entry-level candidates in defense or aerospace",
    "goalOutcome": "Qualified candidates immediately understand the role, the requirements, and why the job is worth applying for. Unqualified candidates self-select out. Responsibilities are listed in order of importance, most critical first.",
    "goalScope": "List responsibilities from most important to least. Flag any must-have requirement that could unnecessarily narrow the candidate pool. Include a brief company culture statement at the end. Salary range: [amount or write OMIT].",
    "goalTone": "[Professional / startup / enterprise] — match the culture of the company",
    "goalNotes": "Do not add requirements that are not on my original list. Do not soften or remove must-have qualifications without flagging it as a suggestion first.",
    "suggestedNotes": "Role: Network Engineer, full-time, in-office 3 days per week, hybrid otherwise\nLocation: Tampa, FL\nSalary: $95k to $120k DOE + profit share\nWe are Altura Systems, 14 people, IT services for small healthcare and law firms across Florida.\nResponsibilities, in order of time spent:\n- Design and deploy small-to-mid office networks (40 to 200 users), mostly Cisco Meraki and UniFi\n- Troubleshoot client network issues — remote and on-site\n- Run site surveys and wireless heatmaps with Ekahau\n- Document everything in our internal wiki\n- Occasional after-hours cutovers, comp time given\nMust have:\n- 3+ years hands-on network engineering\n- Comfortable with Meraki or equivalent cloud-managed platform\n- Can read a switch config and know what's broken\n- Clean driving record (client site travel)\nPreferred:\n- CCNA or equivalent\n- Any wireless certs (CWNA, CWDP)\n- MSP background\nCulture: small team, we fix our own mistakes, no politics, no unnecessary meetings, you own your work end to end.",
    "hint": [
      {
        "field": "Target audience",
        "text": "Replace [job title] with the role you're hiring for"
      },
      {
        "field": "Scope & constraints",
        "text": "For salary, fill in your actual figure or write OMIT to leave it out — don't leave the brackets"
      },
      {
        "field": "Tone & voice",
        "text": "Pick ONE option from the brackets and remove the rest"
      }
    ]
  },
  {
    "id": "resume",
    "name": "Résumé",
    "icon": "📄",
    "category": "Career & Hiring",
    "description": "Polish a draft résumé for a specific role, or generate one from your career notes.",
    "goalDocType": "Résumé",
    "goalAudience": "Hiring manager or recruiter reviewing candidates for a [job title] role — e.g. Hiring manager at a defense technology company",
    "goalOutcome": "Reader invites me to interview. The résumé shows clear impact and achievements, not just job duties. Every bullet demonstrates value.",
    "goalScope": "Do not fabricate experience. Do not remove job titles, companies, or dates. Strengthen what is already there — do not invent.",
    "goalTone": "Confident, professional, action-oriented — strong verbs, no passive voice, no \"responsible for\"",
    "goalNotes": "Do not remove or change any metrics, percentages, or dates — these are factual and verified by me.",
    "suggestedNotes": "Dana Reyes\nTampa, FL · dana.reyes@example.com · 813-555-0114\n\nSummary\nWireless network engineer with 8 years of experience. CWNA, CWDP, CWAP. Aruba, Cisco Meraki, and Ruckus. Specializes in warehouse and industrial RF environments.\n\nExperience\n\nSenior Wireless Engineer, Vantage Logistics — Jan 2022 to Present\n- Responsible for wireless network across 12 warehouse sites and 3 corporate offices\n- Led migration from Cisco Meraki to Aruba ArubaOS 8\n- Did site surveys with Ekahau\n- Supported autonomous mobile robots operating on the floor\n\nWireless Engineer, Meridian IT Services — Jun 2018 to Dec 2021\n- MSP role supporting 30+ small and mid-size clients\n- Handled escalations for wireless issues\n- Designed networks for new client buildouts\n\nNetwork Technician, Gulfstream Communications — Aug 2016 to May 2018\n- Installed and configured wireless access points\n- Ran cable, tested drops, closed tickets\n\nCertifications\nCWNA, CWDP, CWAP, Aruba ACMA\n\nEducation\nBS Information Technology, University of South Florida — 2016",
    "lengthMode": "hardcap",
    "lengthLimit": "2",
    "lengthUnit": "pages",
    "hint": [
      {
        "field": "Target audience",
        "text": "Replace [job title] with the role you're applying for"
      }
    ]
  },
  {
    "id": "linkedin-about",
    "name": "LinkedIn About",
    "icon": "🔗",
    "category": "Career & Hiring",
    "description": "Write the About section of your LinkedIn profile — what you actually do, who you do it for, and the credentials that prove it. Recruiter-scannable in 30 seconds, peer-credible on a closer read.",
    "goalDocType": "LinkedIn About Profile",
    "goalAudience": "Recruiters scanning for [your key certs / platforms / tools] keywords in 30 seconds. Peers in the field reading it on a closer pass to decide if you actually do the work.",
    "goalOutcome": "Recruiter sees credentials and platform experience and flags it as a match. Peer reads it and thinks \"this person actually does the work, not just talks about it.\"",
    "goalScope": "Lead with what you actually do, not where you work. Include credentials and platform experience without it reading like a resume bullet list. End with one line that gives a peer something to connect on.",
    "goalTone": "Professional but human. Not stiff. Engineer that can speak customer.",
    "goalNotes": "No \"passionate about,\" \"results-driven,\" or \"proven track record.\" If a sentence sounds like it could have been written about anyone in this field, rewrite it until it could only have been written about me. No \"open to opportunities\" or \"looking for my next chapter.\"",
    "suggestedNotes": "",
    "lengthMode": "hardcap",
    "lengthLimit": "2000",
    "lengthUnit": "characters",
    "hint": [
      {
        "field": "Target audience",
        "text": "Replace [bracketed key certs / platforms / tools] with the keywords recruiters in your field actually search on"
      },
      {
        "field": "Reference Material (Setup 4)",
        "text": "Paste your role, credentials, primary platform, tools, identity stack, and what-you-do-day-to-day notes as your identity scaffold. The reference run used a 1,163-character payload and converged in 2 rounds."
      }
    ]
  },
  {
    "id": "thank-you",
    "name": "Thank-You Letter",
    "icon": "🙏",
    "category": "Career & Hiring",
    "description": "Write a warm, genuine thank-you for any professional or personal occasion.",
    "goalDocType": "Thank-you letter",
    "goalAudience": "The person receiving it — be specific: e.g. My hiring manager John Smith, A client named Sarah at Acme Corp, My mentor Dr. Jones",
    "goalOutcome": "Reader feels genuinely appreciated and remembers the specific moment I am referencing.",
    "goalScope": "No generic openers like \"I hope this finds you well.\" No corporate sign-offs like \"Best regards.\" One specific moment or gesture must be named — no vague thank-yous.",
    "goalTone": "[Warm and personal / professional but sincere / heartfelt] — pick one",
    "goalNotes": "Reference the specific thing I am thanking them for. Do not add any details I have not provided. Do not fabricate anything.",
    "suggestedNotes": "Marco Delgado, owner of Delgado Build, finished our kitchen and back porch remodel last Friday.\nThings to thank him for:\n- The big one: when the countertop supplier delivered the wrong slab on day 17 and the project was going to slip two weeks, Marco drove to Orlando on a Saturday, picked up the right slab himself, and installed it Sunday morning. We had our son's birthday party on the new porch the following Saturday as planned.\n- He showed up when he said he would, every day, for six weeks.\n- His crew cleaned up every night — my wife kept commenting on it.\n- He caught a framing issue the inspector missed and fixed it before closing the wall.\nWhat we want him to know:\n- We'll absolutely use him again.\n- Our neighbor Janet has already asked for his number.\n- He's welcome to drop by and show the kitchen to a future client if he ever needs to.",
    "lengthMode": "hardcap",
    "lengthLimit": "1",
    "lengthUnit": "pages",
    "hint": [
      {
        "field": "Tone & voice",
        "text": "Pick ONE option from the brackets and remove the rest"
      }
    ]
  },
  {
    "id": "business-proposal",
    "name": "Business Proposal",
    "icon": "💼",
    "category": "Business & Sales",
    "description": "Sharpen a proposal to win a client, secure a partnership, or pitch a new venture.",
    "goalDocType": "Business proposal",
    "goalAudience": "[Client name or type] — be specific: e.g. IT Director at a mid-size manufacturing firm, or Procurement committee at [company name]",
    "goalOutcome": "Reader approves the proposal or schedules a follow-up meeting. They clearly understand what we are offering, what it costs, and what happens next.",
    "goalScope": "Required sections: executive summary, problem statement, proposed solution, pricing or next steps. Do not add claims not supported by the existing content.\n\nIdentity & offering — fill these in (the hive needs to know who you are and what you sell):\n- Who you are: [your company name + what kind of business — e.g. Eye Productions, a full-service wireless engineering firm]\n- Services or products you offer: [be specific — e.g. predictive surveys, active and passive surveys, validation surveys, troubleshooting, turnkey deployment]\n- What you do NOT offer: [e.g. Do not invent services I don't offer. Do not embellish credentials.]\n- Pricing structure: [e.g. $100/hour with 4-hour minimum, or fixed-fee per project, or tiered packages]",
    "goalTone": "Confident, credible, professional — not salesy",
    "goalNotes": "Do not change any pricing figures, timelines, or deliverable commitments. These are factual. Use [PRICE] or [TIMELINE] as placeholders where I have left them blank.",
    "suggestedNotes": "",
    "lengthMode": "range",
    "lengthLimit": "2",
    "lengthMin": "1",
    "lengthUnit": "pages",
    "hint": [
      {
        "field": "Target audience",
        "text": "Replace [Client name or type] and [company name] with your specifics"
      },
      {
        "field": "Scope & constraints",
        "text": "Fill in the [bracketed] identity/offering/pricing scaffold below the section list — the hive uses this as source-of-truth for what you actually do and charge"
      },
      {
        "field": "Additional instructions",
        "text": "Keep [PRICE] and [TIMELINE] as-is — these are intentional tags that prompt the AIs to ask you for those numbers, or replace them with your actual figures"
      }
    ]
  },
  {
    "id": "email-campaign",
    "name": "Email & Outreach",
    "icon": "📬",
    "category": "Business & Sales",
    "description": "Sharpen cold outreach, sales emails, follow-ups, or any important one-off message that needs to land.",
    "goalDocType": "Be specific about the email type: e.g. Cold outreach email, Follow-up email after a meeting, Sales introduction email",
    "goalAudience": "Who is receiving this — be specific: e.g. VP of Engineering at a mid-size SaaS company, A former colleague I have not spoken to in two years, Hiring manager who interviewed me last week",
    "goalOutcome": "Reader opens it, reads it in full, and takes one specific action — e.g. replies to schedule a 20-minute call, clicks the link, responds with a yes or no.",
    "goalScope": "Lead with value to the recipient — not background on the sender. One clear ask only. No fluff, no jargon, no \"I hope this email finds you well.\" Include a subject line as the first line of the document.",
    "goalTone": "[Professional / direct / warm] — pick one. For cold outreach, direct tends to work better than warm.",
    "goalNotes": "Do not add background about me unless I specifically provide it. The email should be about what the reader gets, not who I am.",
    "suggestedNotes": "Ferris's recent LinkedIn post (last week): he wrote that most SMB security incidents start with unmanaged wireless — not ransomware, not phishing. Direct quote: \"your MSP partner should be treating your Wi-Fi like a security surface, not a convenience.\"\n\nOur company: Altura Systems, a 14-person MSP in Tampa. We run wireless for about 40 SMB clients across healthcare and legal. We've seen the same pattern Ferris is describing — clients keep getting breached through guest SSIDs that were stood up in 2019 and forgotten.\n\nThe ask: 20-minute intro call to see if the pattern he's describing matches what we're seeing.\n\nSender:\n- Name: Dana Reyes\n- Role: Director of Wireless Services, Altura Systems",
    "hint": [
      {
        "field": "Tone & voice",
        "text": "Pick ONE option from the brackets and remove the rest"
      }
    ]
  },
  {
    "id": "executive-summary",
    "name": "Executive Summary",
    "icon": "📊",
    "category": "Business & Sales",
    "description": "Distil a long report, plan, or proposal into a tight, decision-ready summary for leadership.",
    "goalDocType": "Executive summary",
    "goalAudience": "Be specific about who reads this — e.g. VP of Operations and CFO, Board of Directors, Program managers and senior leadership",
    "goalOutcome": "Reader understands the situation, the recommendation, and why it matters — in that order. They can make a decision or take action without reading the full source document.",
    "goalScope": "Lead with the conclusion. Strip jargon. Do not expand — only tighten and clarify what is already here.",
    "goalTone": "Direct, authoritative, jargon-free — written for someone who has 90 seconds to read it",
    "goalNotes": "Do not add detail not present in the source material. Do not change any figures, recommendations, or conclusions.",
    "suggestedNotes": "",
    "lengthMode": "hardcap",
    "lengthLimit": "1",
    "lengthUnit": "pages",
    "hint": []
  },
  {
    "id": "rfp",
    "name": "RFP Response",
    "icon": "📋",
    "category": "Business & Sales",
    "description": "Craft a disciplined, structured response to a formal RFP that addresses every stated requirement.",
    "goalDocType": "RFP response",
    "goalAudience": "Evaluation committee at [issuing organization] reviewing responses to [RFP name or number]",
    "goalOutcome": "Every stated requirement in the RFP is addressed directly and clearly. Evaluators can find our response to each item without hunting for it. Our differentiators are clear and credible.",
    "goalScope": "Formal, precise, no marketing language. Do not add capability claims not supported by the existing content. Address requirements in the order they appear in the RFP.",
    "goalTone": "Formal, authoritative, direct — this is a compliance document, not a sales pitch",
    "goalNotes": "Do not change any figures, dates, or technical specifications. Do not omit or skip any RFP requirement, even if the answer is brief.",
    "suggestedNotes": "",
    "hint": [
      {
        "field": "Target audience",
        "text": "Replace [issuing organization] and [RFP name or number] with the actual RFP details"
      }
    ]
  },
  {
    "id": "blog-post",
    "name": "Blog Post / Article",
    "icon": "📝",
    "category": "Content & Marketing",
    "description": "Publish-ready content with a strong voice, clear structure, and solid flow.",
    "goalDocType": "Blog post — or be specific about format: e.g. Opinion piece, How-to article, Listicle",
    "goalAudience": "Who reads this and where — e.g. Small business owners new to AI, reading on LinkedIn, Senior engineers evaluating wireless platforms",
    "goalOutcome": "Reader finishes the post and [takes a specific action or understands a specific thing]. End with a clear call to action. e.g. Reader understands the three main options and clicks through to learn more.",
    "goalScope": "Must cover: [list 3–5 key points]. Do not add statistics or facts that are not already in the draft — flag anything uncertain instead of inventing it.",
    "goalTone": "Be specific: e.g. Direct, short sentences, slightly sarcastic, no jargon or Authoritative and data-driven, formal but approachable. Without this the AIs will default to a bland, generic style.",
    "goalNotes": "Do not change my unique angle or perspective. Strengthen the voice — do not sand it down into something that sounds like everyone else.",
    "suggestedNotes": "Thesis: any single LLM, no matter how good, has blind spots. One model will confidently write fluff where another catches it. One model will tighten structure while another improves tone. Run the same document through 4 or 5 different models in sequence, each refining what the previous one did, and the output is better than any single model can produce on its own.\n\nConcrete example to reference (real, from last month):\n- Took a 900-word draft of a proposal\n- Ran it through Claude alone: got a polished version, maybe 15% better\n- Ran the same draft through Claude, then GPT-4, then Gemini, then back to Claude: got a version where the structural argument was noticeably stronger, the jargon was stripped, and two factual hedges had been flagged that the author hadn't noticed\n\nWhat the reader should try today: pick a document they care about, hand it to 3 different models in sequence with the same prompt, compare the result to running it through any one model once.\n\nCall to action at the end: link to a tool that automates this — multiple models, single document, convergence loop. (This is WaxFrame, but the post should not name it overtly — the link speaks for itself.)",
    "lengthMode": "range",
    "lengthMin": "800",
    "lengthLimit": "1500",
    "lengthUnit": "words",
    "hint": [
      {
        "field": "Desired outcome",
        "text": "Replace [takes a specific action or understands a specific thing] with what you want readers to do or learn after reading"
      },
      {
        "field": "Scope & constraints",
        "text": "Replace [list 3–5 key points] with your actual key points"
      }
    ]
  },
  {
    "id": "presentation",
    "name": "Presentation Outline",
    "icon": "🖥️",
    "category": "Content & Marketing",
    "description": "Build a slide-by-slide speaker outline ready to drop into PowerPoint, Keynote, or Slides.",
    "goalDocType": "Presentation outline — speaker notes format",
    "goalAudience": "The audience for the talk — e.g. C-suite leadership team, New hire onboarding group, External conference attendees",
    "goalOutcome": "A slide-by-slide outline ready to copy into a presentation tool. Each slide must have: a slide title, 3–5 speaker note bullets, and one suggested visual or data point. Open with a strong hook, close with a clear call to action.",
    "goalScope": "[X]-minute talk. [Number] slides maximum. Bullet points only — no prose paragraphs. This is a speaker outline, not a script. WaxFrame outputs text — you will paste this into your presentation tool separately.",
    "goalTone": "[Informative / persuasive / conversational] — match the formality level of the audience",
    "goalNotes": "Do not write full sentences in the speaker bullets. Keep each bullet to one line. Do not add slides beyond the count I specify.",
    "suggestedNotes": "Driving question: \"Should we pilot Wi-Fi 7 in FY27, or wait?\"\n\nRecommendation: pilot in FY27 at a single floor of HQ, budget $95k, defer enterprise-wide deployment to FY28 or FY29 depending on client device penetration.\n\nReasoning:\n- Wi-Fi 7 standard is ratified. Enterprise APs are shipping in volume from Cisco, Aruba, Juniper, Extreme.\n- Client device penetration is still low — under 12% of the user base has a Wi-Fi 7 capable endpoint as of Q1 2026. No reason to refresh the fleet now.\n- HQ 14th floor is being refreshed in FY27 anyway due to an expiring lease remodel. That gives a \"free\" pilot footprint.\n- Pilot goals: validate real-world throughput gains, test roaming behavior with mixed Wi-Fi 6E and Wi-Fi 7 clients, train the team on the new management platform.\n- If pilot is successful, shovel-ready plan for FY28 enterprise rollout. If not, $95k spent to learn instead of $2.1M to fail.\n\nContext the deck must establish:\n- Where we are today: Wi-Fi 6E, Aruba Central managed, last refreshed FY24\n- Where the industry is going: Wi-Fi 7 ratified, deployment guidance from Gartner suggests \"selective pilots in FY26/FY27, mainstream in FY28\"\n- Client device mix: 70% corporate-managed laptops, 25% BYOD phones, 5% IoT/sensors\n\nHard constraints:\n- FY27 budget cycle closes in July 2026. Decision must happen before then.\n- Any dollar figure in the deck is directional — detailed pricing comes from the RFP, not this deck.",
    "hint": [
      {
        "field": "Scope & constraints",
        "text": "Replace [X] with your topic and [Number] with how many slides you want"
      },
      {
        "field": "Tone & voice",
        "text": "Pick ONE option from the brackets and remove the rest"
      }
    ]
  },
  {
    "id": "recipe",
    "name": "Recipe",
    "icon": "🍳",
    "category": "Personal & Everyday",
    "description": "Turn rough notes or a draft recipe into a polished write-up with clear instructions and consistent formatting.",
    "goalDocType": "Recipe",
    "goalAudience": "Who will cook from this — e.g. Home cook, beginner level, Experienced baker, Meal prep audience, intermediate skill",
    "goalOutcome": "Anyone following this recipe can cook the dish successfully on the first try. Instructions are clear, ingredient quantities are precise, and steps are in a logical order with nothing assumed.",
    "goalScope": "Do not change the core recipe — only clarify and improve what is there. Ingredient quantities and cooking times must stay as written. Include: ingredient list with quantities, numbered steps, and at least one tip on substitutions or storage.",
    "goalTone": "[Warm and conversational / precise and technical / beginner-friendly] — pick one",
    "goalNotes": "Do not substitute ingredients without flagging it as an optional variation. Do not add unverified cooking times or techniques — flag anything uncertain instead of inventing it.",
    "suggestedNotes": "",
    "hint": [
      {
        "field": "Tone & voice",
        "text": "Pick ONE option from the brackets and remove the rest"
      }
    ]
  },
  {
    "id": "contractor-letter",
    "name": "Contractor / Vendor Letter",
    "icon": "🧾",
    "category": "Personal & Everyday",
    "description": "Refine a letter to a contractor, vendor, or service provider — invoice disputes, scope concerns, punch-list items, or anything where you need to be clear, professional, and firm without escalating.",
    "goalDocType": "Letter to my [contractor / vendor / service provider] regarding [the first invoice / scope dispute / punch-list items]",
    "goalAudience": "The [contractor / vendor / project manager] who did the work — be specific about the relationship: e.g. The general contractor we hired, The vendor that installed our HVAC",
    "goalOutcome": "A clear, professional record of my concerns and the items I need addressed before [I pay / we close out the project / we move forward]. The recipient understands what is wrong, what I expect, and what comes next.",
    "goalScope": "Include all of the items I have listed including pricing but don't make anything else up and don't change my dollar figures — they are all actual. Keep my factual claims (dates, amounts, names) intact.",
    "goalTone": "Professional and courteous but firm. Not adversarial, not apologetic.",
    "goalNotes": "Do not soften my concerns. Do not invent context, dates, or amounts I haven't provided. If a section is unclear, suggest a rewording rather than guessing what I meant.",
    "suggestedNotes": "",
    "hint": [
      {
        "field": "Document type",
        "text": "Pick ONE option from the brackets and remove the rest — match what you're actually writing"
      },
      {
        "field": "Target audience",
        "text": "Pick ONE option and replace with your specifics"
      }
    ]
  },
  {
    "id": "linkedin-post",
    "name": "LinkedIn Post",
    "icon": "💼",
    "category": "Content & Marketing",
    "description": "Write a short-form LinkedIn post — a lesson, a hot take, or a war story — that reads as a peer talking to peers, not a thought leader trying to grow an audience.",
    "goalDocType": "LinkedIn Post",
    "goalAudience": "My LinkedIn network — [your peers, recruiters, former colleagues, anyone scrolling fast]. They scroll fast. If the first two lines don't land, they keep scrolling.",
    "goalOutcome": "Reader stops scrolling, reads the whole post, and either comments or sends a connection request. The post should feel earned, not braggy.",
    "goalScope": "Cover one specific topic with a clear opinion or lesson. Hook in the first line. Use real numbers and specifics where you have them. End with a question that invites comments. Do not name a current employer if there are confidentiality or OPSEC concerns.",
    "goalTone": "Conversational, direct, no LinkedIn-influencer voice. Sounds like a peer talking to peers, not a thought leader trying to grow an audience.",
    "goalNotes": "No \"I'm proud to announce,\" \"thrilled,\" or \"humbled\" — the LinkedIn opener virus. No emojis except maybe one at the end. No call to \"DM me to learn more.\" No buzzwords (synergy, leverage, revolutionize). If a paragraph reads like a brochure, cut it.",
    "suggestedNotes": "",
    "lengthMode": "hardcap",
    "lengthLimit": "2000",
    "lengthUnit": "characters",
    "hint": [
      {
        "field": "Target audience",
        "text": "Replace [bracketed audience] with your specific peers/recruiters/former colleagues — be specific about who you're writing for"
      },
      {
        "field": "Scope & constraints",
        "text": "After Setup 3, paste your topic, real numbers, and the lesson you want to land into Setup 4 Reference Material"
      }
    ]
  },
  {
    "id": "restaurant-review",
    "name": "Restaurant Review",
    "icon": "🍽️",
    "category": "Reviews & Recommendations",
    "description": "Create or refine a useful restaurant review covering food, service, atmosphere, value, logistics, and whether you'd return.",
    "goalDocType": "Restaurant review",
    "goalAudience": "People deciding whether this restaurant is worth visiting. They want practical details about food, service, atmosphere, value, and logistics, not vague praise or complaints.",
    "goalOutcome": "Create a useful, honest review that explains what the experience was actually like, what was ordered, what was good, what was disappointing, whether the price made sense, and whether I would return.",
    "goalScope": "Include visit context, food and drinks ordered, pricing if known, service, atmosphere, cleanliness, parking or location notes, standout items, disappointments, and final recommendation. Do not invent dishes, prices, staff names, dates, or facts that were not provided.",
    "goalTone": "Conversational, detailed, fair, practical, and direct. Preserve the reviewer's natural voice. Honest criticism is fine, but avoid making it sound like a rant unless the source material genuinely supports that tone.",
    "goalNotes": "End with a clear bottom line: whether I would return, who this restaurant is best for, and any specific warning, recommendation, or timing advice for future visitors.",
    "suggestedNotes": "Restaurant: \nLocation: \nDate/time: \nWho was there (solo / couple / family / group / business): \nDine-in / takeout / delivery / patio / bar: \nReservation or walk-in: \nParking notes: \nFirst impression of exterior/interior: \nNoise / lighting / seating / cleanliness: \nWhat was ordered (drinks, apps, entrées, sides, dessert): \nPrices remembered: \nFood quality (flavor, temperature, portion, freshness, presentation): \nBest item: \nWorst item or disappointment: \nService quality: \nProblems and how staff handled them: \nWould you return: \nWho is this restaurant best for: ",
    "lengthMode": "hardcap",
    "lengthLimit": "500",
    "lengthUnit": "words",
    "hint": [
      {
        "field": "Length Constraint",
        "text": "Default 500 words is a balanced general-purpose review. For Google Maps use 750–1,200 characters. For TripAdvisor leave blank for the full long-form."
      },
      {
        "field": "Notes (Setup 5 Notes drawer)",
        "text": "Paste the raw visit details into the 🎯 This-round notes section before Round 1 — the Suggested Notes prompt for this template lists every detail to include."
      }
    ]
  },
  {
    "id": "hotel-review",
    "name": "Hotel Review",
    "icon": "🏨",
    "category": "Reviews & Recommendations",
    "description": "Create or refine a hotel review covering room, sleep quality, location, amenities, service, value, and dealbreakers.",
    "goalDocType": "Hotel review",
    "goalAudience": "Travelers deciding whether to book this hotel — especially business travelers, families, road-trippers, or people comparing nearby properties.",
    "goalOutcome": "Create a detailed, practical hotel review that helps readers understand the room, sleep quality, location, amenities, service, value, and any problems that affected the stay.",
    "goalScope": "Cover trip context, room type or room number if provided, rate/value, check-in, room layout, cleanliness, bed, bathroom, HVAC, noise, darkness, internet, breakfast, gym, pool, bar, parking, location, staff, and final recommendation. Do not invent amenities, prices, loyalty benefits, room numbers, or facts.",
    "goalTone": "Practical, detailed, fair, and conversational. Preserve useful personal observations and specific traveler-focused details.",
    "goalNotes": "Include whether I would stay again and what type of traveler this hotel is best suited for. Mention dealbreakers clearly.",
    "suggestedNotes": "Hotel: \nLocation: \nDates of stay: \nTrip type (business / vacation / family / event / road trip): \nWho was there (solo / couple / family / group): \nRoom type and number if relevant: \nRate / points / resort fee / parking fee / other fees: \nCheck-in experience: \nStaff interactions: \nRoom size, layout, furniture, outlets, desk: \nCleanliness and maintenance: \nBed and pillows: \nNoise (hallway, street, airport, neighbors, elevators, kids): \nRoom darkness / blackout curtains: \nHVAC / temperature control: \nBathroom layout, shower pressure, hot water, towels, toiletries: \nWi-Fi speed and reliability: \nBreakfast quality and variety: \nGym / pool / bar / lounge / laundry / shuttle / parking: \nNearby restaurants / walkability / transit / airport / attractions / work site: \nProblems and how staff handled them: \nWould you stay again: \nWho is this hotel best for: ",
    "lengthMode": "hardcap",
    "lengthLimit": "800",
    "lengthUnit": "words",
    "hint": [
      {
        "field": "Length Constraint",
        "text": "Default 800 words is a balanced general-purpose review. For Google Maps use 750–1,200 characters. For TripAdvisor leave blank for full long-form."
      },
      {
        "field": "Notes (Setup 5 Notes drawer)",
        "text": "Paste the raw stay details into the 🎯 This-round notes section before Round 1 — the Suggested Notes prompt lists every detail to include. Sleep quality, hidden friction (noise, HVAC, blackout, hot water, Wi-Fi, parking, fees) matter more than lobby marketing."
      }
    ]
  },
  {
    "id": "business-review",
    "name": "Business / Service Review",
    "icon": "🧾",
    "category": "Reviews & Recommendations",
    "description": "Create or refine a review of a business, contractor, service provider, parking company, repair service, delivery experience, or other non-restaurant/non-hotel business.",
    "goalDocType": "Business or service review",
    "goalAudience": "People deciding whether to hire, visit, book, or use this business. They care about reliability, value, professionalism, communication, and how problems are handled.",
    "goalOutcome": "Create a fair but useful review that explains why I used the business, what happened, what went well, what went wrong, how the business handled it, and whether I would recommend them.",
    "goalScope": "Include reason for using the business, booking or arrival process, staff behavior, service quality, pricing/value, problems, resolution attempts, observed business practices, and final recommendation. Do not exaggerate, speculate beyond the facts, or invent details.",
    "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed, but avoid sounding like a rant unless the source material genuinely supports it.",
    "goalNotes": "End with practical advice: who should use this business, who should avoid it, and what to watch out for. Do not add legal conclusions, accusations, or claims beyond the facts provided.",
    "suggestedNotes": "Business: \nLocation: \nType of service or product: \nWhy you used them: \nDate/time: \nBooking process (app / website / phone / walk-in / reservation / estimate / quote): \nPrice quoted vs. price paid: \nArrival/check-in process: \nStaff behavior and communication: \nWhat went well: \nWhat went wrong: \nDelays / confusion / unexpected charges / damage / poor workmanship / service failures: \nHow the business responded when a problem came up: \nWhether they fixed the issue: \nObserved practices future customers should know about: \nWould you use them again: \nWho should use them and who should avoid them: ",
    "lengthMode": "hardcap",
    "lengthLimit": "500",
    "lengthUnit": "words",
    "hint": [
      {
        "field": "Length Constraint",
        "text": "Default 500 words is a balanced general-purpose review. For Google Maps use 750–1,200 characters. For Yelp/TripAdvisor leave blank for full long-form."
      },
      {
        "field": "Notes (Setup 5 Notes drawer)",
        "text": "Paste the raw experience details into the 🎯 This-round notes section before Round 1 — be specific. \"They quoted X, charged Y, did Z, and responded this way\" is useful; \"they ripped me off\" is not."
      }
    ]
  },
  {
    "id": "multi-platform-review",
    "name": "Multi-Platform Review Rewrite",
    "icon": "🔁",
    "category": "Reviews & Recommendations",
    "description": "Turn one detailed review into platform-ready versions for TripAdvisor, Google Maps, and Yelp while preserving the same facts and natural voice.",
    "goalDocType": "Multi-platform customer review rewrite",
    "goalAudience": "Readers on TripAdvisor, Google Maps, and Yelp who are deciding whether to visit, book, hire, or avoid the business being reviewed.",
    "goalOutcome": "Create three platform-ready versions of the same review: a detailed TripAdvisor version, a shorter practical Google Maps version, and a conversational Yelp version. All three preserve the same facts and final recommendation.",
    "goalScope": "Use only the facts from the source review. Do not invent dishes, rooms, prices, staff names, amenities, dates, locations, or outcomes. Preserve the reviewer's actual experience and final opinion. Remove repetition where helpful, but do not remove important practical details.",
    "goalTone": "Natural, conversational, useful, specific, and fair. Preserve the reviewer's voice. Do not make the review sound corporate, fake, overly polished, or AI-generated.",
    "goalNotes": "Output three clearly labeled sections — TripAdvisor, Google Maps, Yelp. TripAdvisor is the most detailed (500–900 words). Google Maps is concise and skimmable (750–1,200 characters). Yelp is conversational and personality-forward (300–700 words).",
    "suggestedNotes": "Source review or raw experience details: \n\nBusiness type if not obvious: \n\nPlatform preference (any of):\n- All three platforms (default)\n- Only one platform: \n- Only short versions\n- Keep my tone very close to the original\n- Make it more polished\n- Make it less harsh\n- Make it more direct",
    "lengthMode": "none",
    "lengthLimit": "",
    "lengthUnit": "",
    "hint": [
      {
        "field": "Length Constraint",
        "text": "Length intentionally left unset — each of the three platform versions has its own target inside the Builder output (TripAdvisor 500–900 words, Google Maps 750–1,200 chars, Yelp 300–700 words). Do not set a single hard cap or it will compress all three."
      },
      {
        "field": "Notes (Setup 5 Notes drawer)",
        "text": "Use this template AFTER you have a long detailed review (from the Restaurant / Hotel / Business-Service templates). Paste the source review into Starting Document; this template's Builder produces the three platform-ready cuts."
      }
    ]
  }
];
