import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";
import {
  BadgeCheck,
  Building2,
  CreditCard,
  KeyRound,
  UserCircle2,
  Link2,
} from "lucide-react";
import { useFirebase } from "../contexts/FirebaseContext";
import { Accounts } from "./settings/Accounts";
import { Profile } from "./settings/Profile";
import { Brand } from "./settings/Brand";
import { Api } from "./settings/Api";
import { Billing } from "./settings/Billing";

const tabs = [
  {
    id: "accounts",
    name: "Accounts",
    description: "Connect social channels and manage active integrations.",
    icon: Link2,
  },
  {
    id: "brand",
    name: "My Brand",
    description: "Control voice, audience, CTA style, and tone guardrails.",
    icon: Building2,
  },
  {
    id: "api",
    name: "API",
    description:
      "Set model defaults, webhook endpoints, and integration preferences.",
    icon: KeyRound,
  },
  {
    id: "profile",
    name: "Profile",
    description: "Review personal account details and sign-out controls.",
    icon: UserCircle2,
  },
  {
    id: "billing",
    name: "Billing",
    description: "Track credit usage, top-up flows, and transaction history.",
    icon: CreditCard,
  },
];

export function Settings() {
  const { user } = useFirebase();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "accounts";
  const [activeTab, setActiveTab] = useState(initialTab);

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  return (
    <div className="w-full space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-black/8 bg-[linear-gradient(135deg,#17131d_0%,#2b2038_38%,#81566f_100%)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(23,19,29,0.2)] sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f8dce6]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Workspace settings
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-[2.35rem]">
              Settings hub
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
              Keep brand, integrations, profile controls, and credit management
              in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
              Signed in
            </p>
            <p className="mt-2 text-sm font-medium text-white/95">
              {user?.email || "Authenticated workspace user"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-black/8 bg-white p-4 shadow-sm sm:p-5">
        <nav
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
          aria-label="Settings tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition",
                  isActive
                    ? "border-[#8c5f74]/30 bg-[#fff4f8] text-[#17131d] shadow-sm"
                    : "border-black/8 bg-[#fcfaf7] text-[#6e5e58] hover:border-[#8c5f74]/20 hover:bg-white",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-[#8c3857]" : "text-[#8d7d74]",
                  )}
                />
                <p className="mt-2 text-sm font-semibold">{tab.name}</p>
                <p className="mt-1 text-xs leading-5 text-current/85">
                  {tab.description}
                </p>
              </button>
            );
          })}
        </nav>
      </section>

      <section className="rounded-[28px] border border-black/8 bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] p-5 shadow-sm sm:p-6">
        <div className="mb-6 border-b border-black/6 pb-4">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#17131d]">
            {activeTabMeta.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6e5e58]">
            {activeTabMeta.description}
          </p>
        </div>

        <div>
          {activeTab === "accounts" && <Accounts />}
          {activeTab === "brand" && <Brand />}
          {activeTab === "api" && <Api />}
          {activeTab === "profile" && <Profile />}
          {activeTab === "billing" && <Billing />}
        </div>
      </section>
    </div>
  );
}
