"use client";

import { createContext, useContext } from "react";

const SuperuserContext = createContext(false);

export function SuperuserProvider({
  initialIsSuperuser,
  children,
}: {
  initialIsSuperuser: boolean;
  children: React.ReactNode;
}) {
  return (
    <SuperuserContext.Provider value={initialIsSuperuser}>
      {children}
    </SuperuserContext.Provider>
  );
}

export function useInitialIsSuperuser(): boolean {
  return useContext(SuperuserContext);
}
