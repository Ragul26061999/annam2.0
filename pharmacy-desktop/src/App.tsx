import { RouterProvider } from "react-router-dom";
import { useEffect, useState } from "react";
import { startBackgroundSync } from "./lib/sync";
import { supabase } from "./lib/supabase";
import { router } from "./router";
import { LoginPage } from "./pages/auth/LoginPage";

function App() {
  // null = checking, false = not logged in, true = logged in
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Check existing session immediately
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session?.user);
    });

    // 2. Listen for auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authed) {
      startBackgroundSync();
    }
  }, [authed]);

  // Loading splash while checking session
  if (authed === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/logo/annamHospital-bg.png"
            alt="Annam"
            className="h-20 w-20 object-contain bg-white rounded-2xl p-1 shadow-2xl"
          />
          <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        </div>
      </div>
    );
  }

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return <RouterProvider router={router} />;
}

export default App;
