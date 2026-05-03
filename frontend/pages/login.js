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

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const { isLight, toggleTheme } = useTheme();
  const router    = useRouter();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("Fill all fields");
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
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
      <Head><title>Sign In - SYNOX</title></Head>
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
            <h1 className="font-display font-extrabold text-2xl text-white">SYNOX</h1>
            <p className="text-dark-400 text-sm mt-2">Focused execution, measurable edge.</p>
          </div>

          {/* Card */}
          <div className="card p-8">
            <h2 className="font-display font-bold text-lg text-white mb-6">Sign In</h2>
            <GoogleSignInButton onCredential={handleGoogle} />
            <div className="my-5 flex items-center gap-3 text-xs text-dark-400">
              <span className="h-px flex-1 bg-dark-600" />
              or sign in with email
              <span className="h-px flex-1 bg-dark-600" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email" value={form.email} onChange={set("email")}
                  className="input" placeholder="trader@example.com" autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password" value={form.password} onChange={set("password")}
                  className="input" placeholder="Your password" autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-success justify-center py-3 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-dark-400 text-sm mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-brand-200 hover:underline font-medium">
                Register
              </Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
