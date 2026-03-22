import { useState } from "react";
import { cn } from "../lib/utils";
import { Accounts } from "./settings/Accounts";
import { Profile } from "./settings/Profile";

const tabs = [
  { id: "accounts", name: "Accounts" },
  { id: "brand", name: "My Brand" },
  { id: "api", name: "API" },
  { id: "profile", name: "Profile" },
  { id: "billing", name: "Billing" },
];

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-lg">
      <h2 className="text-xl text-gray-400">{title}</h2>
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState("accounts");

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
        {activeTab === "brand" && <Placeholder title="My Brand Settings" />}
        {activeTab === "api" && <Placeholder title="API Settings" />}
        {activeTab === "profile" && <Profile />}
        {activeTab === "billing" && <Placeholder title="Billing Settings" />}
      </div>
    </div>
  );
}
