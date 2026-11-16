# B4Skills Privacy Policy

> **DRAFT — not legally reviewed, not published.** `[[FILL: …]]` marks facts only the product owner knows; `[[DECIDE: …]]` marks product or legal decisions. The Turkish version ([PRIVACY_POLICY.tr.md](PRIVACY_POLICY.tr.md)) also serves as the KVKK notice; keep both in sync. Open items: [README.md](README.md).

Last updated: [[FILL: publication date]]

This policy covers the b4skills.com website, the web app and the B4Skills apps for iPad, Mac and Android (the "Service"). The Service measures your English through an assessment. This policy explains which personal data is processed, why, who receives it, how long it is kept and what your rights are.

## 1 Who is responsible?

- **If you take the assessment with a code or account from an institution** (school, university, employer, language school), the institution decides why the assessment is used and what happens with the results. The institution is the controller and B4Skills processes your data on its behalf. The institution's own privacy notice also applies. You can contact the institution first; if you write to us, we answer together with it.
- **If you bought the assessment yourself** or you are visiting the website, B4Skills is the controller.

B4Skills: [[FILL: legal entity name]], [[FILL: registered address]], [[FILL: company / tax number]]. Privacy contact: [[FILL: privacy@b4skills.com — confirm it works]]. [[DECIDE: EU representative (GDPR Art. 27) and DPO if serving the EU]]

## 2 Data we process

| Data | Examples | Source |
| --- | --- | --- |
| Identity and contact | First name, last name, email | Sign-up form, exam-code form, your institution |
| School / institution | Institution, school, class | Exam-code form, your institution |
| Account security | Password (stored only as a one-way hash), session tokens, two-factor settings | You |
| Answers | Selected answers, written texts, response times | During the assessment |
| Voice recordings | Your spoken answers in the speaking section. They are transcribed for scoring; the transcript is not stored | Microphone, speaking items only |
| Camera images | Unless your institution turned monitoring off: one baseline photo taken automatically at the start when a single face is visible; on the web, also camera frames at specific events | Camera |
| Monitoring observations | No face / more than one face, leaving the app, screen recording or mirroring started, tab switches | Your device |
| Results | Skill scores, CEFR level, report and certificate | Assessment engine and raters |
| Technical data | Device and app version, IP address, error logs | Your device and our servers |
| Payments | Amount and status (card details go to Stripe, not to us) | Stripe |
| Optional demographics | First language, age group, education, gender — only if you choose to give them | You |

**About the camera, plainly:** faces are counted on your device; no video stream is sent or recorded and no live proctor watches you. No face recognition or identity matching is performed. Only the baseline photo and (on the web) event frames reach our servers. Monitoring observations never invalidate an assessment on their own; a person reviews them when needed. [[DECIDE: if the baseline photo is used to verify identity, assess it as biometric data (GDPR Art. 9 / KVKK Art. 6) and obtain explicit consent]]

## 3 Purposes and legal bases

| Purpose | Legal basis (GDPR Art. 6 / KVKK Art. 5) |
| --- | --- |
| Creating your account, delivering and scoring the assessment, sending results to you and your institution | Contract |
| Assessment security and reviewing suspected misconduct (monitoring) | Legitimate interest and the contract with your institution. Monitoring is on unless your institution turns it off; your device asks for camera permission. Without it, your institution's rules may not let you start |
| Measurement quality: item difficulty and fairness analyses, scoring consistency | Legitimate interest, using data separated from your identity |
| Debugging and security of the Service | Legitimate interest |
| Billing and accounting | Legal obligation |
| Optional demographics | Consent; not giving it does not affect your assessment |

We do not run ads, sell your data or track you across other apps and websites.

## 4 AI-assisted scoring

Written and spoken answers are sent to AI service providers (Google Gemini, OpenAI, Anthropic) for scoring; speech is transcribed first (OpenAI Whisper). Your name and email are not sent; only your answer and the task. [[FILL: contract/settings showing providers do not train on this data, and their retention]]

When the AI's confidence is low, a human rater scores your answer. Decisions based on results (admission, placement, etc.) are made by your institution. You can ask for a human review of your score using section 9.

## 5 Who receives your data

- **Your institution:** your results, report, monitoring observations and baseline photo.
- **Our service providers**, under contract and only on our instructions:

| Provider | Purpose | Location |
| --- | --- | --- |
| Render | Application servers | [[FILL: region]] |
| Supabase | Database and file storage | [[FILL: region]] |
| Amazon Web Services | File storage (some older records) | [[FILL: region]] |
| Google (Gemini), OpenAI, Anthropic | Scoring of writing/speaking and transcription | USA [[FILL: confirm]] |
| Stripe | Payments | [[FILL]] |
| Resend | Email delivery | [[FILL]] |
| Sentry | Error logs (on the web, a session replay with all text and media masked, only when an error occurs) | [[FILL]] |
| Apple | App distribution; crash reports only if you allowed sharing on your device | — |

- **Authorities** when the law requires it.

[[DECIDE: if blockchain anchoring of certificates (Polygon) is enabled: only the certificate's hash is written, never your name; that record cannot be deleted]]

## 6 International transfers

Some providers process data outside Türkiye and the EU, in particular in the USA. These transfers rely on [[FILL: EU Standard Contractual Clauses / KVKK standard contracts and notification date]].

## 7 Retention

| Data | Period |
| --- | --- |
| Account data | While your account exists; deleted immediately when you delete the account |
| Baseline photo (iPad/Mac) | 7 days; your institution can extend this to at most 30 days |
| Web camera frames and identity photo | 7 days; your institution can extend this to at most 30 days |
| Voice recordings | 30 days; afterwards only the score and scoring notes remain |
| Answers and results | 2 years from the assessment date (the certificate's validity). Afterwards they are separated from your identity and kept only in anonymised form |
| Payment records | As required by tax law [[FILL: confirm period]] |
| Error logs | [[FILL: Sentry retention]] |

## 8 Deleting your account

You can delete your account at any time: in the iPad/Mac app under **Sign out → Delete my account**, on the web at [[FILL: web path]]. When you do:

- your name, email, password, session tokens and profile are deleted;
- your voice recordings, camera photos and identity photo are deleted;
- your certificates are withdrawn and can no longer be verified;
- any assessment in progress is closed.

Your scores and answers remain, separated from your identity, in your institution's aggregate results and in measurement-quality studies; they cannot be linked back to you. Payment records are kept for the legally required period. Staff accounts managed by an institution are deleted by its administrator. [[DECIDE: written answers may contain personal details even when de-identified — delete them too?]]

## 9 Your rights

Under the GDPR and KVKK you can ask whether we process your data, get access to and a copy of it, have it corrected or deleted, object to processing, contest a result based on automated processing, receive your data in a portable format, withdraw consent, and claim compensation for damage.

Write to [[FILL: email]] with details we can use to verify your identity. We answer within 30 days. If you are not satisfied, you can complain to the Turkish Personal Data Protection Authority (kvkk.gov.tr) or, in the EU, to your national data protection authority.

## 10 Children

[[DECIDE: one of]]

- *Option A (recommended for the first release):* the iPad/Mac app does not accept sign-ups from children under 13. Assessments for ages 7–14 run on the web, only through a school that collects parental consent.
- *Option B:* data of children under 13 is processed only with consent of a parent or guardian and through an institution; optional demographics are not requested from children.

## 11 Security

Connections use HTTPS. Passwords are stored only as one-way hashes. Camera photos are kept in private (non-public) storage; on iPad/Mac, photos waiting to be sent are encrypted on the device. Access is limited by institution and role.

## 12 Cookies

The web app uses strictly necessary cookies to keep you signed in (`accessToken`, `refreshToken`). We do not use advertising or tracking cookies. [[FILL: any other cookies or local storage]]

## 13 Changes

If we change this policy we update the date above and announce important changes in the app or by email.
