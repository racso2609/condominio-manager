"use client";

import { WrapContext } from "@/utils/contexts";
import { createContext, FC, PropsWithChildren, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "../firebase";
const AuthContext = createContext<{
  login?: (p: "google") => Promise<void>;
  logout?: () => void;
  user?: User;
}>({});
const TOKEN_KEY = "token";

const googleProvider = new GoogleAuthProvider();

const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | undefined>(undefined);
  const login = async (provider: "google") => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential) throw new Error("Login not available");
    const token = credential.accessToken;
    // The signed-in user info.
    const user = result.user;
    setUser(user);
    if (token) localStorage.setItem(TOKEN_KEY, token);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = WrapContext(AuthContext, "Auth");

export default AuthProvider;
