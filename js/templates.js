// ============================================================
//  WaxFrame — templates.js  (v3.38.3 — per-path descriptions, full audit)
// Build: 20260608-011
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
//  Most templates support both paths. Single-path templates:
//    - quick-start            paths: ["scratch"]  (the from-scratch
//                                                  onboarding demo)
//    - trim-to-tripadvisor    paths: ["refine"]   ┐ the three platform
//    - trim-to-google-maps    paths: ["refine"]   │ review templates —
//    - rewrite-as-yelp        paths: ["refine"]   ┘ all reshape an
//                                                  existing source review
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
  // PRODUCT REVIEW — both paths (v3.63.61)
  //
  // Platform-agnostic: works for Amazon, Best Buy, Target, Walmart,
  // manufacturer site, blog post, etc. The user picks where to post
  // and tunes Length on the Project screen accordingly (see hint).
  // Scaffold mirrors the dimensions that drive useful product reviews
  // — purchase context, use over time, build quality, what worked,
  // what didn't, value, recommendation.
  // ============================================================
  {
    "id": "product-review",
    "name": "Product Review",
    "icon": "\ud83d\udce6",
    "category": "Reviews & Recommendations",
    "description": "Create or refine a useful product review covering purchase context, use over time, build quality, value, and final recommendation.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A useful product review covering purchase context, use over time, what worked, what didn't, value, and whether you'd buy it again.",
        "goalDocType": "Product review",
        "goalAudience": "People deciding whether to purchase this product. They want practical, specific details about real-world use — not generic praise or vague complaints.",
        "goalOutcome": "Create a fair, honest, useful review that explains how the product actually performed over time, what worked, what didn't, whether the price made sense, and who should (or should not) buy it.",
        "goalScope": "Include purchase context (why bought, price paid, model/variant), setup or first impressions, use over time (how long, how often, what for), build quality, what worked well, what didn't, any defects or failures, accuracy of the product description, customer support or return experience if relevant, value for money, who should buy it, who should avoid it, and whether you'd buy it again. Build only from the facts in my Reference Material \u2014 do not invent specs, prices, dates, or features.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed, but avoid sounding like a rant unless the source material genuinely supports that tone. Preserve the reviewer's natural voice.",
        "goalNotes": "Open with a one-line headline that captures the actual verdict from this specific review — not a generic 'Review of [product]' or '[Product Name] Review' stub. The headline should hint at the real conclusion (e.g. 'Flimsy after three months — looks good but won't last', 'Solid value if you only need it occasionally', 'Crushes cans fine, falls apart fast'). No quotes around it, no 'Review:' prefix. Keep the headline at or under 100 characters — Amazon caps review titles at 100, and most other retailers (Best Buy, Walmart, Target, Newegg) enforce headline limits that are tighter still. Staying ≤100 is safe for Amazon and a reasonable target across the board. Then end with a clear bottom line: who this product is best for, who should avoid it, and any specific advice or warning for future buyers.",
        "refMaterial": "Product name: \nBrand: \nModel / variant: \nPrice paid: \nWhere purchased: \nWhy you bought it: \nHow long you've used it: \nHow often you use it: \nWhat you used it for: \nSetup / installation: \nFirst impressions: \nBuild quality: \nEase of use: \nPerformance over time: \nWhat worked well: \nWhat did not work well: \nAny defects, missing parts, or failures: \nAccuracy of product description: \nCustomer support or return experience: \nValue for the money: \nStar rating (0\u20135): \nWho should buy it: \nWho should avoid it: \nWould you buy it again: ",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthUnit": "",
        "hint": [
          { "field": "Length Constraint", "text": "Length is platform-dependent \u2014 set it where you'll post. Amazon: hard cap \u00b7 20,000 characters (empirically verified; their stated guidance of 500\u20134,000 is recommended, not enforced). Best Buy / Newegg: ~5,000 characters. Target / Walmart: ~4,000 characters. Manufacturer site or blog: leave No limit. If you're undecided, leave No limit and pick at publish time. Most retailers also use a 0\u20135 star rating \u2014 include yours in Reference Material so the review reads consistently with the score." }
        ]
      },
      "refine": {
        "description": "Polish an existing product review draft \u2014 sharpen specifics, fairly weight pros and cons, make the recommendation land.",
        "goalDocType": "Product review",
        "goalAudience": "People deciding whether to purchase this product. They want practical, specific details about real-world use \u2014 not generic praise or vague complaints.",
        "goalOutcome": "Polish my existing review so it's useful, honest, and actionable. Strengthen the specific details, cut vague praise or complaints, make sure the final recommendation lands clearly.",
        "goalScope": "Preserve all my factual details \u2014 model, price, dates, specs, use patterns. Sharpen vague language. Make sure the review covers purchase context, use over time, build quality, what worked, what didn't, value, and a clear bottom-line recommendation.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed, but avoid sounding like a rant unless the source material genuinely supports that tone. Preserve the reviewer's natural voice.",
        "goalNotes": "Open with a one-line headline that captures the actual verdict from this specific review — not a generic 'Review of [product]' or '[Product Name] Review' stub. The headline should hint at the real conclusion (e.g. 'Flimsy after three months — looks good but won't last', 'Solid value if you only need it occasionally'). No quotes around it, no 'Review:' prefix. Keep the headline at or under 100 characters — Amazon caps review titles at 100, and most other retailers (Best Buy, Walmart, Target, Newegg) enforce headline limits that are tighter still. Staying ≤100 is safe for Amazon and a reasonable target across the board. If my draft already has a strong headline that fits, keep it; if it's generic or too long, sharpen and trim. Do not invent specs, prices, dates, or features. Do not soften legitimate criticism.",
        "refMaterial": "",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthUnit": "",
        "hint": [
          { "field": "Length Constraint", "text": "Length is platform-dependent \u2014 set it where you'll post. Amazon: hard cap \u00b7 20,000 characters (empirically verified; their stated guidance of 500\u20134,000 is recommended, not enforced). Best Buy / Newegg: ~5,000 characters. Target / Walmart: ~4,000 characters. Manufacturer site or blog: leave No limit. If you're undecided, leave No limit and pick at publish time. Most retailers also use a 0\u20135 star rating \u2014 if your draft mentions one, the review will land more consistently." },
          { "field": "Starting Document", "text": "Paste your draft review on Setup \u2014 Step 5 of 5 \u2014 Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // PRODUCT REVIEW — PER-PLATFORM RECIPE REFERENCE  (v3.63.135)
  // ============================================================
  // Canonical headline + body length recipes for every retail platform
  // we know constraints for. Reference data — when building the next
  // per-platform fork (Best Buy / Walmart / Target / Newegg / Yelp /
  // etc.), copy the matching row into a new product-review-<platform>
  // entry with the same shape as product-review-amazon below.
  //
  // Why per-platform forks (not a single overlay on product-review):
  // the overlay approach was tried and failed in v3.63.92 — a generic
  // Product Review run produced a 134-char headline on what should
  // have been an Amazon-100-cap target because the AIs couldn't be
  // trusted to apply platform constraints from a goalNotes string.
  // Forking bakes the cap into the template itself.
  //
  //   Platform     Title cap     Body min     Body normal      Body detailed    Body hard cap
  //   ───────────  ────────────  ───────────  ───────────────  ───────────────  ─────────────
  //   Amazon       100 chars     500 chars    1,500–3,500      4,000–7,500      20,000 chars
  //   Walmart       50 chars     500 chars      800–2,000      2,000–3,000       3,000 chars
  //   Target       no limit      500 chars    1,000–2,500      2,500–3,500       3,500 chars *
  //   Newegg       no limit      500 chars †    500–2,000 †    2,000–4,000 †     4,000 chars † per section
  //   Best Buy      50 chars ‡    50 chars    1,500–3,000      3,000–4,500       5,000 chars
  //   Yelp         (separate template — different doc type, see rewrite-as-yelp)
  //   Mfr / blog   none (soft 100-char headline ceiling as a safe default)
  //
  //   * Target's UI claims a 4,000-char cap but accepts ~3,500 in practice.
  //     Use 3,500 as the safe hard cap (David verified, 2026-06-04).
  //   † Newegg has a THREE-PART body: Pros / Cons / Overall Review, each
  //     with the same cap. UI claims 5,000 each; actual is 4,376 (David
  //     verified, 2026-06-04). Use 4,000 as the per-section safe cap.
  //     Use a STRUCTURED-OUTPUT directive in goalNotes (PROS: / CONS: /
  //     OVERALL REVIEW: sections); user copy-pastes each into Newegg's
  //     three separate input fields.
  //   ‡ Best Buy's title field caps at 50 chars but the paste-buffer
  //     accepts up to 82 chars before truncating (David verified,
  //     2026-06-04). Use 50 as the enforced cap so the title never gets
  //     truncated mid-word. Best Buy also has a 5-char MINIMUM on the
  //     title and a 50-char MINIMUM on the body — both are rejection
  //     thresholds, not warnings.
  //
  // Secondary star ratings each platform asks for (write the body
  // knowing the reviewer will rate these aspects):
  //   Amazon       Just overall (1–5 stars).
  //   Walmart      Overall + "Does it live up to expectations?" + Value
  //                for money + Fit + Ease of installation + Quality.
  //   Target       Overall + Ease of use + Quality + Value.
  //   Newegg       Overall (1–5 eggs).
  //   Best Buy     Overall (1–5 stars). No secondary star prompts.
  //
  //   Yelp note: separate "rewrite-as-yelp" template already exists.
  //   Don't make a Yelp product-review variant — Yelp's vocabulary +
  //   structure differs enough that the platform-trim path is right.
  //
  // Body normal = the pre-selected default range (Amazon's recipe
  //   shows 1,500–3,500 as the sweet spot). For platforms where we
  //   only know the HARD CAP, normal/detailed default to a sensible
  //   fraction of the cap until we get a measured run on that platform.
  //
  // When adding a new per-platform variant, also:
  //   • Update style.css if the variant needs visual differentiation
  //     (the .is-recommended treatment is reserved for Quick Start).
  //   • Add a corresponding playbook section in document-playbooks.html
  //     with the platform-specific constraints noted in goalNotes.
  //   • Run a measured test (see WaxFrame_Playbook_Test_Master_vN.txt)
  //     to validate the recipe produces in-range output.

  // ============================================================
  // PRODUCT REVIEW — AMAZON — both paths
  // ============================================================
  // Platform-specific fork of product-review with Amazon's constraints
  // baked in: 100-char title hard cap, body length recipe (Min 500 /
  // Normal 1,500–3,500 / Detailed 4,000–7,500 / Hard cap 20,000),
  // with Normal pre-selected as the default range.
  {
    "id": "product-review-amazon",
    "name": "Product Review — Amazon",
    "icon": "🛒",
    "category": "Reviews & Recommendations",
    "description": "Amazon-specific product review with the 100-character title cap and Amazon's body length recipe (Min 500 / Normal 1,500–3,500 / Detailed 4,000–7,500 / Hard cap 20,000) baked in. Normal pre-selected.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "An Amazon product review with platform constraints baked in: 100-char title cap, body length recipe (Normal 1,500–3,500 chars pre-selected, switchable to Min / Detailed / Hard cap tiers).",
        "goalDocType": "Amazon product review",
        "goalAudience": "Amazon shoppers deciding whether to purchase this product. They want practical, specific details about real-world use — not generic praise or vague complaints.",
        "goalOutcome": "Create a fair, honest, useful Amazon review that explains how the product actually performed over time, what worked, what didn't, whether the price made sense, and who should (or should not) buy it.",
        "goalScope": "Include purchase context (why bought, price paid, model/variant), setup or first impressions, use over time (how long, how often, what for), build quality, what worked well, what didn't, any defects or failures, accuracy of the product description, customer support or return experience if relevant, value for money, who should buy it, who should avoid it, and whether you'd buy it again. Build only from the facts in my Reference Material — do not invent specs, prices, dates, or features.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed, but avoid sounding like a rant unless the source material genuinely supports that tone. Preserve the reviewer's natural voice.",
        "goalNotes": "Open with a one-line headline that captures the actual verdict from this specific review — not a generic 'Review of [product]' or '[Product Name] Review' stub. The headline should hint at the real conclusion (e.g. 'Flimsy after three months — looks good but won't last', 'Solid value if you only need it occasionally', 'Crushes cans fine, falls apart fast'). No quotes around it, no 'Review:' prefix. HEADLINE HARD CAP: 100 characters — this is Amazon's review title limit, do not exceed it. Body length recipe for Amazon: Minimum 500 chars, Normal 1,500–3,500 chars (sweet spot, pre-selected as the default range), Detailed 4,000–7,500 chars, Hard cap 20,000 chars (Amazon's actual ceiling). The Length Constraint field defaults to Normal; switch to Detailed if the source material warrants deeper coverage, or to a tighter range for a thin source. Then end with a clear bottom line: who this product is best for, who should avoid it, and any specific advice or warning for future buyers.",
        "refMaterial": "Product name: \nBrand: \nModel / variant: \nPrice paid: \nWhere purchased: Amazon\nWhy you bought it: \nHow long you've used it: \nHow often you use it: \nWhat you used it for: \nSetup / installation: \nFirst impressions: \nBuild quality: \nEase of use: \nPerformance over time: \nWhat worked well: \nWhat did not work well: \nAny defects, missing parts, or failures: \nAccuracy of product description: \nCustomer support or return experience: \nValue for the money: \nStar rating (0–5): \nWho should buy it: \nWho should avoid it: \nWould you buy it again: ",
        "lengthMode": "range",
        "lengthMin": "1500",
        "lengthLimit": "3500",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Pre-set to Amazon's Normal tier (1,500–3,500 characters). Switch ranges if the source material warrants it: Minimum 500 (thin source), Normal 1,500–3,500 (default sweet spot), Detailed 4,000–7,500 (deep source), Hard cap 20,000 (Amazon's actual ceiling). HEADLINE cap of 100 characters is enforced via goalNotes — keep it short and verdict-driven." }
        ]
      },
      "refine": {
        "description": "Polish an existing Amazon review draft — sharpen specifics, fairly weight pros and cons, enforce the 100-character title cap, and fit Amazon's body length tier.",
        "goalDocType": "Amazon product review",
        "goalAudience": "Amazon shoppers deciding whether to purchase this product. They want practical, specific details about real-world use — not generic praise or vague complaints.",
        "goalOutcome": "Polish my existing Amazon review so it's useful, honest, and actionable. Strengthen the specific details, cut vague praise or complaints, make sure the final recommendation lands clearly, and bring the headline and body within Amazon's limits.",
        "goalScope": "Preserve all my factual details — model, price, dates, specs, use patterns. Sharpen vague language. Make sure the review covers purchase context, use over time, build quality, what worked, what didn't, value, and a clear bottom-line recommendation.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed, but avoid sounding like a rant unless the source material genuinely supports that tone. Preserve the reviewer's natural voice.",
        "goalNotes": "Open with a one-line headline that captures the actual verdict from this specific review — not a generic 'Review of [product]' or '[Product Name] Review' stub. The headline should hint at the real conclusion (e.g. 'Flimsy after three months — looks good but won't last', 'Solid value if you only need it occasionally'). No quotes around it, no 'Review:' prefix. HEADLINE HARD CAP: 100 characters — this is Amazon's review title limit. If my draft's headline exceeds 100 chars, trim it; if it's generic, sharpen it to reflect the verdict. Body length recipe for Amazon: Minimum 500 chars, Normal 1,500–3,500 chars (sweet spot, pre-selected), Detailed 4,000–7,500 chars, Hard cap 20,000 chars. The Length Constraint field defaults to Normal. Do not invent specs, prices, dates, or features. Do not soften legitimate criticism.",
        "refMaterial": "",
        "lengthMode": "range",
        "lengthMin": "1500",
        "lengthLimit": "3500",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Pre-set to Amazon's Normal tier (1,500–3,500 characters). Switch if your draft is naturally longer or shorter: Minimum 500 (thin), Normal 1,500–3,500 (default), Detailed 4,000–7,500 (deep), Hard cap 20,000 (Amazon's actual ceiling). HEADLINE cap of 100 characters is enforced via goalNotes — keep it short and verdict-driven." },
          { "field": "Starting Document", "text": "Paste your draft review on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // PRODUCT REVIEW — WALMART — both paths
  // ============================================================
  // Walmart constraints (David verified 2026-06-04):
  //   Title:   ≤ 50 chars (hard — TIGHTEST title cap of any platform)
  //   Body:    ≤ 3,000 chars (hard)
  //   Body normal range (pre-selected): 800–2,000 chars
  //   Secondary star ratings the reviewer fills in: Does it live up to
  //     expectations · Value for money · Fit · Ease of installation · Quality
  //   The body should explicitly address each of those aspects so the
  //   star ratings have prose backing them.
  {
    "id": "product-review-walmart",
    "name": "Product Review — Walmart",
    "icon": "🛍️",
    "category": "Reviews & Recommendations",
    "description": "Walmart-specific product review with the tight 50-character title cap and 3,000-character body limit baked in. Body explicitly addresses Walmart's secondary star prompts: Value for money / Fit / Ease of installation / Quality / Does it live up to expectations.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A Walmart product review with platform constraints baked in: 50-char title cap (tight!), 800–2,000-char body normal range (3,000 hard cap), and explicit coverage of Walmart's five secondary star prompts.",
        "goalDocType": "Walmart product review",
        "goalAudience": "Walmart shoppers deciding whether to purchase this product. They want practical, specific details about real-world use — fit, build quality, value, and whether the product met expectations — not generic praise or vague complaints.",
        "goalOutcome": "Create a fair, honest Walmart review that addresses the five aspects Walmart will ask the reviewer to rate (expectations, value, fit, ease of installation, quality), under Walmart's tight title and body limits.",
        "goalScope": "Include purchase context (why bought, price paid, model/variant), setup or installation experience, fit (if applicable — clothing/parts/replacements), use over time, value for money, quality, what worked, what didn't, and whether it lived up to expectations. Build only from facts in my Reference Material — do not invent specs, prices, dates, sizes, or features.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed. Preserve the reviewer's natural voice. Walmart's audience skews practical and budget-conscious — concrete numbers and specifics beat marketing language every time.",
        "goalNotes": "Open with a one-line headline. HEADLINE HARD CAP: 50 characters — Walmart's title limit is the tightest of any major retailer, so the headline must be ruthlessly compressed. Examples of 50-char-or-under verdicts: 'Snug fit, holds up to weekly washes' (37 chars), 'Cheap plastic — broke after two uses' (37 chars), 'Exactly as described, fast shipping' (37 chars). No quotes, no 'Review:' prefix. Body must explicitly address each of Walmart's five secondary star prompts so the star ratings have prose backing them: (1) Does it live up to expectations — was the product as advertised; (2) Value for money — does the price match the quality; (3) Fit — sizing accuracy or fitment for the intended purpose; (4) Ease of installation / use — how hard was setup; (5) Quality — build, materials, durability. Body length recipe for Walmart: Minimum 500 chars (thin source), Normal 800–2,000 chars (sweet spot, pre-selected), Detailed 2,000–3,000 chars (deep coverage), Hard cap 3,000 chars (Walmart's actual body ceiling — exceeding this gets truncated by the form). The Length Constraint field defaults to Normal.",
        "refMaterial": "Product name: \nBrand: \nModel / variant / size: \nPrice paid: \nWhere purchased: Walmart\nWhy you bought it: \nHow long you've used it: \nSetup or installation experience: \nFirst impressions: \nFit (sizing accuracy or fitment for purpose): \nBuild quality: \nEase of installation / ease of use: \nDoes it live up to the product description / expectations: \nPerformance over time: \nValue for the money: \nWhat worked well: \nWhat did not work well: \nAny defects, missing parts, or failures: \nStar rating (0–5): \nWho should buy it: \nWho should avoid it: ",
        "lengthMode": "range",
        "lengthMin": "800",
        "lengthLimit": "2000",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Pre-set to Walmart's Normal tier (800–2,000 characters). Switch if the source material warrants: Minimum 500 (thin), Normal 800–2,000 (default sweet spot), Detailed 2,000–3,000 (deep), Hard cap 3,000 (Walmart's actual body ceiling). HEADLINE cap of 50 characters is enforced via goalNotes — this is the tightest title cap of any retailer, keep it brutally short and verdict-driven." }
        ]
      },
      "refine": {
        "description": "Polish an existing Walmart review draft — sharpen specifics, enforce the 50-character title cap, fit Walmart's body length tier, and make sure each of Walmart's five secondary star prompts (expectations / value / fit / ease / quality) has prose backing it.",
        "goalDocType": "Walmart product review",
        "goalAudience": "Walmart shoppers deciding whether to purchase this product. They want practical, specific details about real-world use — fit, build quality, value, and whether the product met expectations.",
        "goalOutcome": "Polish my existing Walmart review so it's useful, honest, and actionable. Strengthen specifics, cut vague language, make sure each of the five secondary-star aspects (expectations, value, fit, ease of installation, quality) is addressed in the body, and bring headline + body within Walmart's tight limits.",
        "goalScope": "Preserve all my factual details — model, price, dates, sizes, use patterns. Sharpen vague language. Make sure the review covers purchase context, fit, build quality, value, ease of installation, and a clear bottom-line recommendation.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed. Preserve the reviewer's natural voice.",
        "goalNotes": "Open with a one-line headline. HEADLINE HARD CAP: 50 characters — Walmart's title limit. If my draft's headline exceeds 50 chars, trim it ruthlessly to the verdict. Examples: 'Snug fit, holds up to weekly washes' (37 chars), 'Cheap plastic — broke after two uses' (37 chars). No quotes, no 'Review:' prefix. Body must address each of Walmart's five secondary star prompts: expectations / value / fit / ease of installation / quality. If my draft omits any of these aspects, add a sentence using the facts in my Reference Material — do not invent details. Body length recipe: Minimum 500, Normal 800–2,000 (pre-selected), Detailed 2,000–3,000, Hard cap 3,000.",
        "refMaterial": "",
        "lengthMode": "range",
        "lengthMin": "800",
        "lengthLimit": "2000",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Pre-set to Walmart's Normal tier (800–2,000 characters). Switch if your draft is longer or shorter: Minimum 500 (thin), Normal 800–2,000 (default), Detailed 2,000–3,000 (deep), Hard cap 3,000 (Walmart's actual ceiling). HEADLINE 50-char cap is enforced via goalNotes." },
          { "field": "Starting Document", "text": "Paste your draft review on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // PRODUCT REVIEW — TARGET — both paths
  // ============================================================
  // Target constraints (David verified 2026-06-04):
  //   Title:   no apparent limit (use 100-char soft default)
  //   Body:    ≤ 3,500 chars (Target's UI says 4,000 but accepts ~3,500
  //            in practice — use 3,500 as the safe hard cap)
  //   Body normal range (pre-selected): 1,000–2,500 chars
  //   Secondary star ratings: Overall + Ease of use + Quality + Value
  {
    "id": "product-review-target",
    "name": "Product Review — Target",
    "icon": "🎯",
    "category": "Reviews & Recommendations",
    "description": "Target-specific product review with the 3,500-character body cap baked in (Target's UI claims 4,000 but accepts ~3,500 in practice). Body explicitly addresses Target's secondary star prompts: Ease of use / Quality / Value.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A Target product review with platform constraints baked in: no hard title cap (soft 100-char ceiling), 1,000–2,500-char body normal range (3,500 hard cap), and explicit coverage of Target's three secondary star prompts.",
        "goalDocType": "Target product review",
        "goalAudience": "Target shoppers deciding whether to purchase this product. They want practical, specific details — how easy it is to use, build quality, and whether the price made sense — not generic praise or vague complaints.",
        "goalOutcome": "Create a fair, honest Target review that addresses the three aspects Target asks the reviewer to rate (ease of use, quality, value) plus an overall verdict, under Target's body length limits.",
        "goalScope": "Include purchase context (why bought, price paid, model/variant), first impressions or setup, ease of use, quality, value for money, what worked, what didn't, and whether you'd buy it again. Build only from facts in my Reference Material — do not invent specs, prices, dates, or features.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed. Preserve the reviewer's natural voice.",
        "goalNotes": "Open with a one-line headline that captures the verdict — not a generic 'Review of [product]' stub. No quotes, no 'Review:' prefix. Target does not enforce a hard title cap so headlines can run longer than Walmart's 50, but stay under 100 chars as a readability ceiling. Body must explicitly address each of Target's three secondary star prompts so the star ratings have prose backing them: (1) Ease of use — how intuitive / easy is setup and operation; (2) Quality — build, materials, durability; (3) Value — does the price match what you got. Body length recipe for Target: Minimum 500 chars (thin source), Normal 1,000–2,500 chars (sweet spot, pre-selected), Detailed 2,500–3,500 chars (deep coverage), Hard cap 3,500 chars (Target's UI claims 4,000 but trims to ~3,500 in practice — use 3,500 as the safe ceiling). The Length Constraint field defaults to Normal.",
        "refMaterial": "Product name: \nBrand: \nModel / variant: \nPrice paid: \nWhere purchased: Target\nWhy you bought it: \nHow long you've used it: \nHow often you use it: \nFirst impressions: \nSetup or unboxing: \nEase of use: \nBuild quality / materials / durability: \nWhat worked well: \nWhat did not work well: \nAny defects, missing parts, or failures: \nValue for the money: \nStar rating (0–5): \nWho should buy it: \nWho should avoid it: \nWould you buy it again: ",
        "lengthMode": "range",
        "lengthMin": "1000",
        "lengthLimit": "2500",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Pre-set to Target's Normal tier (1,000–2,500 characters). Switch if the source material warrants: Minimum 500 (thin), Normal 1,000–2,500 (default sweet spot), Detailed 2,500–3,500 (deep), Hard cap 3,500 (Target's actual body ceiling — UI claims 4,000 but accepts ~3,500 in practice)." }
        ]
      },
      "refine": {
        "description": "Polish an existing Target review draft — sharpen specifics, fit Target's body length tier, and make sure each of Target's three secondary star prompts (ease of use / quality / value) has prose backing it.",
        "goalDocType": "Target product review",
        "goalAudience": "Target shoppers deciding whether to purchase this product. They want practical, specific details about ease of use, build quality, and value.",
        "goalOutcome": "Polish my existing Target review so it's useful, honest, and actionable. Strengthen specifics, cut vague language, make sure each of the three secondary-star aspects (ease of use, quality, value) is addressed in the body, and bring the body within Target's 3,500-char limit.",
        "goalScope": "Preserve all my factual details — model, price, dates, use patterns. Sharpen vague language. Make sure the review covers purchase context, ease of use, quality, value, and a clear bottom-line recommendation.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed. Preserve the reviewer's natural voice.",
        "goalNotes": "Open with a one-line headline that captures the verdict — not a generic '[Product Name] Review' stub. No quotes, no 'Review:' prefix. No hard title cap on Target, but keep it under 100 chars for readability. Body must address each of Target's three secondary star prompts: ease of use / quality / value. If my draft omits any of these aspects, add a sentence using facts in my Reference Material — do not invent details. Body length recipe: Minimum 500, Normal 1,000–2,500 (pre-selected), Detailed 2,500–3,500, Hard cap 3,500.",
        "refMaterial": "",
        "lengthMode": "range",
        "lengthMin": "1000",
        "lengthLimit": "2500",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Pre-set to Target's Normal tier (1,000–2,500 characters). Switch if your draft is longer or shorter: Minimum 500 (thin), Normal 1,000–2,500 (default), Detailed 2,500–3,500 (deep), Hard cap 3,500 (Target's actual ceiling)." },
          { "field": "Starting Document", "text": "Paste your draft review on Setup — Step 5 of 5 — Starting Document" }
        ]
      }
    }
  },

  // ============================================================
  // PRODUCT REVIEW — NEWEGG — both paths
  // ============================================================
  // Newegg constraints (David verified 2026-06-04):
  //   Title:   no limit
  //   Structure: THREE-PART form — Pros / Cons / Overall Review,
  //              each a separate input field
  //   Cap:     ~4,376 per section (UI claims 5,000; use 4,000 as
  //            the safe per-section cap)
  //   Rating:  1–5 eggs (Newegg uses eggs not stars)
  //
  // Output format directive: the model must emit THREE clearly-
  // delimited sections so the user can copy-paste each into Newegg's
  // three separate input fields. The convergence engine measures
  // total length, so lengthMode is "none" and per-section caps live
  // in goalNotes as soft guidance — the user can manually trim if
  // any single section overshoots when pasting.
  {
    "id": "product-review-newegg",
    "name": "Product Review — Newegg",
    "icon": "🥚",
    "category": "Reviews & Recommendations",
    "description": "Newegg-specific product review with structured three-part output: PROS section, CONS section, OVERALL REVIEW section — each capped at ~4,000 characters to fit Newegg's three input fields. Newegg uses 1–5 eggs (not stars).",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A Newegg product review with platform constraints baked in: structured three-part output (PROS / CONS / OVERALL REVIEW, each ~4,000 chars max), 1–5 egg rating, no hard title cap. Built for Newegg's tech-savvy audience that wants specifics.",
        "goalDocType": "Newegg product review",
        "goalAudience": "Newegg shoppers — tech-savvy, comparison-driven, want specifics about performance, build quality, value, and any gotchas. They read pros and cons as separate fields and expect each to have substance.",
        "goalOutcome": "Create a fair, honest Newegg review in Newegg's three-part structure (PROS / CONS / OVERALL REVIEW), with each section having real substance — not generic praise or vague complaints.",
        "goalScope": "Include purchase context (why bought, price paid, model/variant), setup, performance, build quality, what worked, what didn't, value for money, and bottom-line recommendation. Build only from facts in my Reference Material — do not invent specs, prices, dates, or features.",
        "goalTone": "Clear, direct, specific, and fair — Newegg's audience expects technical precision more than other platforms. Honest criticism is fine. Preserve the reviewer's natural voice.",
        "goalNotes": "OUTPUT STRUCTURE — CRITICAL: Newegg's review form has THREE separate input fields (Pros / Cons / Overall Review), so the output MUST emit three clearly-delimited sections. Use these exact section headers on their own lines, no markdown formatting, no quotes:\n\nPROS:\n[content here — at least three concrete pros pulled from the reference material, each as a short bullet line starting with a dash. Stay specific, no marketing-speak. ~500–2,000 chars total.]\n\nCONS:\n[content here — at least one honest con (if the source has any), each as a short bullet line starting with a dash. If the product is genuinely great, a thin Cons section is fine but include the inevitable trade-offs (price, learning curve, missing features). ~500–2,000 chars total.]\n\nOVERALL REVIEW:\n[content here — narrative paragraph(s) covering purchase context, real-world performance, value for money, and bottom-line recommendation (who should buy / avoid). ~1,000–4,000 chars.]\n\nPer-section HARD CAP: 4,000 characters each (Newegg's UI claims 5,000 but accepts ~4,376 in practice — use 4,000 as the safe ceiling). If any section runs longer, the user will trim before pasting. The user copy-pastes each labeled section into Newegg's corresponding input field. Open the OVERALL REVIEW with a one-line headline (no quotes, no 'Review:' prefix) — no character limit on Newegg titles but keep it under 100 chars for readability.",
        "refMaterial": "Product name: \nBrand: \nModel / variant: \nPrice paid: \nWhere purchased: Newegg\nWhy you bought it: \nHow long you've used it: \nHow often you use it: \nWhat you used it for: \nSetup / installation: \nFirst impressions: \nPerformance / real-world use: \nBuild quality: \nWhat worked well (the pros — list the specific wins): \nWhat did not work well (the cons — list the specific issues): \nAny defects, missing parts, or DOAs: \nValue for the money: \nEgg rating (1–5): \nWho should buy it: \nWho should avoid it: \nWould you buy it again: ",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthMin": "",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Newegg's three-part structure (Pros / Cons / Overall Review) is handled via goalNotes section headers — per-section soft cap is 4,000 chars (Newegg's actual ceiling, despite UI claim of 5,000). Length Constraint is left unset because the engine measures TOTAL document length but Newegg caps each section independently. The user copy-pastes each labeled section into Newegg's three corresponding fields; if any section runs long, manually trim before pasting." }
        ]
      },
      "refine": {
        "description": "Polish an existing Newegg review draft — restructure into PROS / CONS / OVERALL REVIEW three-part output, sharpen specifics, and keep each section under ~4,000 characters.",
        "goalDocType": "Newegg product review",
        "goalAudience": "Newegg shoppers — tech-savvy, comparison-driven, want specifics about performance, build quality, value, and any gotchas.",
        "goalOutcome": "Polish my existing Newegg review so it follows Newegg's three-part structure (Pros / Cons / Overall Review). Strengthen specifics, cut vague language, separate true pros from cons cleanly, and bring each section under ~4,000 chars.",
        "goalScope": "Preserve all my factual details — model, price, dates, performance specifics. Sharpen vague language. If my draft mixes pros and cons together in narrative form, split them into the Pros / Cons sections; if it's already structured, polish each section independently.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is fine. Preserve the reviewer's natural voice.",
        "goalNotes": "OUTPUT STRUCTURE — CRITICAL: Restructure my draft into Newegg's three-part output:\n\nPROS:\n[content here — bullet lines, specifics not generics, ~500–2,000 chars]\n\nCONS:\n[content here — bullet lines, ~500–2,000 chars]\n\nOVERALL REVIEW:\n[narrative paragraph(s), ~1,000–4,000 chars, opens with a one-line headline]\n\nIf my draft is already structured this way, polish each section independently. If it's a single narrative, identify the explicit and implicit pros / cons and split them into the labeled sections. Per-section HARD CAP: 4,000 characters each (Newegg's UI says 5,000 but accepts ~4,376 in practice). Use exact section headers as shown above (no markdown, no quotes). No 'Review:' prefix on the headline. Newegg uses 1–5 eggs (not stars). Do not invent specs, prices, dates, or features. Do not soften legitimate criticism.",
        "refMaterial": "",
        "lengthMode": "none",
        "lengthLimit": "",
        "lengthMin": "",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Newegg's three-part structure (Pros / Cons / Overall Review) is handled via goalNotes section headers — per-section soft cap is 4,000 chars. Length Constraint is left unset because the engine measures TOTAL document length while Newegg caps each section independently. Copy-paste each labeled section into Newegg's three fields." },
          { "field": "Starting Document", "text": "Paste your draft review on Setup — Step 5 of 5 — Starting Document. If your draft is one narrative paragraph (not pros/cons/overall split), the hive will restructure it; if it's already in three sections, the hive will polish each independently." }
        ]
      }
    }
  },

  // ============================================================
  // PRODUCT REVIEW — BEST BUY — both paths
  // ============================================================
  // Best Buy constraints (David verified 2026-06-04):
  //   Title:   5–50 chars (BOTH a 5-char minimum AND a 50-char hard cap;
  //            the paste-buffer accepts up to 82 chars but truncates,
  //            so 50 is the enforced safe ceiling)
  //   Body:    50–5,000 chars (50-char minimum is a rejection threshold,
  //            not a warning)
  //   Body normal range (pre-selected): 1,500–3,000 chars
  //   Rating:  1–5 stars overall; NO secondary star prompts (single
  //            overall rating only — simpler than Walmart/Target).
  {
    "id": "product-review-bestbuy",
    "name": "Product Review — Best Buy",
    "icon": "🔵",
    "category": "Reviews & Recommendations",
    "description": "Best Buy-specific product review with the 50-char title cap (5-char minimum) and 5,000-char body cap (50-char minimum) baked in. Single overall star rating — no secondary star prompts. Tech-leaning audience expects specifics about performance and value.",
    "paths": ["scratch", "refine"],
    "pathContent": {
      "scratch": {
        "description": "A Best Buy product review with platform constraints baked in: 50-char title cap (5-char min), 1,500–3,000-char body normal range (5,000 hard cap, 50-char min). Single overall star rating.",
        "goalDocType": "Best Buy product review",
        "goalAudience": "Best Buy shoppers deciding whether to purchase this product. The audience skews toward consumer-electronics and appliances — they want practical specifics about performance, build quality, ease of use, and value. Less marketing fluff, more 'here's what it actually does and how it held up.'",
        "goalOutcome": "Create a fair, honest Best Buy review that gives the shopper enough specifics to make a confident buy/skip call, under Best Buy's title and body limits.",
        "goalScope": "Include purchase context (why bought, price paid, model/variant), setup or first impressions, real-world performance, build quality, ease of use, what worked, what didn't, value for money, and a clear bottom-line recommendation. Build only from facts in my Reference Material — do not invent specs, prices, dates, or features.",
        "goalTone": "Clear, direct, specific, and fair. Best Buy's consumer-electronics audience expects technical precision more than Walmart's general retail audience but less than Newegg's enthusiast crowd. Honest criticism is allowed. Preserve the reviewer's natural voice.",
        "goalNotes": "Open with a one-line headline that captures the verdict from this specific review — not a generic 'Review of [product]' stub. The headline should hint at the real conclusion (e.g. 'Great picture, terrible remote', 'Loud but worth it for the price', 'Setup took an hour, performance is solid'). No quotes around it, no 'Review:' prefix. HEADLINE LIMITS: 5-char MINIMUM (Best Buy rejects shorter), 50-char HARD CAP (Best Buy's title field truncates beyond this — even though paste-buffer accepts up to 82 chars, the enforced cap is 50). Examples of compliant headlines: 'Solid sound, weak app' (21 chars), 'Sharp picture but laggy menu' (28 chars), 'Five years in, still works perfectly' (37 chars). Body length recipe for Best Buy: Minimum 50 chars (rejection threshold — anything shorter is refused), Normal 1,500–3,000 chars (sweet spot, pre-selected), Detailed 3,000–4,500 chars (deep coverage), Hard cap 5,000 chars (Best Buy's actual body ceiling). The Length Constraint field defaults to Normal. Best Buy uses a single overall 1–5 star rating with NO secondary star prompts — focus the body on the overall buy/skip call rather than scoring sub-aspects.",
        "refMaterial": "Product name: \nBrand: \nModel / variant: \nPrice paid: \nWhere purchased: Best Buy\nWhy you bought it: \nHow long you've used it: \nHow often you use it: \nWhat you used it for: \nSetup / installation: \nFirst impressions: \nReal-world performance: \nBuild quality: \nEase of use: \nWhat worked well: \nWhat did not work well: \nAny defects, missing parts, or failures: \nValue for the money: \nStar rating (1–5): \nWho should buy it: \nWho should avoid it: \nWould you buy it again: ",
        "lengthMode": "range",
        "lengthMin": "1500",
        "lengthLimit": "3000",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Pre-set to Best Buy's Normal tier (1,500–3,000 characters). Switch if the source material warrants: Minimum 50 (Best Buy's rejection threshold), Normal 1,500–3,000 (default sweet spot), Detailed 3,000–4,500 (deep coverage), Hard cap 5,000 (Best Buy's actual ceiling). HEADLINE is enforced via goalNotes — must be 5–50 chars (5-char minimum is a rejection threshold; paste-buffer accepts up to 82 but anything beyond 50 gets truncated)." }
        ]
      },
      "refine": {
        "description": "Polish an existing Best Buy review draft — sharpen specifics, fit Best Buy's title (5–50 chars) and body (50–5,000 chars) limits.",
        "goalDocType": "Best Buy product review",
        "goalAudience": "Best Buy shoppers deciding whether to purchase this product. The audience skews consumer-electronics and appliances — practical specifics about performance, build quality, and value beat marketing language.",
        "goalOutcome": "Polish my existing Best Buy review so it's useful, honest, and actionable. Strengthen specifics, cut vague language, make the bottom-line recommendation land clearly, and bring headline + body within Best Buy's limits.",
        "goalScope": "Preserve all my factual details — model, price, dates, use patterns. Sharpen vague language. Make sure the review covers purchase context, real-world performance, build quality, value, and a clear bottom-line recommendation.",
        "goalTone": "Clear, direct, specific, and fair. Honest criticism is allowed. Preserve the reviewer's natural voice.",
        "goalNotes": "Open with a one-line headline that captures the verdict — not a generic '[Product Name] Review' stub. No quotes, no 'Review:' prefix. HEADLINE LIMITS: 5-char MINIMUM (Best Buy rejects shorter), 50-char HARD CAP (truncates beyond — even though paste-buffer accepts up to 82, enforced cap is 50). If my draft's headline exceeds 50 chars, trim it to the verdict. If under 5 chars, expand it. Body length recipe: Minimum 50 (rejection threshold), Normal 1,500–3,000 (pre-selected), Detailed 3,000–4,500, Hard cap 5,000. Best Buy uses a single overall 1–5 star rating with no secondary star prompts.",
        "refMaterial": "",
        "lengthMode": "range",
        "lengthMin": "1500",
        "lengthLimit": "3000",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Length Constraint", "text": "Pre-set to Best Buy's Normal tier (1,500–3,000 characters). Switch if your draft is longer or shorter: Minimum 50 (rejection threshold), Normal 1,500–3,000 (default), Detailed 3,000–4,500 (deep), Hard cap 5,000 (Best Buy's actual ceiling). HEADLINE is 5-50 chars — both min and max are enforced." },
          { "field": "Starting Document", "text": "Paste your draft review on Setup — Step 5 of 5 — Starting Document" }
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
        "goalNotes": "Open with a one-line headline that captures the actual verdict from this specific review — not a generic '[Restaurant Name] Review' or 'Review of [restaurant]' stub. The headline should hint at the real conclusion (e.g. 'Great food, terrible service — go on a weekday', 'Hidden gem hiding behind a bad sign', 'Three visits in, still our favorite Italian'). No quotes around it, no 'Review:' prefix. Then end with a clear bottom line: whether I would return, who this restaurant is best for, and any specific warning, recommendation, or timing advice for future visitors.",
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
        "goalNotes": "Open with a one-line headline that captures the actual verdict — not a generic '[Restaurant Name] Review' stub. The headline should hint at the real conclusion (e.g. 'Great food, terrible service — go on a weekday', 'Hidden gem hiding behind a bad sign'). No quotes around it, no 'Review:' prefix. If my draft already has a strong headline, keep it; if it has a generic one, sharpen it to reflect the verdict. Do not invent dishes, prices, staff names, dates, or facts. Do not soften legitimate criticism.",
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
        "goalNotes": "Open with a one-line headline that captures the actual verdict from this specific stay — not a generic '[Hotel Name] Review' or 'Review of [hotel]' stub. The headline should hint at the real conclusion (e.g. 'Spotless rooms, walls like paper', 'Worth every penny for the location', 'Beautiful pictures, disappointing reality'). No quotes around it, no 'Review:' prefix. Then include whether I would stay again and what type of traveler this hotel is best suited for. Mention dealbreakers clearly.",
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
        "goalNotes": "Open with a one-line headline that captures the actual verdict — not a generic '[Hotel Name] Review' stub. The headline should hint at the real conclusion (e.g. 'Spotless rooms, walls like paper', 'Worth every penny for the location'). No quotes around it, no 'Review:' prefix. If my draft already has a strong headline, keep it; if it has a generic one, sharpen it to reflect the verdict. Do not invent amenities, prices, loyalty benefits, room numbers, or facts. Do not soften legitimate dealbreakers.",
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
        "goalNotes": "Open with a one-line headline that captures the actual verdict from this specific experience — not a generic '[Business Name] Review' or 'Review of [business]' stub. The headline should hint at the real conclusion (e.g. 'Quick response, sloppy workmanship', 'Save your money — there's a reason it's cheap', 'Pricey but they actually finished on time'). No quotes around it, no 'Review:' prefix. Then end with practical advice: who should use this business, who should avoid it, and what to watch out for. Do not add legal conclusions, accusations, or claims beyond the facts provided.",
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
        "goalNotes": "Open with a one-line headline that captures the actual verdict — not a generic '[Business Name] Review' stub. The headline should hint at the real conclusion (e.g. 'Quick response, sloppy workmanship', 'Pricey but they actually finished on time'). No quotes around it, no 'Review:' prefix. If my draft already has a strong headline, keep it; if it has a generic one, sharpen it to reflect the verdict. Do not add legal conclusions, accusations, or claims beyond facts provided. Do not invent prices, dates, or interactions.",
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
  // RETIRED in v3.52.0 — Multi-Platform Review (combined) replaced
  // by three single-platform templates below. The combined template
  // had three problems documented in CHANGELOG: (1) per-platform
  // length couldn't be enforced via the length-guard because the
  // setting is single-value, (2) convergence signal was muddied
  // because reviewers were juggling three voice spaces, (3) hard
  // floor on source size (~1200+ words needed) wasn't enforceable
  // without per-template setup checks. Three focused templates
  // each carry their own length-guard and voice directive — see
  // trim-to-tripadvisor, trim-to-google-maps, rewrite-as-yelp.
  // ============================================================

  // ============================================================
  // TRIM TO TRIPADVISOR — refine-only by definition
  // (operates on a source review pasted into Starting Document)
  // ============================================================
  {
    "id": "trim-to-tripadvisor",
    "name": "Trim to TripAdvisor",
    "icon": "✈️",
    "category": "Reviews & Recommendations",
    "lengthBadge": "500–900 words",
    "description": "Convert a long-form review into a TripAdvisor-ready version: detailed narrative travel-context tone. Source visible to reviewers every round so factual cuts can be verified.",
    "paths": ["refine"],
    "pathContent": {
      "refine": {
        "goalDocType": "TripAdvisor review",
        "goalAudience": "TripAdvisor readers deciding whether to visit or book based on detailed travel reviews — they want narrative arc, practical context, and an honest recommendation.",
        "goalOutcome": "Produce a TripAdvisor-ready review from the source: detailed narrative travel-context tone, 500–900 words, full experience arc from arrival to departure to recommendation.",
        "goalScope": "Use only the facts from the source review. Preserve the chronological arc: arrival/booking context, the experience, the recommendation. Cut redundancy where helpful, but TripAdvisor readers expect detail — do not over-compress.",
        "goalTone": "Detailed narrative. Travel-context. Slightly more formal than Yelp, more thorough than Google Maps. Honest. Helpful. Specific.",
        "goalNotes": "Lead with location and booking context. Cover the experience chronologically. Close with a clear recommendation and who this place is best for. Do not invent details. If a source review appears in Reference Material, verify all facts against it.",
        "refMaterial": "TRIPADVISOR FORMAT DIRECTIVE — read every round. Produce a TripAdvisor-ready review in 500–900 words. Detailed narrative arc: arrival/booking context → experience chronologically → clear recommendation. Travel-context tone — readers are deciding whether to visit. More detail than a Google Maps review, more structure than a Yelp review. Honest and specific. Do not invent details not in the source. If a source review is provided in Reference Material in addition to the working document, treat it as the source of truth for every fact.",
        "lengthMode": "range",
        "lengthLimit": "900",
        "lengthMin": "500",
        "lengthUnit": "words",
        "hint": [
          { "field": "Starting Document", "text": "Paste your source review on Setup — Step 5 of 5 — Starting Document." },
          { "field": "Reference Material", "text": "If your source review is significantly longer than 900 words, ALSO paste it into Reference Material. That keeps the original visible to reviewers every round so they can verify facts and evaluate what got cut. If your source is already close to 500–900 words, Reference Material isn't necessary — the working document still holds the same content." }
        ]
      }
    }
  },

  // ============================================================
  // TRIM TO GOOGLE MAPS — refine-only by definition
  // (operates on a source review pasted into Starting Document)
  // ============================================================
  {
    "id": "trim-to-google-maps",
    "name": "Trim to Google Maps",
    "icon": "📍",
    "category": "Reviews & Recommendations",
    "lengthBadge": "750–1,200 chars",
    "description": "Convert a long-form review into a Google Maps-ready version: skim-friendly, bottom-line-first. Source visible to reviewers every round so brutal cuts can be verified against the original.",
    "paths": ["refine"],
    "pathContent": {
      "refine": {
        "goalDocType": "Google Maps review",
        "goalAudience": "Google Maps readers scanning quickly for the bottom line — they want the recommendation up front, the key facts that support it, and to leave.",
        "goalOutcome": "Produce a Google Maps-ready review from the source: skim-friendly, bottom-line-first, 750–1,200 characters. Lead with the recommendation. Keep only the few facts that actually support the verdict.",
        "goalScope": "Brutal cut. Drop the chronological narrative arc. Lead with the bottom line. Keep only specific details that justify the recommendation. Strip everything else.",
        "goalTone": "Direct. Practical. Skimmable. First-person fine. No fluff. No marketing-speak. No corporate polish.",
        "goalNotes": "If the source is 800+ words, expect to cut 70%+ of it. That's the job — Google Maps readers will not read more than 1,200 characters of a review. Do not invent details. If a source review appears in Reference Material, verify all facts against it.",
        "refMaterial": "GOOGLE MAPS FORMAT DIRECTIVE — read every round. Produce a Google Maps review in 750–1,200 characters total. Lead with the recommendation. Keep only the facts that support it. Drop narrative arc. Direct, skimmable, no fluff. Do not invent details not in the source. If a source review is provided in Reference Material in addition to the working document, treat it as the source of truth for every fact and use it to verify what got cut.",
        "lengthMode": "range",
        "lengthLimit": "1200",
        "lengthMin": "750",
        "lengthUnit": "characters",
        "hint": [
          { "field": "Starting Document", "text": "Paste your source review on Setup — Step 5 of 5 — Starting Document." },
          { "field": "Reference Material", "text": "Strongly recommend pasting the source review into Reference Material as well. Google Maps cuts are brutal — typical source-to-target ratio is 5–10x. Without the source visible every round, reviewers can't evaluate whether the cuts kept the right facts." }
        ]
      }
    }
  },

  // ============================================================
  // REWRITE AS YELP — refine-only by definition
  // (operates on a source review pasted into Starting Document)
  // ============================================================
  {
    "id": "rewrite-as-yelp",
    "name": "Rewrite as Yelp",
    "icon": "💬",
    "category": "Reviews & Recommendations",
    "lengthBadge": "300–700 words",
    "description": "Rewrite a long-form review as a Yelp review: conversational, personality-forward, first-person. Voice transformation is the main job — same facts, different prose register.",
    "paths": ["refine"],
    "pathContent": {
      "refine": {
        "goalDocType": "Yelp review",
        "goalAudience": "Yelp readers — they value real voice, personality, specific lived details. They smell fake reviews and corporate polish from a mile away.",
        "goalOutcome": "Rewrite the source review as a Yelp review: conversational, personality-forward, first-person, 300–700 words. Same facts, different prose register. Real voice.",
        "goalScope": "Voice transformation is the main job. Same facts, different rendering. Casual phrasing OK. First-person fine. No corporate polish, no marketing-speak, no AI-generated-blandness.",
        "goalTone": "Conversational. First-person. Personality-forward. Casual phrasing like 'honestly,' 'tbh,' 'no joke,' 'so,' 'look —' are fine when they fit. Specific lived details over generic praise. Honest tone — Yelp readers reward authenticity.",
        "goalNotes": "If the source reads corporate or polished, the rewrite must shed that register entirely. Use specific details that feel lived-in. Do not invent details. If a source review appears in Reference Material, verify all facts against it — voice rewrites are the #1 place where facts drift unnoticed.",
        "refMaterial": "YELP FORMAT DIRECTIVE — read every round. Rewrite the source as a Yelp review in 300–700 words. Conversational, first-person, personality-forward. Voice transformation is the main job — same facts, different prose register. No corporate polish, no marketing-speak. Yelp readers smell fake reviews — use specific lived details. Do not invent details not in the source. If a source review is provided in Reference Material in addition to the working document, treat it as the source of truth for every fact and watch for drift — voice rewrites are where facts slip silently.",
        "lengthMode": "range",
        "lengthLimit": "700",
        "lengthMin": "300",
        "lengthUnit": "words",
        "hint": [
          { "field": "Starting Document", "text": "Paste your source review on Setup — Step 5 of 5 — Starting Document." },
          { "field": "Reference Material", "text": "Recommend pasting the source review into Reference Material as well. Voice rewrites preserve facts but the new prose register can mask drift — 'he gave us instructions for wet conditions' becoming 'he gave us a free poncho' is invisible without the source for comparison." }
        ]
      }
    }
  }
];
