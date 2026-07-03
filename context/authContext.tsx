"use client";

import { WrapContext } from "@/utils/contexts";
import { createContext, FC, PropsWithChildren, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getUser, getUserByEmail, createUser } from "@/lib/services/userService";
import { AppUser } from "@/lib/types";

const AuthContext = createContext<{
  login?: (p: "google") => Promise<void>;
  logout?: () => void;
  user?: User;
  appUser?: AppUser;
  loading: boolean;
}>({ loading: true });

const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [appUser, setAppUser] = useState<AppUser | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user;
      if (currentUser) {
        setUser(currentUser);
        let existing = await getUser(currentUser.id);

        // Legacy Firebase users were migrated with their Firebase UID as id.
        // Supabase Auth assigns a new UUID, so we link by email and migrate
        // the public.users id (and all FK references) to the Supabase UUID.
        if (!existing && currentUser.email) {
          const legacy = await getUserByEmail(currentUser.email);
          if (legacy && legacy.id !== currentUser.id) {
            const { error: migrateError } = await supabase.rpc(
              "migrate_user_id",
              {
                old_id: legacy.id,
                new_id: currentUser.id,
              }
            );
            if (migrateError) {
              console.error("Failed to migrate legacy user id:", migrateError);
            }
            existing = await getUser(currentUser.id);
          }
        }

        if (!existing) {
          const metadata = currentUser.user_metadata;
          existing = await createUser(currentUser.id, {
            name:
              metadata?.full_name ??
              metadata?.name ??
              metadata?.display_name ??
              "Usuario",
            email: currentUser.email ?? "",
            photoURL:
              metadata?.avatar_url ??
              metadata?.picture ??
              metadata?.photo_url ??
              null,
          });
        }
        setAppUser(existing);
      } else {
        setUser(undefined);
        setAppUser(undefined);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (provider: "google") => {
    if (provider !== "google") return;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/home`,
      },
    });

    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ login, logout, user, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = WrapContext(AuthContext, "Auth");

export default AuthProvider;
