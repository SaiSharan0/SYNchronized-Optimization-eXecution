import { useCallback, useEffect, useState } from "react";
import { Brain, CheckCircle, Key, RefreshCw, Shield, User } from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import { EmptyState, ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import { aiAPI, authAPI } from "../lib/api";
import { extractError, fmt } from "../lib/utils";

function Section({ icon: Icon, title, sub, children }) {
  return (
    <div className="card p-4 sm:p-6">
      <div className="mb-5 flex items-center gap-3 border-b border-dark-600 pb-4">
        <div className="rounded-lg border border-brand-200/20 bg-brand-200/10 p-2">
          <Icon size={15} className="text-brand-200" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-base font-bold">{title}</div>
          {sub && <div className="mt-0.5 text-xs text-dark-400">{sub}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const [profile, setProfile] = useState({ full_name: user?.full_name || "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadPage = useCallback(async () => {
    setPageLoading(true);
    setPageError("");
    if (!authLoading && user) {
      setProfile({ full_name: user.full_name || "" });
      setPageLoading(false);
      return;
    }
    if (!authLoading && !user) {
      setPageLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const { data } = await authAPI.updateMe(profile);
      updateUser(data);
      setSavedProfile(true);
      toast.success("Profile updated");
      setTimeout(() => setSavedProfile(false), 2200);
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setSavingProfile(false);
    }
  }

  async function runBatchAnalysis() {
    if (!user?.features?.ai_batch_analysis) {
      toast.error("Batch analysis is available on the Pro plan.");
      return;
    }
    setBatchLoading(true);
    try {
      const { data } = await aiAPI.batchAnalyze(20);
      toast.success(`AI analysed ${data.processed} trades`);
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setBatchLoading(false);
    }
  }

  const InfoRow = ({ label, value }) => (
    <div className="flex flex-col gap-1 border-b border-dark-700 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-dark-400">{label}</span>
      <span className="break-all font-mono text-sm text-dark-100">{value}</span>
    </div>
  );

  return (
    <Layout title="Settings">
      {pageLoading ? (
        <LoadingState label="Loading settings..." />
      ) : pageError ? (
        <ErrorState title="Settings unavailable" message={pageError} onRetry={loadPage} />
      ) : !user ? (
        <EmptyState title="No profile" message="Sign in again to manage settings." />
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-sub">Account, AI controls, and system details</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-brand-200/30 bg-brand-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200">
                {user?.plan || "free"} Plan
              </div>
              <div className="inline-flex rounded-full border border-dark-600 bg-dark-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-dark-200">
                {user?.role || "user"}
              </div>
            </div>
          </div>

          <Section icon={User} title="Profile" sub="Update your display name and account info">
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">Username</label>
                <input value={user?.username || ""} disabled className="input cursor-not-allowed opacity-50" />
              </div>
              <div>
                <label className="label">Email address</label>
                <input value={user?.email || ""} disabled className="input cursor-not-allowed opacity-50" />
              </div>
              <div>
                <label className="label">Full Name</label>
                <input
                  value={profile.full_name}
                  onChange={(event) => setProfile({ full_name: event.target.value })}
                  className="input"
                  placeholder="Your full name"
                />
              </div>
              <div className="flex justify-end">
                <button onClick={saveProfile} disabled={savingProfile} className="btn-success justify-center disabled:opacity-60">
                  {savingProfile ? (
                    <><RefreshCw size={13} className="animate-spin" />Saving...</>
                  ) : savedProfile ? (
                    <><CheckCircle size={13} />Saved</>
                  ) : "Save Profile"}
                </button>
              </div>
            </div>
          </Section>

          {(user?.role === "admin" || user?.features?.system_config) && (
            <Section icon={Key} title="Backend Environment" sub="Admin-only setup reference">
              <div className="flex flex-col gap-3 text-sm">
                {[
                  ["DATABASE_URL", "postgresql+asyncpg://...", "Neon/PostgreSQL connection"],
                  ["OPENAI_API_KEY", "sk-xxxxxxxxxxxxxxxx", "AI trade analysis"],
                  ["JWT_SECRET_KEY", "random-32-char-string", "Token signing key"],
                  ["GOOGLE_CLIENT_ID", "xxxxx.apps.googleusercontent.com", "Google Sign-In"],
                  ["ALLOWED_ORIGINS", '["http://localhost:3000"]', "CORS allowed origins"],
                ].map(([key, placeholder, desc]) => (
                  <div key={key} className="card2 p-3">
                    <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <code className="font-mono text-xs text-brand-200">{key}</code>
                      <span className="text-xs text-dark-500">{desc}</span>
                    </div>
                    <div className="truncate rounded bg-dark-900 px-2 py-1 font-mono text-xs text-dark-400">{placeholder}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-400">
                Update backend/.env and restart backend to apply changes.
              </div>
            </Section>
          )}

          <Section icon={Brain} title="AI Analysis Tools" sub="Manage AI feedback on your trade journal">
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-dark-400">
                When you save a trade, AI analysis runs automatically if an OpenAI key is configured.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={runBatchAnalysis}
                  disabled={batchLoading || !user?.features?.ai_batch_analysis}
                  className="btn-success justify-center disabled:opacity-60"
                >
                  <Brain size={13} />{batchLoading ? "Analysing..." : "Batch Analyse 20 Trades"}
                </button>
                {!user?.features?.ai_batch_analysis && (
                  <span className="text-xs text-amber-400">Upgrade to Pro to unlock batch AI analysis.</span>
                )}
              </div>
            </div>
          </Section>

          <Section icon={Shield} title="Account Information" sub="Read-only account details">
            <InfoRow label="User ID" value={`#${user?.id}`} />
            <InfoRow label="Username" value={user?.username} />
            <InfoRow label="Email" value={user?.email} />
            <InfoRow label="Account Created" value={fmt.date(user?.created_at)} />
            <InfoRow label="Status" value={user?.is_active ? "Active" : "Disabled"} />
          </Section>
        </div>
      )}
    </Layout>
  );
}
