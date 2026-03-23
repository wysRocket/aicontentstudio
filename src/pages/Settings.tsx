import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";
import { Accounts } from "./settings/Accounts";
import { Profile } from "./settings/Profile";
import { Brand } from "./settings/Brand";
import { Api } from "./settings/Api";
import { Billing } from "./settings/Billing";

const tabs = [
  { id: "accounts", name: "Accounts" },
  { id: "brand", name: "My Brand" },
  { id: "api", name: "API" },
  { id: "profile", name: "Profile" },
  { id: "billing", name: "Billing" },
];

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "accounts";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
              )}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === "accounts" && <Accounts />}
        {activeTab === "brand" && <Brand />}
        {activeTab === "api" && <Api />}
        {activeTab === "profile" && <Profile />}
        {activeTab === "billing" && <Billing />}
      </div>
    </div>
  );
}
