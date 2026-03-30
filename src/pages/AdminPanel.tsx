import { BarChart3, Coins, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

const adminAreas = [
  {
    icon: Coins,
    title: "Credits and billing",
    description:
      "Review top-up workflows, manual credit requests, and balance-impacting operations.",
    href: "/dashboard/settings?tab=billing",
    cta: "Open billing",
  },
  {
    icon: Users,
    title: "Accounts and access",
    description:
      "Manage connected accounts, review profile settings, and prepare role-based controls.",
    href: "/dashboard/settings?tab=accounts",
    cta: "Open accounts",
  },
  {
    icon: LayoutDashboard,
    title: "Workspace operations",
    description:
      "Monitor the shared tool surfaces, saved runs, and help flows that shape the user experience.",
    href: "/dashboard",
    cta: "Open workspace",
  },
];

export default function AdminPanel() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(135deg,#17131d_0%,#251c35_42%,#7c5cff_100%)] px-6 py-7 text-white shadow-[0_24px_80px_rgba(23,19,29,0.22)] sm:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin panel
          </div>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[38px]">
            A single place to steer credits, access, and workspace operations.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/78 sm:text-[15px]">
            This is the first admin surface for the product. It gives the team a
            clear operational entry point now, while deeper permissions and
            site-wide controls can be expanded in the next pass.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminAreas.map((area) => (
            <Link
              key={area.title}
              to={area.href}
              className="rounded-[28px] border border-black/8 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(23,19,29,0.08)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6efff] text-[#7c5cff]">
                <area.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#17131d]">
                {area.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6e5e58]">
                {area.description}
              </p>
              <span className="mt-5 inline-flex text-sm font-semibold text-[#7c5cff]">
                {area.cta}
              </span>
            </Link>
          ))}
        </div>

        <aside className="rounded-[28px] border border-black/8 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c5f74]">
            <BarChart3 className="h-4 w-4" />
            Scope
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#17131d]">
            What this admin panel covers right now
          </h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[#6e5e58]">
            <p>Operational shortcuts into billing, accounts, and workspace monitoring.</p>
            <p>One visible admin destination in the authenticated shell instead of scattered settings links.</p>
            <p>Room for role-gated controls, site switches, and approval flows in the next phase.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
