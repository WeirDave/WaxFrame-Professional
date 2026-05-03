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
    "goalScope": "Leave blank",
    "goalTone": "Leave blank",
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
    "hint": [
      {
        "field": "Target audience",
        "text": "Replace [job title] with the role you're applying for"
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
    "goalScope": "Required sections: executive summary, problem statement, proposed solution, pricing or next steps. Do not add claims not supported by the existing content.",
    "goalTone": "Confident, credible, professional — not salesy",
    "goalNotes": "Do not change any pricing figures, timelines, or deliverable commitments. These are factual. Use [PRICE] or [TIMELINE] as placeholders where I have left them blank.",
    "suggestedNotes": "",
    "hint": [
      {
        "field": "Target audience",
        "text": "Replace [Client name or type] and [company name] with your specifics"
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
    "hint": []
  },
  {
    "id": "rfp",
    "name": "RFP Response (Request for Proposal)",
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
  }
];
