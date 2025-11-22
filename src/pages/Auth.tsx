import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Receipt, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

const themes = [
  { name: "Ocean", gradient: "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600" },
  { name: "Sunset", gradient: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600" },
  { name: "Forest", gradient: "bg-gradient-to-br from-green-400 via-teal-500 to-blue-600" },
  { name: "Berry", gradient: "bg-gradient-to-br from-pink-400 via-rose-500 to-red-600" },
  { name: "Lavender", gradient: "bg-gradient-to-br from-purple-400 via-violet-500 to-indigo-600" },
  { name: "Mint", gradient: "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600" },
];

const Auth = () => {
  const navigate = useNavigate();
  const [currentTheme, setCurrentTheme] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const cycleTheme = () => {
    setCurrentTheme((prev) => (prev + 1) % themes.length);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-all duration-700 ${themes[currentTheme].gradient}`}>
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-white/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Theme switcher button */}
      <Button
        onClick={cycleTheme}
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
      >
        <Palette className="w-5 h-5" />
      </Button>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
            <Receipt className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">SplitBill</h1>
          <p className="text-white/90 drop-shadow">Split receipts fairly with your roommates</p>
          <p className="text-xs text-white/70 mt-2">Theme: {themes[currentTheme].name}</p>
        </div>
        
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(180 84% 45%)',
                    brandAccent: 'hsl(180 84% 35%)',
                  },
                },
              },
            }}
            providers={[]}
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;
