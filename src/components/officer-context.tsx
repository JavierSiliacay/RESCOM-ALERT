"use client";

import React, { createContext, useContext } from "react";

export interface CurrentOfficer {
  name: string;
  email: string;
  rank: string;
  role: string;
  displayName: string; // e.g. "Maj. Juan Dela Cruz" or "Juan Dela Cruz"
}

const OfficerContext = createContext<CurrentOfficer>({
  name: "Authorized Officer",
  email: "",
  rank: "",
  role: "ADMIN",
  displayName: "Authorized Officer",
});

export function OfficerProvider({
  officer,
  children,
}: {
  officer: CurrentOfficer;
  children: React.ReactNode;
}) {
  return (
    <OfficerContext.Provider value={officer}>
      {children}
    </OfficerContext.Provider>
  );
}

export function useCurrentOfficer() {
  return useContext(OfficerContext);
}
