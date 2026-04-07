import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BrainCircuit, ShieldCheck, Trophy, Globe2, Sparkles,
  GraduationCap, Building2, BookOpen, Users, Mic, FileText,
  BarChart3, Zap, CheckCircle2, ChevronRight, Star, Lock, Award,
  TrendingUp, Clock, Target, Layers, Activity, Baby, Briefcase
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SchoolsPage } from './SchoolsPage';
import { AcademiaPage } from './AcademiaPage';
import { CorporatePage } from './CorporatePage';
import { LanguageSchoolsPage } from './LanguageSchoolsPage';

interface DynamicPageProps {
  pageName: string;
  onBack: () => void;
}

// ─── Shared Design Atoms ──────────────────────────────────────────────────────
const Tag = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-[10px] font-black tracking-[0.2em] mb-8 uppercase">
    <Sparkles size={12} className="text-[#FDE047]" /> {children}
  </div>
);

const Pill = ({ children, color = "slate" }: { children: React.ReactNode; color?: string }) => (
  <span className={cn(
    "inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
    color === "magenta" ? "bg-[#9b276c]/10 text-[#9b276c] border border-[#9b276c]/20" : "bg-slate-100 text-slate-500 border border-slate-200"
  )}>{children}</span>
);

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="flex items-start gap-4 p-5 rounded-[20px] bg-white border border-slate-100 hover:border-[#9b276c]/30 hover:shadow-lg transition-all cursor-default group"
  >
    <div className="w-10 h-10 rounded-xl bg-[#9b276c]/8 flex items-center justify-center shrink-0 text-[#9b276c] group-hover:bg-[#9b276c] group-hover:text-white transition-all">
      {icon}
    </div>
    <div>
      <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight mb-1">{title}</h4>
      <p className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  </motion.div>
);

const StatBox = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center p-6 rounded-[24px] bg-white border border-slate-100 shadow-sm">
    <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
  </div>
);

const CheckItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3 text-slate-600 text-sm font-medium leading-relaxed">
    <CheckCircle2 size={16} className="text-[#9b276c] shrink-0 mt-0.5" />
    {children}
  </li>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="uppercase tracking-[0.25em] text-[#9b276c] text-[10px] font-black mb-4">{children}</div>
);

// ─── Page Definitions ────────────────────────────────────────────────────────
const PAGE_DATA: Record<string, {
  tag: string;
  heroTitle: string;
  heroSubtitle: string;
  accentColor?: string;
  stats: { value: string; label: string }[];
  sectionTitle: string;
  sectionBody: string;
  features: { icon: React.ReactNode; title: string; desc: string }[];
  checkItems: string[];
  quote?: string;
  quoteAuthor?: string;
  ctaTitle: string;
  ctaDesc: string;
}> = {

  // ── DISTRIBUTIONS ──────────────────────────────────────────────────────────
  "Academia": {
    tag: "Distribution · Higher Education",
    heroTitle: "Redefining University\nEnglish Assessment",
    heroSubtitle: "b4skills gives institutions a psychometrically rigorous, AI-powered platform to place, screen, and certify students at scale — with the validity demanded by academic accreditation bodies.",
    stats: [
      { value: "94%", label: "Placement Accuracy" },
      { value: "< 40 min", label: "Avg. Completion Time" },
      { value: "CEFR A1–C2", label: "Full Scale Coverage" },
      { value: "ISO 27001", label: "Data Security Standard" },
    ],
    sectionTitle: "Built for Academic Rigour",
    sectionBody: "From remedial placement to graduate admissions, academia demands evidence-based decisions. b4skills combines Item Response Theory (IRT) calibrated item banks with on-demand Gemini AI scoring of writing and speaking — meaning every score carries a defensible reliability coefficient. Integrate with your LMS via API, or run standalone in our white-labelled portal. Results export as CEFR certificates, TSV data, or direct LMS push.",
    features: [
      { icon: <BrainCircuit size={18} />, title: "Adaptive Item Selection", desc: "CAT algorithm targets each student's zone of proximal proficiency — 40% shorter than fixed-form tests at equal precision." },
      { icon: <ShieldCheck size={18} />, title: "Proctoring & Academic Integrity", desc: "AI anomaly detection, browser lockdown, and face-check combine for a tamper-resistant environment compliant with academic ethics policies." },
      { icon: <BarChart3 size={18} />, title: "Cohort Analytics Dashboard", desc: "Aggregate CEFR distributions, skill radar charts, and growth trends across cohorts — reports ready for accreditation committees." },
      { icon: <Award size={18} />, title: "CEFR-Aligned Certification", desc: "QR-verified digital certificates linked to live session data satisfy Bologna Process and institutional audit requirements." },
      { icon: <Globe2 size={18} />, title: "Multi-Campus Deployment", desc: "Single super-admin view across unlimited sub-organisations. Faculty, registrar, and student roles with granular permissions." },
      { icon: <Layers size={18} />, title: "Custom Item Authoring", desc: "Upload your own reading passages, listening audio, or prompts into the IRT-calibrated item bank alongside b4skills standard content." },
    ],
    checkItems: [
      "Full IRT parameter estimation with Cronbach's α reporting",
      "Auto-generated placement decisions per faculty cut-score policy",
      "GDPR / FERPA compliant data residency options",
      "API-first architecture — connects to Banner, Blackboard, Moodle, Canvas",
      "Dedicated customer success manager for institutions > 500 seats",
    ],
    quote: "We replaced three separate tests with b4skills and halved our processing time without sacrificing validity.",
    quoteAuthor: "Director of Academic Affairs, European University Partner",
    ctaTitle: "Request an Academic Pilot",
    ctaDesc: "Free 30-day pilot for qualifying institutions. Live demo with your team in 48 hours.",
  },

  "Schools": {
    tag: "Distribution · K-12 Education",
    heroTitle: "Evidence-Based English\nAssessment for Schools",
    heroSubtitle: "From Year 3 to Year 13, b4skills tracks every learner's proficiency trajectory with adaptive tests that motivate rather than intimidate — and give teachers instant, actionable class insights.",
    stats: [
      { value: "Ages 7–18", label: "Full Age Coverage" },
      { value: "3 Suites", label: "Age-Appropriate Modules" },
      { value: "Real-time", label: "Teacher Dashboards" },
      { value: "COPPA/GDPR", label: "Child Data Compliance" },
    ],
    sectionTitle: "Learning-Centred Design",
    sectionBody: "Children and teens engage differently with assessment. b4skills school suites use shorter adaptive sequences, positive reinforcement UX, and age-appropriate prompts — while the IRT engine underneath remains fully calibrated. Teachers receive per-pupil skill reports (Reading, Listening, Writing, Speaking, Grammar) within minutes. School leadership gets term-over-term cohort growth data to demonstrate Ofsted / EQA readiness.",
    features: [
      { icon: <Baby size={18} />, title: "Early Years (Ages 7–10)", desc: "Illustrated prompts, gamified pacing, and audio-first delivery designed for early EFL / ESL learners with shorter sessions." },
      { icon: <Users size={18} />, title: "Junior Suite (Ages 11–15)", desc: "Mixed-format adaptive test covering the full CEFR A1–B2 range, with writing and speaking tasks suited for teen contexts." },
      { icon: <Target size={18} />, title: "Class-Level Reporting", desc: "One-click class reports highlight skill gaps across all four language skills. Includes guided intervention recommendations." },
      { icon: <ShieldCheck size={18} />, title: "Safe & Compliant", desc: "No advertising, no third-party data sharing. All child data stored under strict GDPR/COPPA regulations with parental consent workflows." },
      { icon: <TrendingUp size={18} />, title: "Progress Tracking", desc: "Longitudinal skill growth tracked per student. Export progress portfolios for parents' evenings or inspection audits." },
      { icon: <BookOpen size={18} />, title: "Curriculum Alignment", desc: "Item banks aligned to Cambridge YLE, National Curriculum, and IB frameworks — no re-mapping required." },
    ],
    checkItems: [
      "Bulk student import from school MIS (SIMS, iSAMS, SchoolBase)",
      "Teacher, Head of Department, and Principal role hierarchy",
      "Custom school branding on all test interfaces and certificates",
      "Interim and end-of-year benchmark reports auto-generated",
      "Safeguarding-compliant proctoring with no facial storage for minors",
    ],
    quote: "Our teachers now spend time teaching rather than marking — the AI handles the speaking and writing scores overnight.",
    quoteAuthor: "Head of EFL, International School Partner",
    ctaTitle: "Start a School Free Trial",
    ctaDesc: "Full-featured 60-day trial for state and independent schools. No credit card required.",
  },

  "Corporates": {
    tag: "Distribution · Enterprise & HR",
    heroTitle: "Hire Smarter.\nDeploy Faster.\nSkip the Language Barrier.",
    heroSubtitle: "b4skills Enterprise automates English proficiency screening at every stage of the talent lifecycle — from mass recruitment to internal mobility and compliance certification.",
    stats: [
      { value: "72%", label: "Reduction in Screening Time" },
      { value: "< 35 min", label: "Full Assessment Cycle" },
      { value: "API-First", label: "ATS & HRIS Integration" },
      { value: "190+", label: "Countries Supported" },
    ],
    sectionTitle: "Language Competence at the Speed of Hiring",
    sectionBody: "Global enterprises waste millions on mis-hires caused by inaccurate language screening. b4skills replaces static CV claims and human-scored interviews with a proctored, AI-evaluated assessment that delivers a CEFR score within minutes of submission. The platform integrates directly into your ATS (Workday, SAP SuccessFactors, Greenhouse, Lever) via webhooks and REST API. HR teams set role-specific CEFR cut-scores; b4skills does the rest.",
    features: [
      { icon: <Briefcase size={18} />, title: "Role-Specific Benchmarking", desc: "Set custom CEFR pass thresholds per role (e.g. B2 minimum for client-facing, C1 for expat deployment). Auto-flag or pass candidates." },
      { icon: <Zap size={18} />, title: "Bulk Onboarding & API", desc: "Invite thousands of candidates via CSV or API. Webhook callbacks push scores directly into your ATS the moment assessment completes." },
      { icon: <Activity size={18} />, title: "Real-time Proctoring", desc: "AI-powered behaviour monitoring flags anomalies without requiring a human invigilator — reducing cost by 90% vs. live proctoring." },
      { icon: <FileText size={18} />, title: "Verified CEFR Certificates", desc: "QR-code certificates candidates can share on LinkedIn. Verifiable by any third party via b4skills public verification portal." },
      { icon: <BarChart3 size={18} />, title: "HR Analytics Suite", desc: "Track language proficiency distributions by department, region, or seniority. Model language upskilling ROI with built-in analytics." },
      { icon: <Globe2 size={18} />, title: "Multilingual Interface", desc: "Test interface available in 12 UI languages. Asset instructions can be narrated in candidate's L1 — only the English response is scored." },
    ],
    checkItems: [
      "SSO via SAML 2.0 / OIDC (Okta, Azure AD, Google Workspace)",
      "Custom branded portal at your subdomain (assess.yourcompany.com)",
      "Dedicated SLA with 99.9% uptime guarantee for enterprise contracts",
      "SOC 2 Type II audit available on request",
      "Aggregate reporting exportable to Power BI, Tableau, Looker",
    ],
    quote: "We screen 4,000 applicants quarterly. b4skills cut our language-test cost per candidate by 68% while improving hire quality.",
    quoteAuthor: "Global Talent Acquisition Lead, Fortune 500 Technology Company",
    ctaTitle: "Book an Enterprise Demo",
    ctaDesc: "Live walkthrough of your ATS integration in 30 minutes. Pilot pricing available.",
  },

  "Language Schools": {
    tag: "Distribution · Language Institutes",
    heroTitle: "From Walk-In to\nCertified Proficient.",
    heroSubtitle: "Language schools and institutes trust b4skills to deliver placement tests, progress checks, and exit certificates — all within a single platform that carries the credibility your students need.",
    stats: [
      { value: "15 min", label: "Express Placement Test" },
      { value: "Unlimited", label: "Re-Test Credits Available" },
      { value: "8 Skills", label: "Modules in One Platform" },
      { value: "White-Label", label: "Brand as Your Own" },
    ],
    sectionTitle: "The Complete Language Institute Assessment Stack",
    sectionBody: "Whether you're placing 20 new arrivals or certifying 500 course completers, b4skills delivers consistent, defensible results. Our placement diagnostic identifies CEFR level in under 15 minutes — giving course coordinators accurate class groupings on day one. Progress checkpoints throughout a course motivate learners with visible growth data. Final certification delivered as a QR-verified CEFR digital certificate your students can attach to CVs and university applications.",
    features: [
      { icon: <Clock size={18} />, title: "15-Min Placement Diagnostic", desc: "Express CAT targets CEFR level in 15–20 items. Perfect for walk-in assessment days or online pre-enrolment screening." },
      { icon: <TrendingUp size={18} />, title: "Progress Check Modules", desc: "Mid-course and end-of-term checkpoints with full skill breakdown — motivates learners and validates teaching outcomes." },
      { icon: <Award size={18} />, title: "Shareable CEFR Certificates", desc: "Branded certificates with your institute's logo and QR verification. Accepted by universities and employers without re-testing." },
      { icon: <Mic size={18} />, title: "AI Speaking Evaluation", desc: "Computerised speaking tasks scored by Gemini AI against CEFR rubrics — no examiner required. Results in under 5 minutes." },
      { icon: <Users size={18} />, title: "Class Management Portal", desc: "Group candidates into cohorts, track class-average progress, and share reports with teachers through a clean coordinator interface." },
      { icon: <Star size={18} />, title: "Learner Motivation Engine", desc: "Post-test feedback reports show learners exactly which sub-skills to focus on next — driving re-enrolment and course upsell." },
    ],
    checkItems: [
      "White-label portal — your logo, your URL, your brand",
      "Flexible credit packs: pay per test or unlimited subscription",
      "Teacher and coordinator roles with per-cohort visibility",
      "Multi-language UI for international student intake",
      "Free marketing assets: placement test landing page template, social graphics",
    ],
    quote: "Our placement process went from a 2-hour paper test to a 15-minute online assessment. Students love the instant feedback.",
    quoteAuthor: "Director of Studies, Accredited Language Institute",
    ctaTitle: "Get Pricing for Your School",
    ctaDesc: "Transparent per-test or subscription pricing. Volume discounts for 500+ tests/month.",
  },

  // ── ASSESSMENTS ────────────────────────────────────────────────────────────
  "b4skills Diagnostic": {
    tag: "Assessment Module · Foundation",
    heroTitle: "Know Every Learner's\nTrue Starting Point.",
    heroSubtitle: "The b4skills Diagnostic is the fastest, most statistically precise CEFR placement tool available. Adaptive, AI-scored, and results-ready in under 20 minutes.",
    stats: [
      { value: "15–20 items", label: "Adaptive Length" },
      { value: "< 20 min", label: "Average Completion" },
      { value: "α > 0.92", label: "Reliability Coefficient" },
      { value: "A1–C2", label: "CEFR Scale" },
    ],
    sectionTitle: "Precision Placement in Minutes",
    sectionBody: "Traditional placement tests are too long, too static, and too subjective. The b4skills Diagnostic uses a fully calibrated Computerised Adaptive Test (CAT) engine built on 3-Parameter Logistic IRT. Each item is selected in real time based on the learner's running ability estimate — eliminating redundant easy or impossible questions. The result: a CEFR band with a Standard Error of Measurement (SEM) below 0.35, published within seconds of the final item.",
    features: [
      { icon: <BrainCircuit size={18} />, title: "3PL IRT Engine", desc: "Items calibrated with discrimination (a), difficulty (b), and pseudo-guessing (c) parameters. Theta estimated via Expected A Posteriori (EAP)." },
      { icon: <Activity size={18} />, title: "Real-Time Ability Tracking", desc: "Ability estimate and SEM updated after every response. Test terminates when SEM threshold is met — not before, not after." },
      { icon: <Mic size={18} />, title: "Optional Speaking Probe", desc: "Add a single 60-second speaking task scored by Gemini AI for a fuller CEFR profile — particularly useful for oral placement." },
      { icon: <FileText size={18} />, title: "Instant Score Report", desc: "CEFR level, theta score, skill breakdown, and next-step recommendations delivered the moment the test ends." },
      { icon: <Lock size={18} />, title: "Anti-Cheating by Design", desc: "Item bank of 2,000+ calibrated items means no two tests are identical. Browser-tab monitoring flags suspicious behaviour." },
      { icon: <Zap size={18} />, title: "Bulk Deployment Ready", desc: "Issue test links to 10,000 candidates simultaneously. No software install. Works on any device with a browser." },
    ],
    checkItems: [
      "18–24 item adaptive sequence covering Reading, Listening, Grammar, Vocabulary",
      "Optional writing and speaking tasks for full four-skills placement",
      "Group candidate codes for class-level result aggregation",
      "CSV / API export of raw theta scores and CEFR bands",
      "Reference test data aligns with ALTE / CEFR validity studies",
    ],
    quote: "We ran b4skills Diagnostic on 800 incoming students in one afternoon. The placement accuracy vs. our old paper test was night and day.",
    quoteAuthor: "ELT Academic Coordinator, University Language Centre",
    ctaTitle: "Run a Free Diagnostic Pilot",
    ctaDesc: "100 free test credits for your first cohort. No integration required to get started.",
  },

  "b4skills Career Context": {
    tag: "Assessment Module · Professional English",
    heroTitle: "English Proficiency\nMeasured in the Real World of Work.",
    heroSubtitle: "Career Context assesses English in authentic workplace scenarios — emails, reports, meeting extracts, and professional speaking tasks — delivering a CEFR score that's meaningful to employers.",
    stats: [
      { value: "12 industries", label: "Context Variants Available" },
      { value: "4 Skills", label: "Full Profile Assessment" },
      { value: "35 min", label: "Standard Version" },
      { value: "B1–C2", label: "Target Band Range" },
    ],
    sectionTitle: "Beyond General English — Into Professional Reality",
    sectionBody: "Generic CEFR tests tell you a candidate scored B2. Career Context tells you whether that B2 candidate can write a client proposal, navigate a supplier call, or summarise a data report in English. Items are built around 12 industry context packs (Finance, Technology, Healthcare, Legal, Logistics, Hospitality, and more). Employers configure which industry pack to deploy — ensuring face validity for candidates and role-relevance for hiring managers. AI writing and speaking scoring applies CEFR rubrics enriched with professional register detection.",
    features: [
      { icon: <Briefcase size={18} />, title: "Industry Context Packs", desc: "12 sector-specific item pools — Technology, Finance, Healthcare, Legal, Hospitality, Logistics, and more. Match test context to role." },
      { icon: <FileText size={18} />, title: "Authentic Task Types", desc: "Write a professional email, summarise a meeting extract, respond to a graph report, or answer a manager's voicemail — real tasks, real scores." },
      { icon: <Mic size={18} />, title: "Professional Speaking Module", desc: "Respond to workplace scenarios: present a project update, handle a client complaint, or explain a data table. Scored by AI for CEFR fluency and vocabulary." },
      { icon: <Star size={18} />, title: "Register & Formality Scoring", desc: "AI scoring detects appropriate professional register — not just grammar — and includes register notes in the feedback report." },
      { icon: <BarChart3 size={18} />, title: "Role-Benchmark Reports", desc: "Overlay candidate score against your role-specific CEFR benchmark. Instant pass/review/reject signal for HR teams." },
      { icon: <Award size={18} />, title: "Verified Professional Certificate", desc: "Career Context certificates include industry context label — candidates can credibly present the result in professional profiles." },
    ],
    checkItems: [
      "Adaptive within B1–C2 band — right-sized precision for professional roles",
      "Bilingual task instructions available for 10 L1 languages",
      "ATS webhook integration: score pushed into candidate profile on completion",
      "Custom company branding on test interface and report",
      "ISO 27001 / SOC 2 compliant infrastructure",
    ],
    quote: "We stopped relying on certifications candidates achieved years ago. Career Context gives us a current, job-relevant score in 35 minutes.",
    quoteAuthor: "Head of Talent, Global Financial Services Group",
    ctaTitle: "Download Career Context Brochure",
    ctaDesc: "Full module specification, sample items, and pricing. Delivered to your inbox in minutes.",
  },

  "Early Years (Ages 7-10)": {
    tag: "Assessment Module · Early Years EFL/ESL",
    heroTitle: "Gentle, Precise English\nAssessment for Young Learners.",
    heroSubtitle: "The Early Years module meets children where they are — with illustrated prompts, audio-first navigation, and a warm interface — while the psychometric engine underneath delivers rigorous CEFR pre-A1 to A2 data.",
    stats: [
      { value: "Ages 7–10", label: "Target Learner Group" },
      { value: "Pre-A1 – A2", label: "CEFR Scale Coverage" },
      { value: "< 25 min", label: "Child-Appropriate Duration" },
      { value: "COPPA/GDPR", label: "Child Data Compliance" },
    ],
    sectionTitle: "Assessment That Feels Like Learning",
    sectionBody: "Young learners shut down under traditional test pressure. The Early Years module is designed by ELT specialists and child psychologists to feel curiosity-driven rather than exam-driven. Navigation is fully audio-guided — no reading required to understand instructions. Illustrated characters guide children through listening, speaking, and vocabulary tasks at a gentle pace. Behind the scenes, the b4skills IRT engine is calibrated to pre-A1 → A2 items, delivering statistically sound ability estimates with child-appropriate reliability. Teachers receive skill reports that map directly to Cambridge YLE (Starters/Movers/Flyers) descriptors.",
    features: [
      { icon: <Baby size={18} />, title: "Audio-Guided Navigation", desc: "Every instruction read aloud. Children advance at their own pace with no time pressure on navigation steps." },
      { icon: <BookOpen size={18} />, title: "Illustrated Item Contexts", desc: "Colourful scenes replace abstract text. Vocabulary items presented through illustrated narratives children find engaging." },
      { icon: <Mic size={18} />, title: "Picture-Prompted Speaking", desc: "Children describe images or short stories aloud. Gemini AI scores responses for CEFR Pre-A1–A2 speaking descriptors." },
      { icon: <Target size={18} />, title: "Cambridge YLE Alignment", desc: "Results map to Starters / Movers / Flyers descriptor bands — familiar language for teachers and parents." },
      { icon: <Users size={18} />, title: "Class & Teacher Reports", desc: "Per-pupil skill breakdown in plain English. Identify which children need L1-support intervention before the term progresses." },
      { icon: <ShieldCheck size={18} />, title: "Child-Safe Infrastructure", desc: "No advertising, no facial image storage, no gamified data collection. Full COPPA and GDPR-K compliance." },
    ],
    checkItems: [
      "Fully audio-guided: no reading required to navigate the test",
      "Illustrated characters and scenes localised for diverse cultural contexts",
      "Teacher can pause or resume individual child sessions at any time",
      "Parental consent workflow built in for GDPR compliance",
      "Result reports in plain English — accessible for non-specialist teachers",
    ],
    quote: "The children thought it was a game. We got the most accurate placement data we've ever had at the start of term.",
    quoteAuthor: "Year 4 English Lead, International Primary School",
    ctaTitle: "Request an Early Years Demo",
    ctaDesc: "See a full child-view walkthrough with sample reports. Free pilot for primary schools.",
  },

  "Video & Writing Interviews": {
    tag: "Assessment Module · Screening & Selection",
    heroTitle: "Screen for Communication\nNot Just Credentials.",
    heroSubtitle: "Video & Writing Interviews let recruiters and admissions teams evaluate real English communication skills asynchronously — at scale, with AI scoring, in a format that reveals authentic ability.",
    stats: [
      { value: "Async", label: "No Live Scheduling Needed" },
      { value: "< 20 min", label: "Candidate Completion" },
      { value: "AI + Human", label: "Dual Scoring Option" },
      { value: "B1–C2", label: "Applicable CEFR Range" },
    ],
    sectionTitle: "First Impressions at Scale",
    sectionBody: "Traditional interviews require calendar coordination, human evaluator time, and inevitably introduce halo-effect bias. b4skills Video & Writing Interviews replace the first-round screening interview with a structured, AI-scored asynchronous task. Candidates record video responses to configurable open-ended prompts, and submit a written response — all within a single 20-minute session. Gemini AI scores both channels against CEFR writing and speaking rubrics, with optional human calibration review in the Rating Queue. Hiring managers receive ranked shortlists with annotated AI feedback — ready for second-round decisions.",
    features: [
      { icon: <Mic size={18} />, title: "Video Response Capture", desc: "Candidate records 1–3 minute video responses to up to 5 configurable prompts. No app install — browser-based with fallback audio mode." },
      { icon: <FileText size={18} />, title: "Structured Writing Task", desc: "Configurable written prompt (email, essay, summary) with minimum word count enforcement and rich-text editor." },
      { icon: <BrainCircuit size={18} />, title: "Gemini AI Multi-Modal Scoring", desc: "Video analysed for fluency, vocabulary, coherence, and grammar. Writing scored for task achievement, cohesion, and register." },
      { icon: <Users size={18} />, title: "Human Rating Queue", desc: "Flag any AI score for expert human review. Our certified rater pool completes reviews within 24 hours." },
      { icon: <BarChart3 size={18} />, title: "Ranked Shortlist View", desc: "Evaluators see candidates ranked by composite score with expandable AI feedback and video playback — decisions in minutes, not hours." },
      { icon: <Lock size={18} />, title: "Bias Reduction by Design", desc: "Standardised prompts and rubric-based scoring eliminate evaluator bias. Blind scoring option hides candidate identity during AI review." },
    ],
    checkItems: [
      "Up to 5 configurable video prompts + 1 writing task per session",
      "Optional L1-language task instructions for bilingual screening",
      "Candidate can retake speaking tasks within configurable attempt limits",
      "Recruiter portal with side-by-side video, transcript, and AI score",
      "GDPR-compliant candidate consent workflow and data retention controls",
    ],
    quote: "We cut our first-round phone screen time by 80%. The AI scores are remarkably consistent with our senior examiners.",
    quoteAuthor: "Talent Acquisition Manager, European Consulting Firm",
    ctaTitle: "Build Your First Video Interview",
    ctaDesc: "Configure prompts, set scoring rubrics, and invite your first cohort — in 10 minutes.",
  },

  "Junior Suite (Ages 11-15)": {
    tag: "Assessment Module · Secondary EFL/ESL",
    heroTitle: "Rigorous English Testing\nDesigned for Teens.",
    heroSubtitle: "The Junior Suite delivers full four-skills CEFR assessment for secondary learners — with age-relevant topics, adaptive intelligence, and feedback that motivates continued learning.",
    stats: [
      { value: "Ages 11–15", label: "Target Learner Group" },
      { value: "A1 – B2", label: "CEFR Scale Coverage" },
      { value: "35 min", label: "Full Assessment Duration" },
      { value: "4 Skills", label: "Reading, Listening, Writing, Speaking" },
    ],
    sectionTitle: "Challenging the Right Amount — Every Time",
    sectionBody: "Secondary learners are acutely aware of failure. A test that floods a B1 student with C1 items demoralises rather than diagnoses. The Junior Suite's adaptive engine ensures every student encounters appropriately challenging items — neither frustratingly hard nor patronisingly easy. Topics are selected by teenage ELT specialists: social media trends, the environment, sports, technology, and youth culture. Writing tasks use real-world formats teens recognise — blog posts, opinion pieces, short stories. AI speaking scoring provides instant, growth-oriented feedback students actually read.",
    features: [
      { icon: <Target size={18} />, title: "Teen-Relevant Content", desc: "Items built around topics secondary students care about — sustainability, technology, film, sport — to maximise authentic engagement." },
      { icon: <Activity size={18} />, title: "Adaptive Precision", desc: "CAT engine narrows in on each student's true A1–B2 level without exposing them to frustrating out-of-range items." },
      { icon: <FileText size={18} />, title: "Teen Writing Tasks", desc: "Blog posts, informal emails, and structured opinion essays. AI scoring provides detailed CEFR criterion feedback students understand." },
      { icon: <Mic size={18} />, title: "Situation-Based Speaking", desc: "Teens respond to everyday situations and describe images. AI scoring benchmarks against CEFR B1/B2 speaking descriptors." },
      { icon: <TrendingUp size={18} />, title: "Growth-Focused Feedback", desc: "Post-test reports show 'what I can do' descriptors and clear next steps — building growth mindset rather than test anxiety." },
      { icon: <BookOpen size={18} />, title: "Cambridge & IB Alignment", desc: "Results map to Cambridge KET/PET/FCE and IB MYP Language B descriptors — credible for school reporting and parent communication." },
    ],
    checkItems: [
      "Full four-skills assessment (R/L/W/S) in a single adaptive session",
      "Age-appropriate proctoring — no facial recognition stored for under-16s",
      "Class performance reports with individual student breakdowns",
      "'My Results' learner view with progress versus previous assessment",
      "Configurable difficulty ceiling — limit maximum CEFR level for homogeneous groups",
    ],
    quote: "Students actually engage. The feedback feels encouraging rather than punishing — and our teachers say the data is the most useful they've seen.",
    quoteAuthor: "Head of English, International Secondary School",
    ctaTitle: "Request a Junior Suite Pilot",
    ctaDesc: "60-day pilot for secondary schools. Includes teacher onboarding webinar at no cost.",
  },

  "General English Adaptive": {
    tag: "Assessment Module · Flagship",
    heroTitle: "The Complete Adaptive\nEnglish Assessment.",
    heroSubtitle: "b4skills General English Adaptive is the full-spectrum, four-skills CAT assessment covering Pre-A1 to C2 — the most statistically rigorous English proficiency test available outside a certified exam centre.",
    stats: [
      { value: "Pre-A1 – C2", label: "Full CEFR Spectrum" },
      { value: "α = 0.94", label: "Internal Reliability" },
      { value: "4 Skills", label: "+ Grammar & Vocabulary" },
      { value: "40 min", label: "Full Assessment" },
    ],
    sectionTitle: "No Compromises on Psychometric Quality",
    sectionBody: "b4skills General English Adaptive is the flagship assessment module — our full expression of what adaptive testing can be. Combining a 2,000+ item bank calibrated with 3PL IRT parameters, multi-modal Gemini AI scoring for writing and speaking, and behavioural proctoring, it produces a full CEFR profile with sub-skill breakdowns across Reading, Listening, Writing, Speaking, Grammar, and Vocabulary. The test terminates adaptively when the SEM threshold is reached — typically between 30–50 items — ensuring no candidate is tested for longer than necessary.",
    features: [
      { icon: <BrainCircuit size={18} />, title: "Full CAT Engine (3PL IRT)", desc: "Item selection via maximum information criterion. Real-time EAP theta estimation. SEM-based stopping rule. Publishable accuracy." },
      { icon: <Mic size={18} />, title: "AI Speaking (Gemini)", desc: "Two speaking tasks scored on fluency, vocabulary, coherence, pronunciation, and CEFR level descriptors. Results in < 5 minutes." },
      { icon: <FileText size={18} />, title: "AI Writing (Gemini)", desc: "One extended writing task scored on task achievement, lexical range, grammatical accuracy, and discourse coherence." },
      { icon: <ShieldCheck size={18} />, title: "Full Proctoring Suite", desc: "Face detection, browser lockdown, tab-switch monitoring, and keystroke anomaly detection — all running passively during the test." },
      { icon: <Award size={18} />, title: "Detailed CEFR Certificate", desc: "Six-skill radar chart, overall CEFR band, theta score, and percentile rank. QR-verifiable by any third party." },
      { icon: <Globe2 size={18} />, title: "Multi-Org Deployment", desc: "Deploy across unlimited sub-organisations with centralised super-admin reporting. Supports white-labelling per org." },
    ],
    checkItems: [
      "2,000+ calibrated items across six skill domains",
      "Adaptive length: typically 30–50 items at 40 min average",
      "Full psychometric report including SEM and reliability coefficient",
      "Weighted composite CEFR score from all six skill domains",
      "Reference scores validated against IELTS and Cambridge Main Suite bands",
    ],
    quote: "The psychometric quality is comparable to Cambridge suite assessments at a fraction of the cost and a fifth of the time.",
    quoteAuthor: "Senior Language Testing Researcher, National Assessment Body",
    ctaTitle: "View Technical Specifications",
    ctaDesc: "Full IRT parameter data, validity studies, and CEFR alignment documentation on request.",
  },

  "Academic Admissions (C1+)": {
    tag: "Assessment Module · Higher Education Admissions",
    heroTitle: "C1+ Admissions Assessment\nBuilt for University Entry.",
    heroSubtitle: "b4skills Academic Admissions delivers a rigorous, secure, and fast English entry test for universities — trusted to gatekeep C1 and C2 proficiency for degree programmes, postgraduate entry, and academic scholarships.",
    stats: [
      { value: "C1 – C2", label: "Target CEFR Band" },
      { value: "45 min", label: "Full Assessment Duration" },
      { value: "Proctored", label: "Remote & On-Site Modes" },
      { value: "24hr", label: "Results Turnaround" },
    ],
    sectionTitle: "The Admissions Test Universities Trust",
    sectionBody: "Universities receive thousands of applicants claiming C1 or C2 English. b4skills Academic Admissions provides the statistical certainty to confidently differentiate. The assessment centres on academic reading comprehension, academic writing (argumentative essay), academic listening (lecture extract), and an extended speaking task. AI scoring applies academic CEFR rubrics — not generic EFL rubrics — so the scores reflect real readiness for lecture-based, essay-driven degree study. A human review queue ensures borderline cases receive expert examiner adjudication within 24 hours.",
    features: [
      { icon: <GraduationCap size={18} />, title: "Academic Task Types", desc: "Lecture extract listening, journal article reading, argumentative essay writing, and academic presentation speaking — all within one session." },
      { icon: <BrainCircuit size={18} />, title: "Academic Register Scoring", desc: "AI writing and speaking scoring tuned to academic register, argumentation quality, and discourse organisation — beyond basic CEFR rubrics." },
      { icon: <ShieldCheck size={18} />, title: "Secure Remote Proctoring", desc: "AI-invigilated remote delivery with ID verification — comparable rigour to an on-site proctored session at a fraction of the cost." },
      { icon: <Users size={18} />, title: "Human Review for Borderlines", desc: "Automated flagging of borderline C1/B2 scores for expert human review. Adjudicator pool of certified IELTS examiners." },
      { icon: <BarChart3 size={18} />, title: "Admissions Analytics", desc: "Visualise incoming cohort proficiency distribution before enrolment. Identify students needing pre-sessional English support." },
      { icon: <Award size={18} />, title: "Recognised Programme Certificate", desc: "Academic Admissions certificate distinct from general CEFR certificate — specifically designed for university admissions file submission." },
    ],
    checkItems: [
      "C1/C2 band precision: SEM < 0.30 at target ability range",
      "Academic writing: 250-word minimum argumentative essay",
      "Academic listening: 5-minute lecture extract with comprehension tasks",
      "Academic speaking: 2-minute prepared response + 1-minute follow-up",
      "Results accepted by partner universities in 28 countries (growing)",
    ],
    quote: "We replaced our incumbent admissions test with b4skills. The academic task design is superior and the turnaround is dramatically faster.",
    quoteAuthor: "Director of International Admissions, Research University",
    ctaTitle: "Discuss Admissions Integration",
    ctaDesc: "Speak with our higher education team about replacing or supplementing your current entry test.",
  },

  "Business English Core": {
    tag: "Assessment Module · Corporate Learning",
    heroTitle: "Measure. Baseline. Upgrade.\nBusiness English Done Right.",
    heroSubtitle: "Business English Core provides organisations with a reliable CEFR baseline for corporate English training — measuring pre-training ability, tracking progress mid-programme, and certifying post-training proficiency.",
    stats: [
      { value: "B1–C1", label: "Core Operational Band" },
      { value: "30 min", label: "Core Version Duration" },
      { value: "ROI Ready", label: "Training Impact Reports" },
      { value: "L&D Aligned", label: "LMS / LXP Integrable" },
    ],
    sectionTitle: "The Missing Piece in Corporate English Training",
    sectionBody: "L&D teams invest heavily in Business English training — but without pre/post measurement, ROI is invisible. Business English Core is a purpose-built B1–C1 adaptive assessment that functions as entry baseline, mid-point progress check, and exit certification within a single reusable workflow. Items are drawn from authentic business contexts — reports, presentations, meetings, negotiations — ensuring face validity for learners and relevance for L&D sponsors. Gemini AI scores the writing and speaking tasks against business CEFR rubrics with professional register weighting. The result is a credible CEFR gain score that proves the value of language training investment.",
    features: [
      { icon: <Briefcase size={18} />, title: "Business Context Items", desc: "All items sourced from authentic business communication: boardroom discussions, client emails, quarterly report extracts, telephone negotiations." },
      { icon: <TrendingUp size={18} />, title: "Pre / Post Gain Tracking", desc: "Run assessments at training start, midpoint, and finish. Automated gain score reports show measurable CEFR progression per learner." },
      { icon: <BarChart3 size={18} />, title: "L&D ROI Dashboard", desc: "Department-level and individual gain scores, training hours vs. CEFR improvement correlations — the business case for language training made visible." },
      { icon: <FileText size={18} />, title: "Business Writing Task", desc: "Write a professional report, executive summary, or business proposal. AI scoring includes professional vocabulary range and register analysis." },
      { icon: <Mic size={18} />, title: "Business Speaking Module", desc: "Present a business update, handle an objection, or summarise data in English. AI scores for fluency, business vocabulary, and task completion." },
      { icon: <Zap size={18} />, title: "LMS / LXP Integration", desc: "Scores pushed to Cornerstone, Workday Learning, SAP SuccessFactors, Degreed, or any LRS-compatible LXP via xAPI / SCORM 1.2." },
    ],
    checkItems: [
      "Three-point testing workflow: baseline → progress → exit certification",
      "Manager visibility dashboard — see team language levels without HR bottleneck",
      "B1/B2/C1 milestone certificates for learner motivation",
      "Custom minimum score thresholds per L&D programme requirement",
      "Aggregated department-level reports for CLO / L&D Director briefings",
    ],
    quote: "We finally have hard data to take to the CFO. b4skills shows us exactly which teams improved and by how much, linked to our English training spend.",
    quoteAuthor: "Head of Learning & Development, Multinational Manufacturing Group",
    ctaTitle: "Get the L&D Toolkit",
    ctaDesc: "Free ROI calculator, sample pre/post report, and pricing. Sent to your inbox instantly.",
  },
};

// Fallback for unlisted pages
const FALLBACK_PAGE = (name: string) => ({
  tag: "b4skills Platform",
  heroTitle: `${name}`,
  heroSubtitle: "b4skills delivers IRT-powered, AI-scored English assessments trusted by institutions, enterprises, and language schools worldwide.",
  stats: [
    { value: "2,000+", label: "Calibrated Items" },
    { value: "CEFR A1–C2", label: "Full Scale" },
    { value: "AI Scored", label: "Writing & Speaking" },
    { value: "ISO 27001", label: "Security Standard" },
  ],
  sectionTitle: "Psychometric Quality at Digital Speed",
  sectionBody: `${name} is part of the b4skills ecosystem — a platform where every assessment decision is backed by Item Response Theory, every score is defended by a reliability coefficient, and every user experience is designed to minimise test anxiety while maximising measurement precision.`,
  features: [
    { icon: <BrainCircuit size={18} />, title: "Adaptive Engine", desc: "IRT-based CAT selects optimal items in real time — shorter tests, equal precision." },
    { icon: <Mic size={18} />, title: "AI Speaking Scoring", desc: "Gemini multi-modal model scores speaking tasks against CEFR rubrics in under 5 minutes." },
    { icon: <FileText size={18} />, title: "AI Writing Scoring", desc: "Task achievement, coherence, lexical range, and grammatical accuracy — AI-scored instantly." },
    { icon: <ShieldCheck size={18} />, title: "Secure Proctoring", desc: "Browser lockdown, face detection, and anomaly monitoring for every session." },
  ],
  checkItems: [
    "Full CEFR range Pre-A1 to C2 coverage", "Instant result reporting", "API and LMS integration ready", "GDPR/FERPA compliant",
  ],
  quote: "", quoteAuthor: "", ctaTitle: "Learn More About b4skills",
  ctaDesc: "Speak with an assessment specialist to find the right module for your context.",
});

// ─── Page Component ────────────────────────────────────────────────────────────
export const DynamicPage: React.FC<DynamicPageProps> = ({ pageName, onBack }) => {
  useEffect(() => { window.scrollTo(0, 0); }, [pageName]);

  if (pageName === 'Academia' || pageName === 'Academic Testing' || pageName.includes('Academia')) return <AcademiaPage onBack={onBack} />;
  if (pageName === 'Corporations' || pageName === 'Corporates' || pageName.includes('Corporate') || pageName.includes('Corporations')) return <CorporatePage onBack={onBack} />;
  if (pageName === 'Language Schools' || pageName === 'Language Centers') return <LanguageSchoolsPage onBack={onBack} />;
  if (pageName === 'Schools' || pageName === 'For Schools' || pageName.includes('Schools')) return <SchoolsPage onBack={onBack} />;

  const page = PAGE_DATA[pageName] ?? FALLBACK_PAGE(pageName);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black text-sm uppercase tracking-wider transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        <div className="bg-[#9b276c] text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight flex items-center">
          <span style={{ textShadow: '0 0 8px rgba(253,224,71,0.8)' }}>b4skills</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-44 lg:pb-36 overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#9b276c]/50 via-slate-900 to-slate-900" />
        <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] bg-[#9b276c] rounded-full blur-[180px] opacity-25 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-900 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Tag>{page.tag}</Tag>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-5xl lg:text-7xl font-black tracking-tighter mb-8 max-w-5xl leading-[1.05]"
            style={{ whiteSpace: 'pre-line' }}
          >
            {page.heroTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-xl text-slate-300 max-w-2xl leading-relaxed font-medium mb-12"
          >
            {page.heroSubtitle}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            onClick={onBack}
            className="flex items-center gap-3 bg-[#9b276c] hover:bg-[#7d1f57] text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-2xl shadow-[#9b276c]/30 hover:-translate-y-0.5"
          >
            {page.ctaTitle} <ChevronRight size={16} />
          </motion.button>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {page.stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <StatBox value={s.value} label={s.label} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          <div>
            <SectionLabel>Why It Works</SectionLabel>
            <motion.h2
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-4xl font-black text-slate-900 tracking-tight mb-6 leading-tight"
            >
              {page.sectionTitle}
            </motion.h2>
            <p className="text-slate-600 text-lg leading-relaxed mb-10">
              {page.sectionBody}
            </p>
            <ul className="space-y-3">
              {page.checkItems.map((item, i) => (
                <CheckItem key={i}>{item}</CheckItem>
              ))}
            </ul>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {page.features.map((f, i) => (
              <FeatureCard key={i} icon={f.icon} title={f.title} desc={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* Quote / Social Proof */}
      {page.quote && (
        <section className="py-16 bg-slate-50 border-y border-slate-100">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="text-4xl text-[#9b276c] font-black mb-4">"</div>
            <blockquote className="text-xl font-medium text-slate-700 leading-relaxed italic mb-6">
              {page.quote}
            </blockquote>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{page.quoteAuthor}</div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-[10px] font-black text-[#9b276c] uppercase tracking-[0.3em] mb-4">Ready to Start?</div>
          <h2 className="text-4xl font-black text-white tracking-tight mb-4">{page.ctaTitle}</h2>
          <p className="text-slate-400 text-lg font-medium mb-10">{page.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onBack}
              className="bg-[#9b276c] hover:bg-[#7d1f57] text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl shadow-[#9b276c]/30 hover:-translate-y-0.5"
            >
              Get Started Now
            </button>
            <button
              onClick={onBack}
              className="bg-white/10 hover:bg-white/20 text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl border border-white/20 transition-all"
            >
              ← Back to Platform
            </button>
          </div>
        </div>
      </section>

      <footer className="py-10 bg-slate-900 border-t border-white/5 text-center">
        <p className="text-slate-500 text-xs font-medium">© {new Date().getFullYear()} b4skills Inc. IRT-powered, AI-scored, globally trusted.</p>
      </footer>
    </div>
  );
};
