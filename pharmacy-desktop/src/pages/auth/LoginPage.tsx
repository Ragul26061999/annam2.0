import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let loginEmail = email.trim();
      // Support mobile number login (same logic as web app)
      if (/^\d+$/.test(loginEmail)) {
        loginEmail = `${loginEmail}@annammultispecialityhospital.com`;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError) {
        setError(authError.message || "Failed to sign in");
        return;
      }

      if (data?.user) {
        onLogin();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center p-6">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-orange-700/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* White card — same as web app */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl transition-all duration-300">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4 transition-transform duration-300 hover:scale-105">
              <img
                src="/logo/annamHospital-bg.png"
                alt="Annam Hospital"
                className="h-28 w-28 object-contain drop-shadow-lg"
                onError={(e) => {
                  // Fallback pill icon if logo not found
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                  el.nextElementSibling?.removeAttribute("style");
                }}
              />
              {/* Fallback icon (hidden when logo loads) */}
              <div
                style={{ display: "none" }}
                className="h-28 w-28 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg"
              >
                <span className="text-4xl font-bold text-white">A</span>
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Annam Healthcare</h1>
            <p className="mt-1 text-sm text-gray-400">Pharmacy Desktop</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-shake">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email or Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail
                    className={`h-5 w-5 transition-colors duration-200 ${
                      focusedField === "email" ? "text-orange-500" : "text-gray-400"
                    }`}
                  />
                </div>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl
                             text-gray-900 placeholder-gray-400 text-sm
                             focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400
                             hover:bg-gray-100 transition-all duration-200"
                  placeholder="user@example.com or 9876543210"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock
                    className={`h-5 w-5 transition-colors duration-200 ${
                      focusedField === "password" ? "text-orange-500" : "text-gray-400"
                    }`}
                  />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl
                             text-gray-900 placeholder-gray-400 text-sm
                             focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400
                             hover:bg-gray-100 transition-all duration-200"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-orange-500 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-orange-500 border-gray-300 focus:ring-orange-400 accent-orange-500"
                />
                <span className="text-sm text-gray-700 font-medium">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-orange-500 hover:text-orange-600 font-semibold transition-colors duration-200 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed
                         text-white font-bold py-3.5 px-8 rounded-2xl
                         transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="h-4 w-4 rounded-full border-2 border-orange-200 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Annam Multispeciality Hospital · Pharmacy v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
