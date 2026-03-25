import { Link } from "react-router-dom";

type MarketingPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
};

function MarketingPage({ eyebrow, title, intro, sections }: MarketingPageProps) {
  return (
    <div className="min-h-screen bg-[#090a18] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Back to home
        </Link>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f2b4cb]">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
            {intro}
          </p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold text-white">
                  {section.heading}
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/72">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <MarketingPage
      eyebrow="Legal"
      title="Privacy"
      intro="AI Content Studio only uses the information needed to run your workspace, process requests, and keep account activity visible."
      sections={[
        {
          heading: "What we collect",
          body: "We store the account details, workspace content, billing-related records, and product usage events required to provide the service and support account recovery, reporting, and troubleshooting.",
        },
        {
          heading: "How data is used",
          body: "Your data is used to authenticate access, save workspace state, process requests, show usage history, and improve product reliability. We do not sell customer content.",
        },
        {
          heading: "Retention and deletion",
          body: "Workspace records remain available until they are deleted by you or removed as part of account closure, subject to any legal or payment-related retention obligations.",
        },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <MarketingPage
      eyebrow="Legal"
      title="Terms"
      intro="Using AI Content Studio means using prepaid credits to access AI-assisted workflows inside your workspace."
      sections={[
        {
          heading: "Service access",
          body: "You are responsible for the activity under your account and for keeping your authentication credentials secure. Access may be suspended if misuse, fraud, or abuse is detected.",
        },
        {
          heading: "Credits and billing",
          body: "Credits are prepaid usage units. They are deducted only for successful operations according to the pricing and usage rules shown in the product at the time of use.",
        },
        {
          heading: "Acceptable use",
          body: "You may not use the service for unlawful activity, account abuse, attempts to disrupt availability, or content that violates applicable platform or provider policies.",
        },
      ]}
    />
  );
}

export function ContactPage() {
  return (
    <MarketingPage
      eyebrow="Support"
      title="Contact"
      intro="Need help with billing, account setup, or a workspace issue? Reach the team directly and include enough context for us to respond quickly."
      sections={[
        {
          heading: "General support",
          body: "Email support@aicontentstudio.net with your account email, the screen you were using, and a short description of the issue or request.",
        },
        {
          heading: "Billing and top-ups",
          body: "For credit top-ups, include the amount you want to add, your current balance if known, and whether the request is urgent for an active launch or production window.",
        },
        {
          heading: "Product feedback",
          body: "If something feels confusing or incomplete, tell us what you expected to happen, what actually happened, and which workflow you were trying to complete. That feedback directly informs product fixes.",
        },
      ]}
    />
  );
}
