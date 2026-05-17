// ============================================================
//  WaxFrame — templates.js  (v3.38.3 — per-path descriptions, full audit)
//  THE source of truth for Document Templates on the Project
//  screen. Each entry maps directly to the Project Goal fields
//  + Reference Material content. Adding a template = paste a new
//  object; no other code changes needed.
//
//  Categories match document-playbooks.html headings; the
//  Use Template modal renders the gallery grouped by these.
//
// ── v3.37.0 dual-path schema ─────────────────────────────────
//
//  Every template declares which paths it supports. A path is
//  the user's starting condition:
//
//    "scratch" — user has no draft yet; the hive creates one
//                from the Project Goal + Reference Material
//                scaffold this template populates
//    "refine"  — user already has a draft; the hive polishes,
//                tightens, and restructures it without
//                rewriting wholesale
//
//  Most templates support both paths. Two single-path templates:
//    - quick-start          paths: ["scratch"]   (the from-scratch
//                                                 onboarding demo)
//    - multi-platform-review paths: ["refine"]   (requires a
//                                                 source review)
//
//  Path-agnostic identity fields live at the top level:
//    id              — unique slug (used as DOM ids and keys)
//    name            — short display name on the gallery card
//    icon            — emoji shown on the card and in the
//                      Project field after applying
//    category        — one of: Quick Start, Career & Hiring,
//                      Business & Sales, Content & Marketing,
//                      Personal & Everyday, Reviews &
//                      Recommendations
//    description     — 1-line explanation (shown on the card).
//                      Used as fallback when a path doesn't
//                      override it (see pathContent.description
//                      below).
//    paths           — array of supported path slugs
//    pathContent     — object keyed by path slug; each value
//                      holds the per-path fields below
//
//  Per-path fields inside pathContent[path]:
//    description     — (optional, v3.38.2) overrides the top-level
//                      description on this path. Use this when the
//                      same template needs different wording for
//                      scratch ("Write a…") vs refine ("Polish a
//                      draft…"). Omit to fall back to top-level.
//    goalDocType     — populates #goalDocType
//    goalAudience    — populates #goalAudience
//    goalOutcome     — populates #goalOutcome
//    goalScope       — populates #goalScope
//    goalTone        — populates #goalTone
//    goalNotes       — populates #goalNotes
//    refMaterial     — content routed to Reference Material as
//                      a single card via addReferenceDoc().
//                      String. Empty string = no card injected.
//                      Multi-line questionnaire scaffolds live
//                      here for the scratch path; usually empty
//                      for refine paths (user provides their
//                      own document).
//    hint            — array of {field, text} entries shown in
//                      the amber "Template Applied" banner above
//                      the Project fields. Empty array = no
//                      banner shown.
//    lengthMode      — "none" | "hardcap" | "target" | "range"
//                      (optional — omit to leave length untouched)
//    lengthLimit     — string (max/target value)
//    lengthMin       — string (range mode only)
//    lengthUnit      — "words" | "characters" | "pages"
//
//  Reference Material lifecycle:
//    Cards injected by applyTemplate() are tagged with
//    source: 'template' and templateOriginId: tpl.id. On any
//    subsequent applyTemplate call, prior template-sourced
//    cards are swept and replaced — keeps the RM panel clean
//    and idempotent.
//
//  Retired:
//    suggestedNotes  — replaced by refMaterial. Content that
//                      previously lived in suggestedNotes is
//                      now routed to Reference Material as a
//                      card on apply (scratch path).
// ============================================================

const WAXFRAME_TEMPLATES = [

  // ============================================================
  // QUICK START — scratch-only (the onboarding demo)
  // ============================================================
  {
    "id": "quick-start",
    "name": "Quick Start",
    "icon": "⭐",
    "category": "Quick Start",
    "projectName":    "Recipe - Chocolate Chip Cookies",
    "projectVersion": "v1.0",
    "confirmModal": {
      "title":   "A Note on Naming & Versions",
      "message": "Your Project name and Version aren't just housekeeping — they become the filename when you export, and they're how you'll keep track of which round of polish a draft represents. \"Recipe - Chocolate Chip Cookies\" is searchable in your downloads folder months later. \"v1.0\" tells you this is your first stable take; bump it to v1.1 when you tighten it, v2.0 when you rewrite it. Quick Start fills both in for you as a working example — replace them with your own conventions on real projects.",
      "okText":  "Got it — apply Quick Start"
    },
    "description": "A real low-stakes project: the hive writes and refines a chocolate-chip-cookie recipe in a few rounds. Same complete WaxFrame flow as any other document, just with stakes small enough for a comfortable first run.",
    "paths": ["scratch"],
    "pathContent": {
      "scratch": {
        "goalDocType": "Recipe",
        "goalAudience": "Myself and friends that enjoy chocolate chip cookies that are easy to make",
        "goalOutcome": "Create a recipe that is simple and easy but makes great cookies",
        "goalScope": "",
        "goalTone": "",
        "goalNotes": "No extra ingredients like nuts",
        "refMaterial": "",
        "hint": []
      }
    }
  },

  // ============================================================
  // COVER LETTER — both paths
  // ============================================================
  {
    "id": "cover-letter",
    "name": "Cover Letter",
    "icon": "✉️",
    "category": "Career & Hiring",
    "description": "Create or refine a cover letter that connects your background directly to a specific role.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A cover letter that reads like you — your story, this role, real specifics in place of the openers everyone uses.",
        "goalDocType": "Cover letter",
        "goalAudience": "Hiring manager at [company name] reviewing applications for a [job title] position",
        "goalOutcome": "Reader wants to interview me. Three short paragraphs: a strong opening hook, a direct connection between my experience and the role, and a confident close with a clear call to action.",
        "goalScope": "Three paragraphs maximum. No generic openers like \"I am writing to express my interest.\" No filler phrases. No sign-offs like \"I look forward to hearing from you.\"",
        "goalTone": "[Professional / conversational / enthusiastic] — pick one that fits the company",
        "goalNotes": "Do not add claims about my experience that are not supported by what I provide. Do not fabricate anything.",
        "refMaterial": "Target role and company: \n  Job title: \n  Company name: \n  Company type / industry: \n  How I found this role: \n\nWhy this role / company specifically: \n\nMy current role: \n\nMy top 3 relevant wins (use real numbers where possible): \n  1. \n  2. \n  3. \n\nThe one thing about my background that maps cleanly to this role: \n\nWhat I want the reader to do after reading: \n  (e.g. invite me to interview / forward to hiring manager / schedule a 20-min call)",
        "hint": [
          { "field": "Target audience", "text": "Replace [company name] and [job title] with your specifics" },
          { "field": "Tone & voice", "text": "Pick ONE adjective from the brackets and remove the rest" }
        ],
        "lengthMode": "hardcap",
        "lengthLimit": "1",
        "lengthUnit": "pages"
      },
      "refine": {
        "description": "Move your cover letter from generic to specific — every line tied to what this employer actually wants to see.",
        "goalDocType": "Cover letter",
        "goalAudience": "Hiring manager at [company name] reviewing applications for a [job title] position",
        "goalOutcome": "Tighten my existing cover letter so the reader wants to interview me. Strengthen the opening hook, sharpen the connection between my experience and the role, and make the close confident and specific.",
        "goalScope": "Preserve my voice, my specific claims, and any numbers or company names I've used. Tighten weak openers, cut filler, remove generic phrasing. Keep it to three paragraphs maximum.",
        "goalTone": "[Professional / conversational / enthusiastic] — pick one that fits the company",
        "goalNotes": "Do not fabricate experience or invent claims. Do not soften my actual wins. Do not replace concrete numbers with vague language.",
        "refMaterial": "",
        "hint": [
          { "field": "Target audience", "text": "Replace [company name] and [job title] with your specifics" },
          { "field": "Tone & voice", "text": "Pick ONE adjective from the brackets and remove the rest" },
          { "field": "Starting Document", "text": "Paste or upload your existing cover letter on Setup — Step 5 of 5 — Starting Document" }
        ],
        "lengthMode": "hardcap",
        "lengthLimit": "1",
        "lengthUnit": "pages"
      }
    }
  },

  // ============================================================
  // JOB DESCRIPTION — both paths
  // ============================================================
  {
    "id": "job-description",
    "name": "Job Description",
    "icon": "🔍",
    "category": "Career & Hiring",
    "description": "Write a job posting that attracts the right candidates and accurately represents the role.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "Attract the right candidates and quietly turn away the wrong ones — an honest, specific posting that reflects what working there is actually like.",
        "goalDocType": "Job description",
        "goalAudience": "Candidates applying for a [job title] role — be specific: e.g. Mid-level software engineers with 3–5 years of experience, Entry-level candidates in defense or aerospace",
        "goalOutcome": "Qualified candidates immediately understand the role, the requirements, and why the job is worth applying for. Unqualified candidates self-select out. Responsibilities are listed in order of importance, most critical first.",
        "goalScope": "List responsibilities from most important to least. Flag any must-have requirement that could unnecessarily narrow the candidate pool. Include a brief company culture statement at the end. Salary range: [amount or write OMIT].",
        "goalTone": "[Professional / startup / enterprise] — match the culture of the company",
        "goalNotes": "Do not add requirements that are not on my original list. Do not soften or remove must-have qualifications without flagging it as a suggestion first.",
        "refMaterial": "Role: \nFull-time / part-time / contract: \nLocation: \nHybrid / remote / on-site: \nSalary range (or OMIT): \nCompany name and size: \nWhat the company does in one sentence: \n\nResponsibilities, in order of time spent or importance: \n- \n- \n- \n- \n- \n\nMust-have requirements (years of experience, certifications, platforms): \n- \n- \n- \n\nPreferred / nice-to-have: \n- \n- \n\nCulture / what makes this role worth applying for: \n",
        "hint": [
          { "field": "Target audience", "text": "Replace [job title] with the role you're hiring for" },
          { "field": "Scope & constraints", "text": "For salary, fill in your actual figure or write OMIT to leave it out — don't leave the brackets" },
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" }
        ]
      },
      "refine": {
        "description": "Audit your existing posting for vague requirements, hidden barriers, and copy that's scaring off the people you want to hire.",
        "goalDocType": "Job description",
        "goalAudience": "Candidates applying for a [job title] role — be specific: e.g. Mid-level software engineers with 3–5 years of experience, Entry-level candidates in defense or aerospace",
        "goalOutcome": "Tighten my existing job description so qualified candidates immediately understand the role and unqualified candidates self-select out. Strengthen the opening, sharpen requirements, and make the culture statement land.",
        "goalScope": "Preserve all my listed requirements, responsibilities, and salary information. Reorder responsibilities by importance if needed. Flag must-haves that could narrow the candidate pool — do not silently remove them.",
        "goalTone": "[Professional / startup / enterprise] — match the culture of the company",
        "goalNotes": "Do not add requirements, certifications, or responsibilities that aren't in my draft. Do not change salary figures, location, or full-time/part-time status. Flag — don't fix silently — anything that reads as discriminatory or legally risky.",
        "refMaterial": "",
        "hint": [
          { "field": "Target audience", "text": "Replace [job title] with the role you're hiring for" },
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" },
          { "field": "Starting Document", "text": "Paste or upload your existing job posting on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // RESUME — both paths
  // ============================================================
  {
    "id": "resume",
    "name": "Résumé",
    "icon": "📄",
    "category": "Career & Hiring",
    "description": "Polish a draft résumé for a specific role, or generate one from your career notes.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "Generate a résumé from your career notes — accomplishments quantified, claims defensible, every line earning its space on the page.",
        "goalDocType": "Résumé",
        "goalAudience": "Hiring manager or recruiter reviewing candidates for a [job title] role — e.g. Hiring manager at a defense technology company",
        "goalOutcome": "Reader invites me to interview. The résumé shows clear impact and achievements, not just job duties. Every bullet demonstrates value.",
        "goalScope": "Build from the career history I provide. Do not invent jobs, titles, dates, or metrics. Strengthen what is there — every bullet should demonstrate impact, not just describe a duty.",
        "goalTone": "Confident, professional, action-oriented — strong verbs, no passive voice, no \"responsible for\"",
        "goalNotes": "Do not fabricate any metric, percentage, date, or achievement. If a bullet is weak as written, flag it instead of inventing a number.",
        "refMaterial": "Name: \nLocation: \nEmail · phone · LinkedIn URL: \n\nTarget role / type of role I'm applying for: \n\nSummary in two sentences (who I am, what I do): \n\nExperience — most recent first. For each job:\n  Title, company, dates: \n  What I actually did (use real numbers wherever possible): \n  - \n  - \n  - \n\n  Title, company, dates: \n  What I actually did:\n  - \n  - \n  - \n\nCertifications: \n\nEducation: \n  Degree, school, year: \n\nKey skills / platforms / tools (recruiter-keyword list): \n",
        "hint": [
          { "field": "Target audience", "text": "Replace [job title] with the role you're applying for" }
        ],
        "lengthMode": "hardcap",
        "lengthLimit": "2",
        "lengthUnit": "pages"
      },
      "refine": {
        "description": "Take a strong draft to ready-to-submit — sharper impact statements, cleaner structure, fewer words doing more work.",
        "goalDocType": "Résumé",
        "goalAudience": "Hiring manager or recruiter reviewing candidates for a [job title] role — e.g. Hiring manager at a defense technology company",
        "goalOutcome": "Polish my existing résumé so it shows clear impact and gets me interviewed. Replace duty-language with achievement-language. Tighten weak bullets. Surface the wins that are hiding inside generic phrasing.",
        "goalScope": "Do not remove or change job titles, companies, dates, or my listed metrics. Do not invent experience. Strengthen what is already there — replace \"responsible for\" with action verbs, replace duty-bullets with impact-bullets, surface numbers that are hiding in prose.",
        "goalTone": "Confident, professional, action-oriented — strong verbs, no passive voice, no \"responsible for\"",
        "goalNotes": "Do not remove or change any metrics, percentages, or dates — these are factual and verified by me. If a bullet is too weak to fix without making something up, flag it for me to address.",
        "refMaterial": "",
        "hint": [
          { "field": "Target audience", "text": "Replace [job title] with the role you're applying for" },
          { "field": "Starting Document", "text": "Paste or upload your existing résumé on Setup — Step 5 of 5 — Starting Document" }
        ],
        "lengthMode": "hardcap",
        "lengthLimit": "2",
        "lengthUnit": "pages"
      }
    }
  },

  // ============================================================
  // LINKEDIN ABOUT — both paths
  // ============================================================
  {
    "id": "linkedin-about",
    "name": "LinkedIn About",
    "icon": "🔗",
    "category": "Career & Hiring",
    "description": "Write the About section of your LinkedIn profile — what you actually do, who you do it for, and the credentials that prove it. Recruiter-scannable in 30 seconds, peer-credible on a closer read.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "Say what you actually do, who you do it for, and why your background is the proof — recruiter-scannable in 30 seconds, peer-credible on a closer read.",
        "goalDocType": "LinkedIn About Profile",
        "goalAudience": "Recruiters scanning for [your key certs / platforms / tools] keywords in 30 seconds. Peers in the field reading it on a closer pass to decide if you actually do the work.",
        "goalOutcome": "Recruiter sees credentials and platform experience and flags it as a match. Peer reads it and thinks \"this person actually does the work, not just talks about it.\"",
        "goalScope": "Lead with what you actually do, not where you work. Include credentials and platform experience without it reading like a resume bullet list. End with one line that gives a peer something to connect on.",
        "goalTone": "Professional but human. Not stiff. Engineer that can speak customer.",
        "goalNotes": "No \"passionate about,\" \"results-driven,\" or \"proven track record.\" If a sentence sounds like it could have been written about anyone in this field, rewrite it until it could only have been written about me. No \"open to opportunities\" or \"looking for my next chapter.\"",
        "refMaterial": "Role title (what I do, not where I work): \n\nYears of experience: \n\nPrimary credentials / certifications: \n\nPrimary platform(s) I work on: \n\nTools I use day to day: \n\nIdentity stack / environment context (if relevant): \n\nWhat I actually do day to day — be specific: \n\nThe kind of work I find interesting / what I'd want a peer to connect on: \n\nOne specific win or context that makes me distinct (no marketing language): \n",
        "hint": [
          { "field": "Target audience", "text": "Replace [bracketed key certs / platforms / tools] with the keywords recruiters in your field actually search on" }
        ],
        "lengthMode": "hardcap",
        "lengthLimit": "2000",
        "lengthUnit": "characters"
      },
      "refine": {
        "description": "Pull your About section out of consultant-speak — credentials proven, expertise specific, first two lines doing the heavy lifting.",
        "goalDocType": "LinkedIn About Profile",
        "goalAudience": "Recruiters scanning for [your key certs / platforms / tools] keywords in 30 seconds. Peers in the field reading it on a closer pass to decide if you actually do the work.",
        "goalOutcome": "Polish my existing LinkedIn About so recruiters flag me as a match and peers think \"this person actually does the work.\" Strip clichés. Surface real specifics. Tighten the opener so it lands in the first 30 seconds.",
        "goalScope": "Preserve my factual claims (role, credentials, platforms, years of experience). Replace generic phrasing with specifics. Cut marketing-speak. Keep one line that gives a peer something to connect on.",
        "goalTone": "Professional but human. Not stiff. Engineer that can speak customer.",
        "goalNotes": "No \"passionate about,\" \"results-driven,\" or \"proven track record.\" Cut anything that could have been written about anyone in my field. Do not invent credentials, platforms, or wins I haven't claimed.",
        "refMaterial": "",
        "hint": [
          { "field": "Target audience", "text": "Replace [bracketed key certs / platforms / tools] with the keywords recruiters in your field actually search on" },
          { "field": "Starting Document", "text": "Paste your existing LinkedIn About text on Setup — Step 5 of 5 — Starting Document" }
        ],
        "lengthMode": "hardcap",
        "lengthLimit": "2000",
        "lengthUnit": "characters"
      }
    }
  },

  // ============================================================
  // THANK-YOU LETTER — both paths
  // ============================================================
  {
    "id": "thank-you",
    "name": "Thank-You Letter",
    "icon": "🙏",
    "category": "Career & Hiring",
    "description": "Write a warm, genuine thank-you for any professional or personal occasion.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A thank-you that lands — specific enough to feel personal, warm enough to be remembered, short enough to actually be read.",
        "goalDocType": "Thank-you letter",
        "goalAudience": "The person receiving it — be specific: e.g. My hiring manager John Smith, A client named Sarah at Acme Corp, My mentor Dr. Jones",
        "goalOutcome": "Reader feels genuinely appreciated and remembers the specific moment I am referencing.",
        "goalScope": "No generic openers like \"I hope this finds you well.\" No corporate sign-offs like \"Best regards.\" One specific moment or gesture must be named — no vague thank-yous.",
        "goalTone": "[Warm and personal / professional but sincere / heartfelt] — pick one",
        "goalNotes": "Reference the specific thing I am thanking them for. Do not add any details I have not provided. Do not fabricate anything.",
        "refMaterial": "Recipient's name and relationship to me: \n\nWhat I'm thanking them for — the headline: \n\nThe specific moment or gesture I want to call out (be detailed — this is the thing that makes the letter not generic): \n\nOther things worth thanking them for: \n- \n- \n\nWhat I want them to know going forward: \n  (e.g. I'll work with them again / I've referred them / they're welcome to use me as a reference)\n",
        "hint": [
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" }
        ],
        "lengthMode": "hardcap",
        "lengthLimit": "1",
        "lengthUnit": "pages"
      },
      "refine": {
        "description": "Elevate a thank-you draft from polite to memorable — same gratitude, more specifics, none of the obligatory phrases.",
        "goalDocType": "Thank-you letter",
        "goalAudience": "The person receiving it — be specific: e.g. My hiring manager John Smith, A client named Sarah at Acme Corp, My mentor Dr. Jones",
        "goalOutcome": "Polish my existing thank-you so the reader feels genuinely appreciated and remembers the specific moment I referenced. Cut anything generic. Strengthen the one detail that makes it personal.",
        "goalScope": "Preserve my specifics — names, dates, the moment I named. Cut generic openers and sign-offs. Tighten the prose without sanding away the warmth.",
        "goalTone": "[Warm and personal / professional but sincere / heartfelt] — pick one",
        "goalNotes": "Do not invent details, moments, or context I didn't write. Do not soften the warmth into something corporate.",
        "refMaterial": "",
        "hint": [
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" },
          { "field": "Starting Document", "text": "Paste your existing thank-you draft on Setup — Step 5 of 5 — Starting Document" }
        ],
        "lengthMode": "hardcap",
        "lengthLimit": "1",
        "lengthUnit": "pages"
      }
    }
  },

  // ============================================================
  // BUSINESS PROPOSAL — both paths
  // ============================================================
  {
    "id": "business-proposal",
    "name": "Business Proposal",
    "icon": "💼",
    "category": "Business & Sales",
    "description": "Sharpen a proposal to win a client, secure a partnership, or pitch a new venture.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "Your offer end-to-end — problem, approach, deliverables, pricing — confident and credible without overpromising.",
        "goalDocType": "Business proposal",
        "goalAudience": "[Client name or type] — be specific: e.g. IT Director at a mid-size manufacturing firm, or Procurement committee at [company name]",
        "goalOutcome": "Reader approves the proposal or schedules a follow-up meeting. They clearly understand what we are offering, what it costs, and what happens next.",
        "goalScope": "Required sections: executive summary, problem statement, proposed solution, pricing or next steps. Use only the identity, offerings, and pricing from my Reference Material — do not invent services or credentials.",
        "goalTone": "Confident, credible, professional — not salesy",
        "goalNotes": "Do not change any pricing figures, timelines, or deliverable commitments. These are factual. Use [PRICE] or [TIMELINE] as placeholders where I have left them blank.",
        "refMaterial": "Who I am — company name and what kind of business: \n\nServices or products I offer (be specific): \n- \n- \n- \n\nWhat I do NOT offer (so the hive doesn't embellish): \n- \n\nPricing structure: \n  (e.g. $100/hour with 4-hour minimum, fixed-fee per project, tiered packages)\n\nClient / target audience for this proposal: \n  Company name: \n  Decision-maker role: \n  Industry / size: \n\nThe problem the client is trying to solve: \n\nWhy I'm a good fit for solving it: \n\nWhat happens next (the ask): \n  (e.g. schedule a 30-min discovery call / approve and sign / review and send back questions)\n",
        "hint": [
          { "field": "Target audience", "text": "Replace [Client name or type] and [company name] with your specifics" },
          { "field": "Additional instructions", "text": "Keep [PRICE] and [TIMELINE] as-is — these are intentional tags that prompt the AIs to ask you for those numbers, or replace them with your actual figures" }
        ],
        "lengthMode": "range",
        "lengthLimit": "2",
        "lengthMin": "1",
        "lengthUnit": "pages"
      },
      "refine": {
        "description": "Push your proposal from competent to compelling — clearer offer, stronger justification, sharper close. Built to win the meeting.",
        "goalDocType": "Business proposal",
        "goalAudience": "[Client name or type] — be specific: e.g. IT Director at a mid-size manufacturing firm, or Procurement committee at [company name]",
        "goalOutcome": "Polish my existing proposal so the reader approves it or schedules a follow-up. Strengthen the executive summary, tighten the problem statement, make the pricing crystal clear, and sharpen the call to action.",
        "goalScope": "Preserve all my pricing, timelines, deliverables, and identity claims exactly as written. Tighten the prose around them. Do not add services or credentials I haven't claimed.",
        "goalTone": "Confident, credible, professional — not salesy",
        "goalNotes": "Do not change any pricing figures, timelines, or deliverable commitments. Do not invent capabilities or case studies. If a section is weak, suggest a rewording rather than guessing at content I didn't provide.",
        "refMaterial": "",
        "hint": [
          { "field": "Target audience", "text": "Replace [Client name or type] and [company name] with your specifics" },
          { "field": "Starting Document", "text": "Paste or upload your existing proposal draft on Setup — Step 5 of 5 — Starting Document" }
        ],
        "lengthMode": "range",
        "lengthLimit": "2",
        "lengthMin": "1",
        "lengthUnit": "pages"
      }
    }
  },

  // ============================================================
  // EMAIL / OUTREACH — both paths
  // ============================================================
  {
    "id": "email-campaign",
    "name": "Email & Outreach",
    "icon": "📬",
    "category": "Business & Sales",
    "description": "Sharpen cold outreach, sales emails, follow-ups, or any important one-off message that needs to land.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A cold email, sales follow-up, or one-off ask that gets read past the first line and actually answered. No fluff, no openers nobody reads.",
        "goalDocType": "Be specific about the email type: e.g. Cold outreach email, Follow-up email after a meeting, Sales introduction email",
        "goalAudience": "Who is receiving this — be specific: e.g. VP of Engineering at a mid-size SaaS company, A former colleague I have not spoken to in two years, Hiring manager who interviewed me last week",
        "goalOutcome": "Reader opens it, reads it in full, and takes one specific action — e.g. replies to schedule a 20-minute call, clicks the link, responds with a yes or no.",
        "goalScope": "Lead with value to the recipient — not background on the sender. One clear ask only. No fluff, no jargon, no \"I hope this email finds you well.\" Include a subject line as the first line of the document.",
        "goalTone": "[Professional / direct / warm] — pick one. For cold outreach, direct tends to work better than warm.",
        "goalNotes": "Do not add background about me unless I specifically provide it. The email should be about what the reader gets, not who I am.",
        "refMaterial": "Recipient — name, role, company: \n\nHook / connection (something specific I can reference — a post they wrote, a mutual contact, a recent event): \n\nThe ask in one sentence: \n  (e.g. 20-min intro call / a yes-or-no on Z / a referral to X)\n\nWhat's in it for them (their angle, not mine): \n\nMy name and role (kept brief — this isn't about me): \n\nSubject line ideas (optional — the hive will draft one if I leave this empty): \n",
        "hint": [
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" }
        ]
      },
      "refine": {
        "description": "Recast a message draft so it lands — clearer ask, less throat-clearing, a call to action they can answer in one click.",
        "goalDocType": "Be specific about the email type: e.g. Cold outreach email, Follow-up email after a meeting, Sales introduction email",
        "goalAudience": "Who is receiving this — be specific: e.g. VP of Engineering at a mid-size SaaS company, A former colleague I have not spoken to in two years, Hiring manager who interviewed me last week",
        "goalOutcome": "Polish my existing email so the reader opens it, reads it in full, and takes the specific action I'm asking for. Sharpen the opening, cut sender-background fluff, make the ask unmistakable.",
        "goalScope": "Preserve the recipient's name, my hook, and my specific ask. Cut anything that doesn't serve the reader. Lead with value to them — not background on me. Strengthen or replace the subject line.",
        "goalTone": "[Professional / direct / warm] — pick one. For cold outreach, direct tends to work better than warm.",
        "goalNotes": "Do not invent context about the recipient or the relationship. Do not soften the ask. Do not add sender-background paragraphs.",
        "refMaterial": "",
        "hint": [
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" },
          { "field": "Starting Document", "text": "Paste your existing email draft on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // EXECUTIVE SUMMARY — both paths
  // ============================================================
  {
    "id": "executive-summary",
    "name": "Executive Summary",
    "icon": "📊",
    "category": "Business & Sales",
    "description": "Distil a long report, plan, or proposal into a tight, decision-ready summary for leadership.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "Condense the long version into one page leadership can act on — the decision, the trade-offs, the recommendation, the next step.",
        "goalDocType": "Executive summary",
        "goalAudience": "Be specific about who reads this — e.g. VP of Operations and CFO, Board of Directors, Program managers and senior leadership",
        "goalOutcome": "Reader understands the situation, the recommendation, and why it matters — in that order. They can make a decision or take action without reading the full source document.",
        "goalScope": "Lead with the conclusion. Strip jargon. Build the summary only from the facts in my Reference Material — do not infer beyond what I've provided.",
        "goalTone": "Direct, authoritative, jargon-free — written for someone who has 90 seconds to read it",
        "goalNotes": "Do not add detail not present in the Reference Material. Do not change any figures, recommendations, or conclusions.",
        "refMaterial": "The situation in one paragraph: \n\nThe recommendation in one sentence (lead with this): \n\nThe key supporting facts / data points (no more than 5): \n- \n- \n- \n- \n- \n\nWhat happens if we do nothing: \n\nWhat we're asking the reader to approve / decide: \n",
        "hint": [],
        "lengthMode": "hardcap",
        "lengthLimit": "1",
        "lengthUnit": "pages"
      },
      "refine": {
        "description": "Compress an exec-summary draft into a two-minute read — decision first, evidence second, no buried lede.",
        "goalDocType": "Executive summary",
        "goalAudience": "Be specific about who reads this — e.g. VP of Operations and CFO, Board of Directors, Program managers and senior leadership",
        "goalOutcome": "Tighten my existing executive summary so the reader understands the situation, the recommendation, and why it matters — in that order. They can make a decision without reading the full source document.",
        "goalScope": "Lead with the conclusion. Strip jargon. Only tighten and clarify what is already here — do not expand or invent.",
        "goalTone": "Direct, authoritative, jargon-free — written for someone who has 90 seconds to read it",
        "goalNotes": "Do not add detail not present in the source material. Do not change any figures, recommendations, or conclusions.",
        "refMaterial": "",
        "hint": [
          { "field": "Starting Document", "text": "Paste or upload your draft summary OR the full source document on Setup — Step 5 of 5. The hive will distil it." }
        ],
        "lengthMode": "hardcap",
        "lengthLimit": "1",
        "lengthUnit": "pages"
      }
    }
  },

  // ============================================================
  // RFP RESPONSE — both paths
  // ============================================================
  {
    "id": "rfp",
    "name": "RFP Response",
    "icon": "📋",
    "category": "Business & Sales",
    "description": "Craft a disciplined, structured response to a formal RFP that addresses every stated requirement.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "Answer every requirement, every section, every scoring criterion — a disciplined response that gives the evaluator no reason to set it aside.",
        "goalDocType": "RFP response",
        "goalAudience": "Evaluation committee at [issuing organization] reviewing responses to [RFP name or number]",
        "goalOutcome": "Every stated requirement in the RFP is addressed directly and clearly. Evaluators can find our response to each item without hunting for it. Our differentiators are clear and credible.",
        "goalScope": "Formal, precise, no marketing language. Address every requirement from my Reference Material in the order it appears in the RFP. Do not add capability claims not supported by what I provide.",
        "goalTone": "Formal, authoritative, direct — this is a compliance document, not a sales pitch",
        "goalNotes": "Do not change any figures, dates, or technical specifications. Do not omit or skip any RFP requirement, even if the answer is brief. If we can't meet a requirement, flag it — don't paper over it.",
        "refMaterial": "Issuing organization: \nRFP name or number: \nResponse deadline: \nScoring criteria (if disclosed): \n\nRequirements list (in order they appear in the RFP — number them): \n  1. \n  2. \n  3. \n  4. \n  5. \n\nOur capabilities relevant to this RFP — be specific, no marketing language: \n- \n- \n- \n\nDifferentiators (why us, not the other bidders): \n- \n- \n\nWhere we have gaps / can't fully meet a requirement (flag honestly): \n- \n",
        "hint": [
          { "field": "Target audience", "text": "Replace [issuing organization] and [RFP name or number] with the actual RFP details" }
        ]
      },
      "refine": {
        "description": "Pressure-test your RFP draft against the requirements list — gaps closed, claims supported, scoring criteria addressed line by line.",
        "goalDocType": "RFP response",
        "goalAudience": "Evaluation committee at [issuing organization] reviewing responses to [RFP name or number]",
        "goalOutcome": "Tighten my existing RFP response so every stated requirement is addressed clearly and the evaluators can find each answer without hunting. Sharpen our differentiators.",
        "goalScope": "Preserve all my technical specifications, capability claims, pricing, and dates exactly. Tighten the prose. Ensure every RFP requirement has a response — flag any I've missed.",
        "goalTone": "Formal, authoritative, direct — this is a compliance document, not a sales pitch",
        "goalNotes": "Do not change any figures, dates, or technical specifications. Do not invent capability claims. If a requirement is unanswered in my draft, flag it — don't fabricate.",
        "refMaterial": "",
        "hint": [
          { "field": "Target audience", "text": "Replace [issuing organization] and [RFP name or number] with the actual RFP details" },
          { "field": "Starting Document", "text": "Paste or upload your existing RFP response on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // BLOG POST / ARTICLE — both paths
  // ============================================================
  {
    "id": "blog-post",
    "name": "Blog Post / Article",
    "icon": "📝",
    "category": "Content & Marketing",
    "description": "Publish-ready content with a strong voice, clear structure, and solid flow.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "An idea turned into a publish-ready post — voice intact, structure clear, opening that earns the click and closing that earns a share.",
        "goalDocType": "Blog post — or be specific about format: e.g. Opinion piece, How-to article, Listicle",
        "goalAudience": "Who reads this and where — e.g. Small business owners new to AI, reading on LinkedIn, Senior engineers evaluating wireless platforms",
        "goalOutcome": "Reader finishes the post and [takes a specific action or understands a specific thing]. End with a clear call to action. e.g. Reader understands the three main options and clicks through to learn more.",
        "goalScope": "Must cover: [list 3–5 key points]. Build only from the thesis, examples, and facts in my Reference Material. Do not invent statistics or quote sources I haven't named.",
        "goalTone": "Be specific: e.g. Direct, short sentences, slightly sarcastic, no jargon or Authoritative and data-driven, formal but approachable. Without this the AIs will default to a bland, generic style.",
        "goalNotes": "Do not change my unique angle or perspective. Do not invent statistics, quotes, or sources.",
        "refMaterial": "Thesis / the angle (one sentence): \n\nWhy this matters to the reader: \n\nThe 3–5 key points the post must hit: \n  1. \n  2. \n  3. \n  4. \n  5. \n\nA concrete example, story, or data point that grounds the post (use real numbers / real situations): \n\nCall to action at the end: \n",
        "lengthMode": "range",
        "lengthMin": "800",
        "lengthLimit": "1500",
        "lengthUnit": "words",
        "hint": [
          { "field": "Desired outcome", "text": "Replace [takes a specific action or understands a specific thing] with what you want readers to do or learn after reading" },
          { "field": "Scope & constraints", "text": "Replace [list 3–5 key points] with your actual key points" }
        ]
      },
      "refine": {
        "description": "Bring a rough draft to ready — tighter paragraphs, stronger transitions, the kind of structure readers don't notice because it's working.",
        "goalDocType": "Blog post — or be specific about format: e.g. Opinion piece, How-to article, Listicle",
        "goalAudience": "Who reads this and where — e.g. Small business owners new to AI, reading on LinkedIn, Senior engineers evaluating wireless platforms",
        "goalOutcome": "Polish my existing draft so the reader finishes the post and [takes a specific action or understands a specific thing]. Strengthen the opening, tighten the middle, sharpen the call to action.",
        "goalScope": "Preserve my thesis, angle, examples, and any numbers or quotes I've used. Tighten weak prose. Strengthen the voice — do not sand it down into generic blog tone.",
        "goalTone": "Be specific: e.g. Direct, short sentences, slightly sarcastic, no jargon or Authoritative and data-driven, formal but approachable. Without this the AIs will default to a bland, generic style.",
        "goalNotes": "Do not change my unique angle or perspective. Strengthen the voice — do not sand it down into something that sounds like everyone else. Do not invent statistics or sources.",
        "refMaterial": "",
        "lengthMode": "range",
        "lengthMin": "800",
        "lengthLimit": "1500",
        "lengthUnit": "words",
        "hint": [
          { "field": "Desired outcome", "text": "Replace [takes a specific action or understands a specific thing] with what you want readers to do or learn after reading" },
          { "field": "Starting Document", "text": "Paste your draft post on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // PRESENTATION OUTLINE — both paths
  // ============================================================
  {
    "id": "presentation",
    "name": "Presentation Outline",
    "icon": "🖥️",
    "category": "Content & Marketing",
    "description": "Build a slide-by-slide speaker outline ready to drop into PowerPoint, Keynote, or Slides.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A slide-by-slide speaker outline ready to drop into PowerPoint, Keynote, or Slides — every slide doing exactly one job.",
        "goalDocType": "Presentation outline — speaker notes format",
        "goalAudience": "The audience for the talk — e.g. C-suite leadership team, New hire onboarding group, External conference attendees",
        "goalOutcome": "A slide-by-slide outline ready to copy into a presentation tool. Each slide must have: a slide title, 3–5 speaker note bullets, and one suggested visual or data point. Open with a strong hook, close with a clear call to action.",
        "goalScope": "[X]-minute talk. [Number] slides maximum. Bullet points only — no prose paragraphs. This is a speaker outline, not a script. WaxFrame outputs text — you will paste this into your presentation tool separately.",
        "goalTone": "[Informative / persuasive / conversational] — match the formality level of the audience",
        "goalNotes": "Do not write full sentences in the speaker bullets. Keep each bullet to one line. Do not add slides beyond the count I specify.",
        "refMaterial": "Driving question / topic of the talk: \n\nRecommendation or key takeaway (the one thing the audience should leave with): \n\nReasoning / supporting facts: \n- \n- \n- \n\nContext the audience needs (where things stand today): \n\nHard constraints (time limits, decision deadlines, budget figures, audience knowledge level): \n\nVisuals or data points worth including: \n",
        "hint": [
          { "field": "Scope & constraints", "text": "Replace [X] with your topic and [Number] with how many slides you want" },
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" }
        ]
      },
      "refine": {
        "description": "Reshape your slide outline so each slide earns its place — clearer arc, sharper takeaways, no filler.",
        "goalDocType": "Presentation outline — speaker notes format",
        "goalAudience": "The audience for the talk — e.g. C-suite leadership team, New hire onboarding group, External conference attendees",
        "goalOutcome": "Polish my existing outline so the slide flow is tight, each slide earns its place, and the speaker bullets are actually one-liners. Strengthen the hook and the close.",
        "goalScope": "Preserve my slide count, content, and key data points. Tighten speaker bullets to one line. Cut redundant slides. Do not add new content beyond what I've drafted.",
        "goalTone": "[Informative / persuasive / conversational] — match the formality level of the audience",
        "goalNotes": "Do not invent data points, statistics, or recommendations. Do not add slides beyond the count I have. Keep each speaker bullet to one line.",
        "refMaterial": "",
        "hint": [
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" },
          { "field": "Starting Document", "text": "Paste your existing outline (speaker-notes format) on Setup — Step 5 of 5" }
        ]
      }
    }
  },

  // ============================================================
  // RECIPE — both paths
  // ============================================================
  {
    "id": "recipe",
    "name": "Recipe",
    "icon": "🍳",
    "category": "Personal & Everyday",
    "description": "Turn rough notes or a draft recipe into a polished write-up with clear instructions and consistent formatting.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "Cooking notes turned into a recipe anyone can follow — ingredients listed, steps in order, timings that match how the dish actually comes together.",
        "goalDocType": "Recipe",
        "goalAudience": "Who will cook from this — e.g. Home cook, beginner level, Experienced baker, Meal prep audience, intermediate skill",
        "goalOutcome": "Anyone following this recipe can cook the dish successfully on the first try. Instructions are clear, ingredient quantities are precise, and steps are in a logical order with nothing assumed.",
        "goalScope": "Build from the ingredients, quantities, and technique notes in my Reference Material. Include: ingredient list with quantities, numbered steps, and at least one tip on substitutions or storage.",
        "goalTone": "[Warm and conversational / precise and technical / beginner-friendly] — pick one",
        "goalNotes": "Do not substitute ingredients without flagging it as an optional variation. Do not invent cooking times or techniques — flag anything uncertain instead of making it up.",
        "refMaterial": "Dish name: \n\nWhat makes this version distinct from typical versions of the dish: \n\nIngredients with quantities (be precise — this is what the hive locks): \n- \n- \n- \n- \n- \n\nTechnique notes / order of operations: \n\nCooking time / temperature: \n\nServes how many: \n\nKey tips, substitutions, or storage notes: \n",
        "hint": [
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" }
        ]
      },
      "refine": {
        "description": "A recipe draft cleaned up into a polished write-up — consistent measurements, clear ordering, instructions that match how you actually cook it.",
        "goalDocType": "Recipe",
        "goalAudience": "Who will cook from this — e.g. Home cook, beginner level, Experienced baker, Meal prep audience, intermediate skill",
        "goalOutcome": "Polish my draft recipe so anyone following it can cook the dish successfully on the first try. Clarify ambiguous steps, lock the ingredient list, ensure nothing is assumed.",
        "goalScope": "Do not change the core recipe — only clarify and improve what is there. Ingredient quantities and cooking times must stay as written. Strengthen instructions where they're ambiguous.",
        "goalTone": "[Warm and conversational / precise and technical / beginner-friendly] — pick one",
        "goalNotes": "Do not substitute ingredients without flagging it as an optional variation. Do not add unverified cooking times or techniques — flag anything uncertain instead of inventing it.",
        "refMaterial": "",
        "hint": [
          { "field": "Tone & voice", "text": "Pick ONE option from the brackets and remove the rest" },
          { "field": "Starting Document", "text": "Paste your draft recipe on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // CONTRACTOR / VENDOR LETTER — both paths
  // ============================================================
  {
    "id": "contractor-letter",
    "name": "Contractor / Vendor Letter",
    "icon": "🧾",
    "category": "Personal & Everyday",
    "description": "Refine a letter to a contractor, vendor, or service provider — invoice disputes, scope concerns, punch-list items, or anything where you need to be clear, professional, and firm without escalating.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "Address an invoice dispute, scope concern, or punch-list issue in writing — clear, professional, firm without escalating.",
        "goalDocType": "Letter to my [contractor / vendor / service provider] regarding [the first invoice / scope dispute / punch-list items]",
        "goalAudience": "The [contractor / vendor / project manager] who did the work — be specific about the relationship: e.g. The general contractor we hired, The vendor that installed our HVAC",
        "goalOutcome": "A clear, professional record of my concerns and the items I need addressed before [I pay / we close out the project / we move forward]. The recipient understands what is wrong, what I expect, and what comes next.",
        "goalScope": "Include all items from my Reference Material with pricing intact. Do not invent additional items, dates, or amounts. Keep my factual claims (dates, amounts, names) intact.",
        "goalTone": "Professional and courteous but firm. Not adversarial, not apologetic.",
        "goalNotes": "Do not soften my concerns. Do not invent context, dates, or amounts I haven't provided. If a section is unclear, suggest a rewording rather than guessing what I meant.",
        "refMaterial": "Recipient name and business: \n\nProject / service description: \n  Dates: \n  Original quote / contract amount: \n  Amount paid so far: \n  Amount currently disputed or in question: \n\nMy concerns / punch list items (be specific — dollar figures, dates, what was supposed to happen vs what did): \n  1. \n  2. \n  3. \n  4. \n\nWhat I want them to do: \n  (e.g. revise the invoice / finish item X / refund Y / explain Z in writing)\n\nDeadline for response: \n\nWhat happens if they don't respond: \n  (e.g. I withhold final payment / file with BBB / pursue arbitration)\n",
        "hint": [
          { "field": "Document type", "text": "Pick ONE option from the brackets and remove the rest — match what you're actually writing" },
          { "field": "Target audience", "text": "Pick ONE option and replace with your specifics" }
        ]
      },
      "refine": {
        "description": "Rework a frustrated draft so it lands — same point, more composure. Clear, professional, firm without escalating.",
        "goalDocType": "Letter to my [contractor / vendor / service provider] regarding [the first invoice / scope dispute / punch-list items]",
        "goalAudience": "The [contractor / vendor / project manager] who did the work — be specific about the relationship: e.g. The general contractor we hired, The vendor that installed our HVAC",
        "goalOutcome": "Polish my existing letter so the recipient understands what is wrong, what I expect, and what comes next. Tighten the prose, sharpen the asks, keep the tone firm but professional.",
        "goalScope": "Preserve every dollar figure, date, name, and item exactly as I've written it. Tighten language around them. Do not soften my concerns or invent additional items.",
        "goalTone": "Professional and courteous but firm. Not adversarial, not apologetic.",
        "goalNotes": "Do not invent context, dates, amounts, or items. If a section is unclear, suggest a rewording rather than guessing what I meant. Do not soften the firmness.",
        "refMaterial": "",
        "hint": [
          { "field": "Document type", "text": "Pick ONE option from the brackets and remove the rest — match what you're actually writing" },
          { "field": "Target audience", "text": "Pick ONE option and replace with your specifics" },
          { "field": "Starting Document", "text": "Paste your existing draft on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // LINKEDIN POST — both paths
  // ============================================================
  {
    "id": "linkedin-post",
    "name": "LinkedIn Post",
    "icon": "💼",
    "category": "Content & Marketing",
    "description": "Write a short-form LinkedIn post — a lesson, a hot take, or a war story — that reads as a peer talking to peers, not a thought leader trying to grow an audience.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A short-form LinkedIn post — a lesson, a hot take, a war story — that reads as a peer talking to peers, not a thought leader trying to grow an audience.",
        "goalDocType": "LinkedIn Post",
        "goalAudience": "My LinkedIn network — [your peers, recruiters, former colleagues, anyone scrolling fast]. They scroll fast. If the first two lines don't land, they keep scrolling.",
        "goalOutcome": "Reader stops scrolling, reads the whole post, and either comments or sends a connection request. The post should feel earned, not braggy.",
        "goalScope": "Cover one specific topic with a clear opinion or lesson. Hook in the first line. Use real numbers and specifics where you have them. End with a question that invites comments. Do not name a current employer if there are confidentiality or OPSEC concerns.",
        "goalTone": "Conversational, direct, no LinkedIn-influencer voice. Sounds like a peer talking to peers, not a thought leader trying to grow an audience.",
        "goalNotes": "No \"I'm proud to announce,\" \"thrilled,\" or \"humbled\" — the LinkedIn opener virus. No emojis except maybe one at the end. No call to \"DM me to learn more.\" No buzzwords (synergy, leverage, revolutionize). If a paragraph reads like a brochure, cut it.",
        "refMaterial": "Topic / war story / lesson — what's the post actually about: \n\nThe hook (the first one or two lines that make someone stop scrolling): \n\nReal numbers, specifics, or names I can use (anonymize where needed): \n\nThe lesson I want to land: \n\nThe question I'll end with (to invite comments): \n\nAny confidentiality / OPSEC notes (employers / clients to NOT name): \n",
        "lengthMode": "hardcap",
        "lengthLimit": "2000",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Target audience", "text": "Replace [bracketed audience] with your specific peers/recruiters/former colleagues — be specific about who you're writing for" }
        ]
      },
      "refine": {
        "description": "Tune your post draft from interesting to scroll-stopping — same idea, sharper voice, no LinkedIn-speak.",
        "goalDocType": "LinkedIn Post",
        "goalAudience": "My LinkedIn network — [your peers, recruiters, former colleagues, anyone scrolling fast]. They scroll fast. If the first two lines don't land, they keep scrolling.",
        "goalOutcome": "Polish my draft post so the reader stops scrolling, reads the whole thing, and engages. Strengthen the hook, cut the brochure-language, sharpen the closing question.",
        "goalScope": "Preserve my specifics, numbers, and the lesson. Cut anything that reads like a brochure or influencer post. Lead with the hook.",
        "goalTone": "Conversational, direct, no LinkedIn-influencer voice. Sounds like a peer talking to peers, not a thought leader trying to grow an audience.",
        "goalNotes": "No \"I'm proud to announce,\" \"thrilled,\" or \"humbled.\" Cut buzzwords. Do not invent context or numbers I haven't claimed.",
        "refMaterial": "",
        "lengthMode": "hardcap",
        "lengthLimit": "2000",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Target audience", "text": "Replace [bracketed audience] with your specific peers/recruiters/former colleagues — be specific about who you're writing for" },
          { "field": "Starting Document", "text": "Paste your draft post on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // RESTAURANT REVIEW — both paths
  // ============================================================
  {
    "id": "restaurant-review",
    "name": "Restaurant Review",
    "icon": "🍽️",
    "category": "Reviews & Recommendations",
    "description": "Create or refine a useful restaurant review covering food, service, atmosphere, value, logistics, and whether you'd return.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A useful restaurant review covering food, service, atmosphere, value, logistics, and whether you'd actually return.",
        "goalDocType": "Restaurant review",
        "goalAudience": "People deciding whether this restaurant is worth visiting. They want practical details about food, service, atmosphere, value, and logistics, not vague praise or complaints.",
        "goalOutcome": "Create a useful, honest review that explains what the experience was actually like, what was ordered, what was good, what was disappointing, whether the price made sense, and whether I would return.",
        "goalScope": "Include visit context, food and drinks ordered, pricing if known, service, atmosphere, cleanliness, parking or location notes, standout items, disappointments, and final recommendation. Build only from the visit details in my Reference Material — do not invent dishes, prices, staff names, dates, or facts.",
        "goalTone": "Conversational, detailed, fair, practical, and direct. Preserve the reviewer's natural voice. Honest criticism is fine, but avoid making it sound like a rant unless the source material genuinely supports that tone.",
        "goalNotes": "End with a clear bottom line: whether I would return, who this restaurant is best for, and any specific warning, recommendation, or timing advice for future visitors.",
        "refMaterial": "Restaurant: \nLocation: \nDate/time: \nWho was there (solo / couple / family / group / business): \nDine-in / takeout / delivery / patio / bar: \nReservation or walk-in: \nParking notes: \nFirst impression of exterior/interior: \nNoise / lighting / seating / cleanliness: \nWhat was ordered (drinks, apps, entrées, sides, dessert): \nPrices remembered: \nFood quality (flavor, temperature, portion, freshness, presentation): \nBest item: \nWorst item or disappointment: \nService quality: \nProblems and how staff handled them: \nWould you return: \nWho is this restaurant best for: ",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthUnit": "",
        "hint": [
          { "field": "Length Constraint", "text": "Length is arbitrary — set based on the platform where the review will be posted. Google Maps: Hard cap · 750–1,200 characters. Yelp: Range · 200–1,500 words. TripAdvisor: leave No limit for full long-form, or Hard cap · 500–900 words for tighter posts. If you're not sure where it'll land, leave No limit and decide at publish time." }
        ]
      },
      "refine": {
        "description": "Lift a review draft from vague to genuinely useful — concrete examples, fair framing, the kind of detail other diners act on.",
        "goalDocType": "Restaurant review",
        "goalAudience": "People deciding whether this restaurant is worth visiting. They want practical details about food, service, atmosphere, value, and logistics, not vague praise or complaints.",
        "goalOutcome": "Polish my existing review so it's useful, honest, and actionable. Strengthen the specific details, cut vague praise/complaints, make sure the final recommendation lands clearly.",
        "goalScope": "Preserve all my factual details — dishes, prices, dates, staff interactions. Cut vagueness, sharpen specifics. End with a clear bottom line.",
        "goalTone": "Conversational, detailed, fair, practical, and direct. Preserve the reviewer's natural voice. Honest criticism is fine, but avoid making it sound like a rant unless the source material genuinely supports that tone.",
        "goalNotes": "Do not invent dishes, prices, staff names, dates, or facts. Do not soften legitimate criticism.",
        "refMaterial": "",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthUnit": "",
        "hint": [
          { "field": "Length Constraint", "text": "Length is arbitrary — set based on the platform where the review will be posted. Google Maps: Hard cap · 750–1,200 characters. Yelp: Range · 200–1,500 words. TripAdvisor: leave No limit for full long-form, or Hard cap · 500–900 words for tighter posts. If you're not sure where it'll land, leave No limit and decide at publish time." },
          { "field": "Starting Document", "text": "Paste your draft review on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // HOTEL REVIEW — both paths
  // ============================================================
  {
    "id": "hotel-review",
    "name": "Hotel Review",
    "icon": "🏨",
    "category": "Reviews & Recommendations",
    "description": "Create or refine a hotel review covering room, sleep quality, location, amenities, service, value, and dealbreakers.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A hotel review that covers what travelers actually want to know — room, sleep quality, location, amenities, service, value, dealbreakers.",
        "goalDocType": "Hotel review",
        "goalAudience": "Travelers deciding whether to book this hotel — especially business travelers, families, road-trippers, or people comparing nearby properties.",
        "goalOutcome": "Create a detailed, practical hotel review that helps readers understand the room, sleep quality, location, amenities, service, value, and any problems that affected the stay.",
        "goalScope": "Cover trip context, room type or room number if provided, rate/value, check-in, room layout, cleanliness, bed, bathroom, HVAC, noise, darkness, internet, breakfast, gym, pool, bar, parking, location, staff, and final recommendation. Build only from the stay details in my Reference Material — do not invent amenities, prices, loyalty benefits, room numbers, or facts.",
        "goalTone": "Practical, detailed, fair, and conversational. Preserve useful personal observations and specific traveler-focused details.",
        "goalNotes": "Include whether I would stay again and what type of traveler this hotel is best suited for. Mention dealbreakers clearly.",
        "refMaterial": "Hotel: \nLocation: \nDates of stay: \nTrip type (business / vacation / family / event / road trip): \nWho was there (solo / couple / family / group): \nRoom type and number if relevant: \nRate / points / resort fee / parking fee / other fees: \nCheck-in experience: \nStaff interactions: \nRoom size, layout, furniture, outlets, desk: \nCleanliness and maintenance: \nBed and pillows: \nNoise (hallway, street, airport, neighbors, elevators, kids): \nRoom darkness / blackout curtains: \nHVAC / temperature control: \nBathroom layout, shower pressure, hot water, towels, toiletries: \nWi-Fi speed and reliability: \nBreakfast quality and variety: \nGym / pool / bar / lounge / laundry / shuttle / parking: \nNearby restaurants / walkability / transit / airport / attractions / work site: \nProblems and how staff handled them: \nWould you stay again: \nWho is this hotel best for: ",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthUnit": "",
        "hint": [
          { "field": "Length Constraint", "text": "Length is arbitrary — set based on the platform where the review will be posted. Google Maps: Hard cap · 750–1,200 characters. TripAdvisor: leave No limit for full long-form, or Hard cap · 500–900 words for tighter posts. Booking.com / Hotels.com: Hard cap · 200–600 words typical. If you're not sure where it'll land, leave No limit and decide at publish time." }
        ]
      },
      "refine": {
        "description": "Rewrite a hotel review draft so it earns trust — specific examples, fair tone, the kind of detail that helps other travelers decide.",
        "goalDocType": "Hotel review",
        "goalAudience": "Travelers deciding whether to book this hotel — especially business travelers, families, road-trippers, or people comparing nearby properties.",
        "goalOutcome": "Polish my existing hotel review so it's detailed, practical, and traveler-useful. Surface the friction points (noise, HVAC, hot water, Wi-Fi, parking, fees) that lobby marketing won't.",
        "goalScope": "Preserve my factual details — dates, room number, rates, staff interactions, problems. Strengthen the practical detail. End with a clear recommendation for type of traveler.",
        "goalTone": "Practical, detailed, fair, and conversational. Preserve useful personal observations and specific traveler-focused details.",
        "goalNotes": "Do not invent amenities, prices, loyalty benefits, room numbers, or facts. Do not soften legitimate dealbreakers.",
        "refMaterial": "",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthUnit": "",
        "hint": [
          { "field": "Length Constraint", "text": "Length is arbitrary — set based on the platform where the review will be posted. Google Maps: Hard cap · 750–1,200 characters. TripAdvisor: leave No limit for full long-form, or Hard cap · 500–900 words for tighter posts. Booking.com / Hotels.com: Hard cap · 200–600 words typical. If you're not sure where it'll land, leave No limit and decide at publish time." },
          { "field": "Starting Document", "text": "Paste your draft review on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // BUSINESS / SERVICE REVIEW — both paths
  // ============================================================
  {
    "id": "business-review",
    "name": "Business / Service Review",
    "icon": "🧾",
    "category": "Reviews & Recommendations",
    "description": "Create or refine a review of a business, contractor, service provider, parking company, repair service, delivery experience, or other non-restaurant/non-hotel business.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A review of a contractor, repair service, parking company, delivery experience, or any business outside the restaurant/hotel buckets — useful, specific, fair.",
        "goalDocType": "Business or service review",
        "goalAudience": "People deciding whether to hire, visit, book, or use this business. They care about reliability, value, professionalism, communication, and how problems are handled.",
        "goalOutcome": "Create a fair but useful review that explains why I used the business, what happened, what went well, what went wrong, how the business handled it, and whether I would recommend them.",
        "goalScope": "Include reason for using the business, booking or arrival process, staff behavior, service quality, pricing/value, problems, resolution attempts, observed business practices, and final recommendation. Build only from the experience details in my Reference Material — do not exaggerate, speculate beyond facts, or invent details.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed, but avoid sounding like a rant unless the source material genuinely supports it.",
        "goalNotes": "End with practical advice: who should use this business, who should avoid it, and what to watch out for. Do not add legal conclusions, accusations, or claims beyond the facts provided.",
        "refMaterial": "Business: \nLocation: \nType of service or product: \nWhy you used them: \nDate/time: \nBooking process (app / website / phone / walk-in / reservation / estimate / quote): \nPrice quoted vs. price paid: \nArrival/check-in process: \nStaff behavior and communication: \nWhat went well: \nWhat went wrong: \nDelays / confusion / unexpected charges / damage / poor workmanship / service failures: \nHow the business responded when a problem came up: \nWhether they fixed the issue: \nObserved practices future customers should know about: \nWould you use them again: \nWho should use them and who should avoid them: ",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthUnit": "",
        "hint": [
          { "field": "Length Constraint", "text": "Length is arbitrary — set based on the platform where the review will be posted. Google Maps: Hard cap · 750–1,200 characters. Yelp: Range · 200–1,500 words. TripAdvisor / BBB / industry-specific platforms: leave No limit for full long-form, or Hard cap · 500–900 words for tighter posts. If you're not sure where it'll land, leave No limit and decide at publish time." }
        ]
      },
      "refine": {
        "description": "Strengthen a service-review draft into something useful — concrete examples, fair framing, no rant-with-no-evidence.",
        "goalDocType": "Business or service review",
        "goalAudience": "People deciding whether to hire, visit, book, or use this business. They care about reliability, value, professionalism, communication, and how problems are handled.",
        "goalOutcome": "Polish my existing review so it's fair, useful, and specific. Strengthen the concrete details, cut vagueness, sharpen the recommendation.",
        "goalScope": "Preserve all my factual details — dates, prices, staff interactions, what went wrong. Replace vague language with specifics. End with practical advice for future customers.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed, but avoid sounding like a rant unless the source material genuinely supports it.",
        "goalNotes": "Do not add legal conclusions, accusations, or claims beyond facts provided. Do not invent prices, dates, or interactions.",
        "refMaterial": "",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthUnit": "",
        "hint": [
          { "field": "Length Constraint", "text": "Length is arbitrary — set based on the platform where the review will be posted. Google Maps: Hard cap · 750–1,200 characters. Yelp: Range · 200–1,500 words. TripAdvisor / BBB / industry-specific platforms: leave No limit for full long-form, or Hard cap · 500–900 words for tighter posts. If you're not sure where it'll land, leave No limit and decide at publish time." },
          { "field": "Starting Document", "text": "Paste your draft review on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // MULTI-PLATFORM REVIEW REWRITE — refine-only by definition
  // (operates on a source review pasted into Starting Document)
  // ============================================================
  {
    "id": "multi-platform-review",
    "name": "Multi-Platform Review Rewrite",
    "icon": "🔁",
    "category": "Reviews & Recommendations",
    "description": "Turn one detailed review into platform-ready versions for TripAdvisor, Google Maps, and Yelp while preserving the same facts and natural voice.",
    "paths": ["refine"],
    "pathContent": {
      "refine": {
        "goalDocType": "Multi-platform customer review rewrite",
        "goalAudience": "Readers on TripAdvisor, Google Maps, and Yelp who are deciding whether to visit, book, hire, or avoid the business being reviewed.",
        "goalOutcome": "Create three platform-ready versions of the same review: a detailed TripAdvisor version, a shorter practical Google Maps version, and a conversational Yelp version. All three preserve the same facts and final recommendation.",
        "goalScope": "Use only the facts from the source review I paste into Starting Document. Do not invent dishes, rooms, prices, staff names, amenities, dates, locations, or outcomes. Preserve the reviewer's actual experience and final opinion. Remove repetition where helpful, but do not remove important practical details.",
        "goalTone": "Natural, conversational, useful, specific, and fair. Preserve the reviewer's voice. Do not make the review sound corporate, fake, overly polished, or AI-generated.",
        "goalNotes": "Output three clearly labeled sections — TripAdvisor, Google Maps, Yelp. TripAdvisor is the most detailed (500–900 words). Google Maps is concise and skimmable (750–1,200 characters). Yelp is conversational and personality-forward (300–700 words).",
        "refMaterial": "MULTI-PLATFORM REVIEW SPLITTING DIRECTIVE — read every round. Take the source review (Starting Document) and produce three platform-ready versions, all preserving the same facts and final recommendation: TripAdvisor 500-900 words detailed narrative travel-context; Google Maps 750-1200 characters concise skim-friendly bottom-line-first; Yelp 300-700 words conversational first-person no corporate polish. Every reviewer evaluates all three sections every round. Do not invent details not in the source. Do not let versions drift in factual content. If the working document does not yet contain all three labeled sections, flag that as primary feedback so the Builder produces the split next round.",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthUnit": "",
        "hint": [
          { "field": "Length Constraint", "text": "Length intentionally left unset — each of the three platform versions has its own target inside the Builder output (TripAdvisor 500–900 words, Google Maps 750–1,200 chars, Yelp 300–700 words). Do not set a single hard cap or it will compress all three." },
          { "field": "Starting Document", "text": "Use this template AFTER you have a long detailed review (from the Restaurant / Hotel / Business-Service templates). Paste the source review on Setup — Step 5 of 5 — Starting Document; this template's Builder produces the three platform-ready cuts." }
        ]
      }
    }
  }
];
