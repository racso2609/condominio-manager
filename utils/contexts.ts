import { Context, useContext } from "react";

export const WrapContext = <T>(c: Context<T>, name: string) => {
  return () => {
    const context = useContext(c);
    if (!context) throw new Error(`${name} should be inside provider`);
    return context;
  };
};
