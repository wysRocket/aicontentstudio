import { useMemo, useState, useEffect, type ElementType } from "react";
import { cn } from "../../lib/utils";
import {
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
  AtSign, // Using AtSign for Threads
  Hash, // Using Hash for TikTok
  Pin, // Using Pin for Pinterest
  Cloud, // Using Cloud for Bluesky
  Link2,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { db } from "../../firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { useFirebase } from "../../contexts/FirebaseContext";

interface SocialButtonProps {
  icon: ElementType;
  label: string;
  colorClass: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

function SocialButton({
  icon: Icon,
  label,
  colorClass,
  description,
  onClick,
  disabled,
  isLoading,
}: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl px-4 py-4 text-left text-white transition-transform active:scale-[0.99] hover:opacity-95",
        colorClass,
        (disabled || isLoading) &&
          "cursor-not-allowed opacity-60 active:scale-100",
      )}
    >
      <div className="mt-0.5 rounded-xl bg-white/15 p-2">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs leading-5 text-white/80">{description}</p>
      </div>
    </button>
  );
}

interface ConnectedAccount {
  id: string;
  platform: string;
  handle: string;
  name?: string;
  profilePicture?: string;
}

const PLATFORM_ICONS: Record<string, ElementType> = {
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Hash,
  pinterest: Pin,
  bluesky: Cloud,
  threads: AtSign,
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "text-black",
  linkedin: "text-[#0A66C2]",
  facebook: "text-[#1877F2]",
  instagram: "text-[#E1306C]",
  youtube: "text-[#FF0000]",
  tiktok: "text-black",
  pinterest: "text-[#E60023]",
  bluesky: "text-[#0085FF]",
  threads: "text-black",
};

export function Accounts() {
  const { user, isAuthReady } = useFirebase();
  const userId = user?.uid ?? null;
  const [connectedAccounts, setConnectedAccounts] = useState<
    ConnectedAccount[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isConnectingPlatform, setIsConnectingPlatform] = useState<
    string | null
  >(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">(
    "info",
  );

  const availablePlatforms = [
    {
      id: "twitter",
      icon: Twitter,
      label: "Login with Twitter",
      description: "Publish and reuse X content from your workspace.",
      colorClass: "bg-black",
    },
    {
      id: "linkedin",
      icon: Linkedin,
      label: "Login with LinkedIn",
      description: "Connect founder, brand, or company posting workflows.",
      colorClass: "bg-[#0A66C2]",
    },
    {
      id: "youtube",
      icon: Youtube,
      label: "Login with YouTube",
      description: "Manage video publishing and channel workflow setup.",
      colorClass: "bg-[#FF0000]",
    },
  ] as const;

  const upcomingPlatforms = [
    {
      icon: Facebook,
      label: "Login with Facebook",
      colorClass: "bg-[#1877F2]",
      description: "Page-level publishing support is planned.",
    },
    {
      icon: Hash,
      label: "Login with TikTok",
      colorClass: "bg-black",
      description: "Short-form publishing support is planned.",
    },
    {
      icon: Instagram,
      label: "Login with Instagram",
      colorClass: "bg-[#E1306C]",
      description: "Instagram workflow support is planned.",
    },
    {
      icon: AtSign,
      label: "Login with Threads",
      colorClass: "bg-black",
      description: "Threads publishing support is planned.",
    },
    {
      icon: Pin,
      label: "Login with Pinterest",
      colorClass: "bg-[#E60023]",
      description: "Pinterest distribution support is planned.",
    },
    {
      icon: Cloud,
      label: "Login with Bluesky",
      colorClass: "bg-[#0085FF]",
      description: "Bluesky workflow support is planned.",
    },
  ] as const;

  const connectedCount = connectedAccounts.length;
  const availableCount = availablePlatforms.length;
  const statusBannerClass =
    statusTone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : statusTone === "error"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
        : "border-[#7c5cff]/30 bg-[#7c5cff]/10 text-[#a78bfa]";

  const connectedPlatformNames = useMemo(
    () => connectedAccounts.map((account) => account.platform.toLowerCase()),
    [connectedAccounts],
  );

  // Wait for auth to be fully initialised before subscribing to Firestore.
  useEffect(() => {
    if (!isAuthReady || !userId) {
      if (isAuthReady) setLoading(false); // auth ready but not signed in
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, `users/${userId}/connectedAccounts`),
      (snapshot) => {
        const accounts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ConnectedAccount[];
        setConnectedAccounts(accounts);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching connected accounts:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isAuthReady, userId]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Allow same-origin popups (production), localhost, and run.app previews.
      const isSameOrigin = event.origin === window.location.origin;
      const isLocalhost = event.origin.includes("localhost");
      const isRunApp = event.origin.endsWith(".run.app");

      if (!isSameOrigin && !isLocalhost && !isRunApp) {
        return;
      }

      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const { provider, tokenData, profile } = event.data;

        if (!user) {
          console.error("User not authenticated");
          return;
        }

        try {
          const accountId = `${provider}_${profile.handle.replace(/[^a-zA-Z0-9]/g, "")}`;
          const accountRef = doc(
            db,
            `users/${user.uid}/connectedAccounts`,
            accountId,
          );

          await setDoc(accountRef, {
            userId: user.uid,
            platform: provider,
            handle: profile.handle,
            name: profile.name || profile.handle,
            profilePicture: profile.picture || "",
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || "",
            expiresAt: tokenData.expires_in
              ? Date.now() + tokenData.expires_in * 1000
              : null,
            createdAt: serverTimestamp(),
          });

          console.log(`Successfully connected ${provider}`);
          setStatusTone("success");
          setStatusMessage(`${provider} connected successfully.`);
        } catch (error) {
          console.error("Error saving connected account:", error);
          setStatusTone("error");
          setStatusMessage(`We couldn't save the ${provider} connection.`);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [user]);

  const handleConnect = async (provider: string) => {
    try {
      setIsConnectingPlatform(provider);
      setStatusMessage(null);
      const params = new URLSearchParams({ origin: window.location.origin });
      const response = await fetch(`/api/auth/${provider}/url?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to get auth URL for ${provider}`);
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        "oauth_popup",
        "width=600,height=700",
      );

      if (!authWindow) {
        setStatusTone("error");
        setStatusMessage(
          "Please allow popups for this site to connect your account.",
        );
      }
    } catch (error) {
      console.error(`Error connecting ${provider}:`, error);
      setStatusTone("error");
      setStatusMessage(
        `Could not connect to ${provider}. Please try again later.`,
      );
    } finally {
      setIsConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, `users/${user.uid}/connectedAccounts`, accountId),
      );
      setStatusTone("info");
      setStatusMessage("Account disconnected.");
    } catch (error) {
      console.error("Error disconnecting account:", error);
      setStatusTone("error");
      setStatusMessage("We couldn't disconnect that account right now.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/50">Connected now</p>
            <Link2 className="h-4 w-4 text-[#f48fb1]" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white">
            {connectedCount}
          </p>
          <p className="mt-2 text-sm text-white/50">
            active publishing integrations
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/50">Available today</p>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white">
            {availableCount}
          </p>
          <p className="mt-2 text-sm text-white/50">
            providers ready for connection
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/50">Connection note</p>
            <ShieldCheck className="h-4 w-4 text-[#a78bfa]" />
          </div>
          <p className="mt-4 text-base font-semibold tracking-[-0.02em] text-white">
            Connect from the right logged-in social account first
          </p>
          <p className="mt-2 text-sm text-white/50">
            This prevents mismatched OAuth sessions.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-medium",
            statusBannerClass,
          )}
        >
          {statusMessage}
        </div>
      )}

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Add a new account
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Connect channels your team actively publishes to so the workspace
              can route content where it needs to go.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            Log into the social platform before starting the connection flow.
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              Available today
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {availablePlatforms.map((platform) => (
                <SocialButton
                  key={platform.id}
                  icon={platform.icon}
                  label={platform.label}
                  description={platform.description}
                  colorClass={platform.colorClass}
                  onClick={() => handleConnect(platform.id)}
                  isLoading={isConnectingPlatform === platform.id}
                  disabled={connectedPlatformNames.includes(platform.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              Coming soon
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {upcomingPlatforms.map((platform) => (
                <SocialButton
                  key={platform.label}
                  icon={platform.icon}
                  label={platform.label}
                  description={platform.description}
                  colorClass={platform.colorClass}
                  disabled
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Connected accounts
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Review active identities connected to this workspace and
              disconnect any account you no longer want to use.
            </p>
          </div>
          <div className="text-sm text-white/50">
            {loading ? "Syncing accounts..." : `${connectedCount} connected`}
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-sm text-white/50">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#7c5cff]" />
                Loading connected accounts...
              </span>
            </div>
          ) : connectedAccounts.length > 0 ? (
            <div className="space-y-3">
              {connectedAccounts.map((account) => {
                const Icon = PLATFORM_ICONS[account.platform] || Twitter;
                const colorClass =
                  PLATFORM_COLORS[account.platform] || "text-white";

                return (
                  <div
                    key={account.id}
                    className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {account.profilePicture ? (
                        <img
                          src={account.profilePicture}
                          alt={account.handle}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                          <Icon className="h-5 w-5 text-white/40" />
                        </div>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Icon className={cn("h-4 w-4", colorClass)} />
                          <span className="font-semibold capitalize text-white">
                            {account.platform}
                          </span>
                          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                            Active
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-white/80">
                          {account.name || account.handle}
                        </p>
                        <p className="text-sm text-white/50">
                          {account.handle}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDisconnect(account.id)}
                      className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      Disconnect
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#f48fb1]">
                <Link2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                No accounts connected yet
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/50">
                Connect at least one publishing account to start routing content
                out of the workspace.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
