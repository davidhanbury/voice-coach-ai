import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if user already exists
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Sign in anonymously if no session exists
          await supabase.auth.signInAnonymously();
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  if (!isInitialized) {
    return null; // Or a loading spinner if you prefer
  }

  return <>{children}</>;
};
