import ReactMarkdown from "react-markdown";
import { AppFooter } from "@/components/layout/AppFooter";

const PRIVACY_MD = `# CampusBase Privacy Policy

**Version:** 1.0
**Last updated:** April 2026

---

## 1. Introduction

CampusBase is a SaaS platform for campus recruitment and employer branding, operated by Wondermoon BV ("we", "us", or "CampusBase"). This privacy policy explains what personal data we collect, why we collect it, and the rights you have regarding your data.

We take your privacy seriously and comply with the General Data Protection Regulation (GDPR) and applicable Belgian data protection legislation.

## 2. Who we are

**Data controller:**
Wondermoon BV
Company registration number (KBO/BCE): BE0455280584

For any questions about this privacy policy or to exercise your rights, please contact us at privacy@wondermoon.be.

## 3. What data we collect

### 3.1 Data you actively provide

| Category | Examples | Purpose |
|---|---|---|
| Account data | First name, last name, business email address, role (admin/editor/viewer/standenbouwer) | Platform access, authentication |
| Profile data | Avatar, notification preferences | User experience personalisation |
| Content data | Schools, contacts, events, contracts, tasks | Core CRM functionality |
| Ambassador data | Name, email, department of internal ambassadors | Event registration and communication |
| Feedback data | Answers to feedback forms | Event quality monitoring |

### 3.2 Data automatically collected

| Category | Examples | Purpose |
|---|---|---|
| Technical data | IP address, browser type, operating system | Security, debugging |
| Usage data | Login timestamps, executed actions (audit log) | Security, compliance |
| Session data | Authentication tokens, session ID | Login/logout functionality |

### 3.3 Data we do **not** collect

- Special categories of personal data (health, religion, political beliefs)
- Location data (unless explicitly activated by the client)
- Financial or payment information
- Data from minors under 16 years of age

## 4. Why we process this data (legal bases)

Under the GDPR we always need a legal basis to process personal data. For CampusBase these are:

| Legal basis | When applicable |
|---|---|
| **Performance of a contract** (art. 6(1)(b)) | Providing the platform to the client and its users |
| **Legitimate interests** (art. 6(1)(f)) | Security, fraud prevention, product improvement |
| **Legal obligation** (art. 6(1)(c)) | Retention periods for tax and audit obligations |
| **Consent** (art. 6(1)(a)) | Optional features for which we explicitly request consent (e.g. marketing emails) |

## 5. How long we retain data

| Data type | Retention period |
|---|---|
| Active account data | As long as you are a user of the platform |
| Deactivated account data | 2 years after deactivation (for audit purposes), then anonymised |
| Audit logs | 5 years (statutory retention) |
| Content data (schools, events, etc.) | As long as the client is active + 90 days after contract termination |
| Feedback data | 2 years or shorter if the client specifies |
| Backups | Rolling window of maximum 30 days |

After the retention period, data is automatically deleted or anonymised unless a statutory retention obligation applies.

## 6. Who we share data with

We never sell personal data. We only share data with the following categories of recipients:

### 6.1 Sub-processors

CampusBase uses the following sub-processors. We have entered into a Data Processing Agreement with each of them that meets GDPR requirements.

| Sub-processor | Service | Data location |
|---|---|---|
| **Supabase Inc.** | Database hosting, authentication | European Union (Frankfurt) |
| **Vercel Inc.** | Frontend hosting, CDN | European Union (edge caching), United States |
| **Twilio SendGrid** | Transactional emails | United States (SCCs in place) |

Changes to sub-processors are announced at least 30 days in advance by email to the client's designated contact.

### 6.2 Transfers outside the EEA

Where data is transferred to countries outside the European Economic Area (such as the United States via Vercel or SendGrid), this is done under Standard Contractual Clauses (SCCs) as adopted by the European Commission.

### 6.3 Legal requests

We may share data with authorities when legally required, for example under a court order.

## 7. Security measures

We implement appropriate technical and organisational measures to protect your data:

### Technical measures

- **Encryption**: all connections via HTTPS/TLS 1.3; passwords hashed using bcrypt
- **Role-based access control**: Row Level Security at the database level per user role
- **Audit logging**: all sensitive actions are recorded
- **Session invalidation**: sessions are terminated immediately upon user deactivation
- **Password policy**: minimum 8 characters required

### Organisational measures

- Access to production data is limited to authorised personnel
- Periodic security reviews and penetration tests
- Incident response procedure with 72-hour notification requirement

## 8. Your rights

Under the GDPR you have the following rights:

| Right | What it means |
|---|---|
| **Access** | Request a copy of all data we hold about you |
| **Rectification** | Have inaccurate or incomplete data corrected |
| **Erasure** | Request deletion of your data ("right to be forgotten") |
| **Restriction** | Temporarily suspend processing of your data |
| **Data portability** | Receive your data in a machine-readable format |
| **Objection** | Object to processing based on legitimate interests |
| **Withdraw consent** | Where processing is based on consent |

To exercise any of these rights, send an email to privacy@wondermoon.be. We will respond within 30 days.

### Filing a complaint

If you believe we are not processing your data correctly, you can file a complaint with the Belgian Data Protection Authority:

**Data Protection Authority (Gegevensbeschermingsautoriteit)**
Drukpersstraat 35, 1000 Brussels, Belgium
Phone: +32 (0)2 274 48 00
Email: contact@apd-gba.be
Website: https://www.dataprotectionauthority.be

## 9. Cookies and local storage

CampusBase uses only functional cookies and local storage that are strictly necessary for the platform to function:

| Type | Purpose | Retention period |
|---|---|---|
| Session cookies | Authentication, keeping you logged in | Duration of the session |
| Preference storage (localStorage) | Remembering platform settings | Persistent until logout |

We do not use tracking cookies, analytics cookies, or advertising cookies.

## 10. Changes to this policy

We may amend this privacy policy to reflect new functionality or changes in legislation. For material changes:

- We publish the new version on this page
- We inform clients by email at least 30 days in advance
- We request renewed consent where necessary

## 11. Contact

Questions about this privacy policy or how we handle your data?

**General inquiries:** privacy@wondermoon.be
**Postal address:** Wondermoon BV

---

## Appendix A: Data Processing Agreement (DPA) — template

> When a client uses CampusBase, this DPA applies automatically as the data processing agreement.

### Parties

- **Processor:** Wondermoon BV (CampusBase)
- **Controller:** The client

### Subject matter

Wondermoon BV processes personal data on behalf of the client in the context of providing the CampusBase platform.

### Categories of data subjects

- Client's employees (platform users)
- Contact persons at schools and educational institutions
- Internal ambassadors
- Students registering for events

### Categories of data

See section 3 of this privacy policy.

### Duration of processing

For the duration of the client contract, plus 90 days for data transfer or deletion.

### Processor obligations

- Process data only on written instructions from the controller
- Ensure confidentiality of personnel
- Implement appropriate technical and organisational measures (see section 7)
- Engage sub-processors only with written authorisation
- Assist with data subject rights requests
- Notify data breaches within 72 hours
- Return or delete data upon contract termination

### Sub-processors

See section 6.1. Changes announced 30 days in advance.

### Audits

The controller has the right to conduct or commission an audit once per year, at their own expense, with 30 days' prior notice.
`;

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <article className="privacy-prose">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 tracking-tight">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-10 mb-4 pb-2 border-b border-border">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-relaxed text-muted-foreground mb-4">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-outside pl-5 text-sm text-muted-foreground space-y-1 mb-4">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
                  {children}
                </a>
              ),
              hr: () => <hr className="my-8 border-border" />,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary/30 pl-4 italic text-sm text-muted-foreground my-4">{children}</blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-6 -mx-4 sm:mx-0">
                  <table className="min-w-full text-sm border border-border rounded-lg overflow-hidden mx-4 sm:mx-0">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted/50">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border text-xs uppercase tracking-wide">{children}</th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-muted-foreground border-b border-border">{children}</td>
              ),
            }}
          >
            {PRIVACY_MD}
          </ReactMarkdown>
        </article>
      </div>
      <AppFooter />
    </div>
  );
}
