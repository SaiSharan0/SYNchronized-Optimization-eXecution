import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { extractError } from "../lib/utils";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function RegisterPage() {
  const { register, googleLogin } = useAuth();
  const { isLight, toggleTheme } = useTheme();
  const router       = useRouter();
  const [form,    setForm]    = useState({ email: "", username: "", full_name: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) return toast.error("Fill required fields");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (form.password !== form.confirm) return toast.error("Passwords do not match");

    setLoading(true);
    try {
      await register({
        email:     form.email,
        username:  form.username,
        full_name: form.full_name,
        password:  form.password,
      });
      toast.success("Account created. Welcome to SYNOX");
      router.push("/");
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(credential) {
    await googleLogin(credential);
    toast.success("Signed in with Google");
    router.push("/");
  }

  return (
    <>
      <Head><title>Register - SYNOX</title></Head>
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <button type="button" onClick={toggleTheme} className="btn-primary fixed right-4 top-4 px-3 py-2">
          {isLight ? "Dark" : "Light"}
        </button>
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-200 to-emerald-400 flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={28} className="text-white" />
            </div>
            <h1 className="font-display font-extrabold text-2xl text-white">Create Account</h1>
            <p className="text-dark-400 text-sm mt-2">Build your trading performance system.</p>
          </div>

          <div className="card p-8">
            <GoogleSignInButton onCredential={handleGoogle} label="Sign up with Google" />
            <div className="my-5 flex items-center gap-3 text-xs text-dark-400">
              <span className="h-px flex-1 bg-dark-600" />
              or create with email
              <span className="h-px flex-1 bg-dark-600" />
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="label">Full Name</label>
                <input type="text" value={form.full_name} onChange={set("full_name")} className="input" placeholder="John Doe" />
              </div>
              <div>
                <label className="label">Username *</label>
                <input type="text" value={form.username} onChange={set("username")} className="input" placeholder="johndoe" required />
              </div>
              <div>
                <label className="label">Email address *</label>
                <input type="email" value={form.email} onChange={set("email")} className="input" placeholder="trader@example.com" required />
              </div>
              <div>
                <label className="label">Password * (min 8 chars)</label>
                <input type="password" value={form.password} onChange={set("password")} className="input" placeholder="Strong password" required />
              </div>
              <div>
                <label className="label">Confirm Password *</label>
                <input type="password" value={form.confirm} onChange={set("confirm")} className="input" placeholder="Repeat password" required />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-success justify-center py-3 mt-2 disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="text-center text-dark-400 text-sm mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-200 hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
