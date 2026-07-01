"use client";

import { WrapContext } from "@/utils/contexts";
import { createContext, FC, PropsWithChildren, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@/firebase";
import { getUser, createUser } from "@/lib/services/userService";
import { AppUser } from "@/lib/types";

const AuthContext = createContext<{
  login?: (p: "google") => Promise<void>;
  logout?: () => void;
  user?: User;
  appUser?: AppUser;
  loading: boolean;
}>({ loading: true });

const TOKEN_KEY = "token";
const googleProvider = new GoogleAuthProvider();

const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [appUser, setAppUser] = useState<AppUser | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        let existing = await getUser(firebaseUser.uid);
        if (!existing) {
          existing = await createUser(firebaseUser.uid, {
            name: firebaseUser.displayName ?? "Usuario",
            email: firebaseUser.email ?? "",
            photoURL: firebaseUser.photoURL,
          });
        }
        setAppUser(existing);
      } else {
        setUser(undefined);
        setAppUser(undefined);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (provider: "google") => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (token) localStorage.setItem(TOKEN_KEY, token);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ login, logout, user, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = WrapContext(AuthContext, "Auth");

export default AuthProvider;
