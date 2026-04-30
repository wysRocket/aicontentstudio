import { FormEvent, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useFirebase } from "../contexts/FirebaseContext";
import { cn } from "../lib/utils";

type AuthMode = "signin" | "signup";
type SubmitAction = "signin" | "signup" | "google" | null;

interface SignInFormState {
  email: string;
  password: string;
}

interface SignUpFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function getFriendlyAuthError(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong while connecting to Firebase. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password to continue.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "That email or password does not match an existing account.";
    case "auth/email-already-in-use":
      return "This email is already in use. Sign in instead or use a different address.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished. Try Google sign-in again.";
    case "auth/popup-blocked":
      return "Your browser blocked Google sign-in. Try again in a full browser window.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Auth yet.";
    case "auth/operation-not-allowed":
      return "This sign-in method is disabled in Firebase Console.";
    case "auth/network-request-failed":
      return "Network request failed. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts were made. Wait a moment and try again.";
    default:
      return "Authentication failed. Please try again.";
  }
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M21.35 11.1H12v2.98h5.33c-.23 1.5-1.97 4.4-5.33 4.4-3.2 0-5.8-2.65-5.8-5.92s2.6-5.92 5.8-5.92c1.82 0 3.05.77 3.75 1.44l2.56-2.48C16.67 4.05 14.53 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9c5.2 0 8.63-3.65 8.63-8.8 0-.59-.06-1.04-.14-1.48Z"
        fill="#4285F4"
      />
      <path
        d="M3 7.23 5.72 9.2C6.46 7.36 8.08 6.08 12 6.08c1.82 0 3.05.77 3.75 1.44l2.56-2.48C16.67 4.05 14.53 3 12 3 8.04 3 4.62 5.24 3 8.53Z"
        fill="#34A853"
      />
      <path
        d="M12 21c2.46 0 4.53-.81 6.04-2.2l-2.79-2.29c-.75.53-1.77.9-3.25.9-3.35 0-5.07-2.86-5.31-4.35L3.02 15.1C4.63 18.44 8.02 21 12 21Z"
        fill="#FBBC05"
      />
      <path
        d="M6.69 13.06A5.65 5.65 0 0 1 6.39 12c0-.37.11-.73.3-1.06L3.97 8.96A8.98 8.98 0 0 0 3 12c0 1.44.34 2.8.97 4.04Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [signInForm, setSignInForm] = useState<SignInFormState>({
    email: "",
    password: "",
  });
  const [signUpForm, setSignUpForm] = useState<SignUpFormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [submitAction, setSubmitAction] = useState<SubmitAction>(null);
  const { user, isAuthReady, signInWithEmail, signUpWithEmail, signInWithGoogle } = useFirebase();
  const navigate = useNavigate();
  const location = useLocation();

  const mode: AuthMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const redirectTarget = useMemo(() => {
    const state = location.state as
      | {
          from?: {
            pathname?: string;
            search?: string;
            hash?: string;
          };
        }
      | null;

    const from = state?.from;
    if (!from?.pathname) {
      return "/dashboard";
    }

    return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
  }, [location.state]);

  useEffect(() => {
    if (!isAuthReady) return;
    if (user) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthReady, navigate, redirectTarget, user]);

  useEffect(() => {
    setErrorMessage("");
    setSubmitAction(null);
  }, [mode]);

  const switchMode = (nextMode: AuthMode) => {
    setSearchParams({ mode: nextMode }, { replace: true });
  };

  const validateSignIn = () => {
    if (!signInForm.email.trim()) {
      return "Enter your email to sign in.";
    }
    if (!signInForm.password) {
      return "Enter your password to sign in.";
    }
    return "";
  };

  const validateSignUp = () => {
    if (!signUpForm.name.trim()) {
      return "Enter your name to create an account.";
    }
    if (!signUpForm.email.trim()) {
      return "Enter your email to create an account.";
    }
    if (signUpForm.password.length < 6) {
      return "Password must be at least 6 characters long.";
    }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      return "Passwords do not match.";
    }
    return "";
  };

  const handleSignInSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateSignIn();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitAction("signin");
    setErrorMessage("");

    try {
      await signInWithEmail(signInForm.email.trim(), signInForm.password);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setSubmitAction(null);
    }
  };

  const handleSignUpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateSignUp();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitAction("signup");
    setErrorMessage("");

    try {
      await signUpWithEmail(signUpForm.name.trim(), signUpForm.email.trim(), signUpForm.password);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setSubmitAction(null);
    }
  };

  const handleGoogleSubmit = async () => {
    setSubmitAction("google");
    setErrorMessage("");

    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
      setSubmitAction(null);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="auth-shell min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(237,96,91,0.32),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(117,87,255,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
            <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/[0.86] transition hover:border-white/20 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="hidden text-xs uppercase tracking-[0.32em] text-white/40 md:block">
            Firebase Auth Enabled
          </div>
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.2fr_0.95fr]">
          <section className="auth-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="absolute inset-y-0 right-0 hidden w-px bg-white/10 lg:block" />
            <div className="flex h-full flex-col justify-between gap-10">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/70">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Content Studio
                </div>

                <div className="max-w-2xl space-y-5">
                  <p className="text-sm uppercase tracking-[0.32em] text-[#ffb2a8]">
                    Access the studio
                  </p>
                  <h1 className="max-w-[12ch] text-4xl font-semibold leading-[0.92] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                    Bring your content workflow into one calm place.
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                    Sign in to manage prompts, videos, credit usage, and connected accounts without
                    bouncing between tools.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Prompts", value: "Ready", note: "Structured prompt library" },
                    { label: "Credits", value: "Tracked", note: "Visible usage and balance" },
                    { label: "Accounts", value: "Linked", note: "Social destinations in one place" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-3xl border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    >
                      <div className="text-xs uppercase tracking-[0.25em] text-white/[0.45]">{item.label}</div>
                      <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                        {item.value}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/[0.55]">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Secure Firebase Authentication with Google and email/password.",
                  "Automatic profile bootstrap with starter credits on first login.",
                  "Protected routes send you back to the screen you originally wanted.",
                  "A dedicated auth surface that keeps the marketing page intact.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/[0.72]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8d7b]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative flex items-stretch">
            <div className="auth-card relative w-full overflow-hidden rounded-[2rem] border border-white/12 bg-[#f5efe7] text-[#16131f] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0))]" />

              <div className="relative flex h-full flex-col p-6 sm:p-8">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-[#7a665f]">Welcome</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                      {mode === "signin" ? "Sign in" : "Create account"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/70 p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => switchMode("signin")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition",
                        mode === "signin" ? "bg-[#16131f] text-white shadow-sm" : "text-[#5f5450]"
                      )}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition",
                        mode === "signup" ? "bg-[#16131f] text-white shadow-sm" : "text-[#5f5450]"
                      )}
                    >
                      Sign up
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSubmit}
                  disabled={submitAction !== null}
                  className="flex items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold text-[#17131d] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fffaf7] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <GoogleMark />
                  {submitAction === "google"
                    ? "Connecting to Google..."
                    : mode === "signin"
                      ? "Continue with Google"
                      : "Sign up with Google"}
                </button>

                <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-[#8e7f78]">
                  <div className="h-px flex-1 bg-black/10" />
                  Or use email
                  <div className="h-px flex-1 bg-black/10" />
                </div>

                {errorMessage ? (
                  <div className="mb-5 rounded-2xl border border-[#ffbea8] bg-[#fff0ea] px-4 py-3 text-sm text-[#7b3721]" aria-live="polite">
                    {errorMessage}
                  </div>
                ) : null}

                {mode === "signin" ? (
                  <form className="space-y-4" onSubmit={handleSignInSubmit}>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#453833]">Email</span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={signInForm.email}
                        onChange={(event) =>
                          setSignInForm((current) => ({ ...current, email: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5 text-base outline-none transition placeholder:text-[#9c8f87] focus:border-[#16131f] focus:bg-white"
                        placeholder="you@company.com"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#453833]">Password</span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={signInForm.password}
                        onChange={(event) =>
                          setSignInForm((current) => ({ ...current, password: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5 text-base outline-none transition placeholder:text-[#9c8f87] focus:border-[#16131f] focus:bg-white"
                        placeholder="Enter your password"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={submitAction !== null}
                      className="mt-2 w-full rounded-2xl bg-[#16131f] px-4 py-3.5 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#221c30] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitAction === "signin" ? "Signing in..." : "Sign in to dashboard"}
                    </button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleSignUpSubmit}>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#453833]">Your name</span>
                      <input
                        type="text"
                        autoComplete="name"
                        value={signUpForm.name}
                        onChange={(event) =>
                          setSignUpForm((current) => ({ ...current, name: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5 text-base outline-none transition placeholder:text-[#9c8f87] focus:border-[#16131f] focus:bg-white"
                        placeholder="Jane Smith"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#453833]">Email</span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={signUpForm.email}
                        onChange={(event) =>
                          setSignUpForm((current) => ({ ...current, email: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5 text-base outline-none transition placeholder:text-[#9c8f87] focus:border-[#16131f] focus:bg-white"
                        placeholder="you@company.com"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-[#453833]">Password</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={signUpForm.password}
                          onChange={(event) =>
                            setSignUpForm((current) => ({ ...current, password: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5 text-base outline-none transition placeholder:text-[#9c8f87] focus:border-[#16131f] focus:bg-white"
                          placeholder="At least 6 characters"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-[#453833]">Confirm password</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={signUpForm.confirmPassword}
                          onChange={(event) =>
                            setSignUpForm((current) => ({
                              ...current,
                              confirmPassword: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5 text-base outline-none transition placeholder:text-[#9c8f87] focus:border-[#16131f] focus:bg-white"
                          placeholder="Repeat password"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitAction !== null}
                      className="mt-2 w-full rounded-2xl bg-[#16131f] px-4 py-3.5 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#221c30] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitAction === "signup" ? "Creating account..." : "Create account"}
                    </button>
                  </form>
                )}

                <div className="mt-auto pt-8">
                  <div className="rounded-[1.75rem] border border-black/10 bg-white/[0.45] p-4 text-sm text-[#5b4d48] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#16131f]" />
                      <div>
                        <p className="font-semibold text-[#17131d]">What happens after login?</p>
                        <p className="mt-1 leading-6">
                          Your Firebase account is used to create a personal profile document and
                          route you into the dashboard with your starter credit balance.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-center text-sm text-[#6d605a]">
                    {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
                    <button
                      type="button"
                      onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                      className="font-semibold text-[#16131f] underline decoration-black/25 underline-offset-4"
                    >
                      {mode === "signin" ? "Create one here" : "Sign in instead"}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
