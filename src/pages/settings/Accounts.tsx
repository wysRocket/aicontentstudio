import React, { useState, useEffect } from 'react';
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
} from "lucide-react";
import { db, auth } from "../../firebase";
import { collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

interface SocialButtonProps {
  icon: React.ElementType;
  label: string;
  colorClass: string;
  onClick?: () => void;
  disabled?: boolean;
}

function SocialButton({ icon: Icon, label, colorClass, onClick, disabled }: SocialButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center w-full max-w-[280px] px-4 py-3 rounded-lg text-white font-semibold text-sm transition-transform active:scale-95 hover:opacity-90",
        colorClass,
        disabled && "opacity-50 cursor-not-allowed active:scale-100"
      )}
    >
      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
      {label}
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

const PLATFORM_ICONS: Record<string, React.ElementType> = {
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
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = onSnapshot(
      collection(db, `users/${auth.currentUser.uid}/connectedAccounts`),
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
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Allow localhost and run.app for the popup callback
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { provider, tokenData, profile } = event.data;
        
        if (!auth.currentUser) {
          console.error("User not authenticated");
          return;
        }

        try {
          const accountId = `${provider}_${profile.handle.replace(/[^a-zA-Z0-9]/g, '')}`;
          const accountRef = doc(db, `users/${auth.currentUser.uid}/connectedAccounts`, accountId);
          
          await setDoc(accountRef, {
            userId: auth.currentUser.uid,
            platform: provider,
            handle: profile.handle,
            name: profile.name || profile.handle,
            profilePicture: profile.picture || "",
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || "",
            expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null,
            createdAt: serverTimestamp(),
          });
          
          console.log(`Successfully connected ${provider}`);
        } catch (error) {
          console.error("Error saving connected account:", error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = async (provider: string) => {
    try {
      const response = await fetch(`/api/auth/${provider}/url`);
      if (!response.ok) {
        throw new Error(`Failed to get auth URL for ${provider}`);
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (error) {
      console.error(`Error connecting ${provider}:`, error);
      alert(`Could not connect to ${provider}. Please try again later.`);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/connectedAccounts`, accountId));
    } catch (error) {
      console.error("Error disconnecting account:", error);
    }
  };

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Add a new account</h2>
        <a href="#" className="text-sm text-gray-500 underline hover:text-gray-700 mb-6 inline-block">
          How do I connect my social account?
        </a>

        <div className="bg-orange-50 rounded-lg p-5 mb-8 border border-orange-100">
          <h3 className="text-orange-600 font-bold text-sm mb-2">Important</h3>
          <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
            <li>
              Log into your social account <strong>BEFORE</strong> connecting
            </li>
            <li>
              Facebook: select each Page individually, <strong>do not</strong> select "connect all pages"
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <SocialButton
            icon={Twitter}
            label="Login with Twitter"
            colorClass="bg-black"
            onClick={() => handleConnect('twitter')}
          />
          <SocialButton
            icon={Linkedin}
            label="Login with LinkedIn"
            colorClass="bg-[#0A66C2]"
            onClick={() => handleConnect('linkedin')}
          />
          <SocialButton
            icon={Facebook}
            label="Login with Facebook"
            colorClass="bg-[#1877F2]"
            disabled
          />
          <SocialButton
            icon={Hash}
            label="Login with Tiktok"
            colorClass="bg-black"
            disabled
          />
          <SocialButton
            icon={Instagram}
            label="Login with Instagram"
            colorClass="bg-[#E1306C]"
            disabled
          />
          <SocialButton
            icon={AtSign}
            label="Login with Threads"
            colorClass="bg-black"
            disabled
          />
          <SocialButton
            icon={Pin}
            label="Login with Pinterest"
            colorClass="bg-[#E60023]"
            disabled
          />
          <SocialButton
            icon={Cloud}
            label="Login with Bluesky"
            colorClass="bg-[#0085FF]"
            disabled
          />
          <SocialButton
            icon={Youtube}
            label="Login with YouTube"
            colorClass="bg-[#FF0000]"
            onClick={() => handleConnect('youtube')}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Connected accounts</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading connected accounts...</p>
        ) : connectedAccounts.length > 0 ? (
          <div className="space-y-4 max-w-2xl">
            {connectedAccounts.map((account) => {
              const Icon = PLATFORM_ICONS[account.platform] || Twitter;
              const colorClass = PLATFORM_COLORS[account.platform] || "text-gray-900";
              
              return (
                <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="flex items-center space-x-4">
                    {account.profilePicture ? (
                      <img src={account.profilePicture} alt={account.handle} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <Icon className={cn("w-4 h-4", colorClass)} />
                        <span className="font-semibold text-gray-900 capitalize">{account.platform}</span>
                      </div>
                      <p className="text-sm text-gray-500">{account.handle}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDisconnect(account.id)}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">You have not connected any accounts yet.</p>
        )}
      </section>
    </div>
  );
}
