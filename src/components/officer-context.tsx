"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ViewerRestrictedModal } from "./viewer-restricted-modal";

export interface CurrentOfficer {
  name: string;
  email: string;
  rank: string;
  role: string;
  displayName: string; // e.g. "Maj. Juan Dela Cruz" or "Juan Dela Cruz"
  isViewer: boolean;
  canEdit: boolean;
  guardAction: (actionLabel: string, actionCallback?: () => void) => boolean;
  showViewerModal: (actionLabel: string) => void;
  closeViewerModal: () => void;
}

const defaultContextValue: CurrentOfficer = {
  name: "Authorized Officer",
  email: "",
  rank: "",
  role: "ADMIN",
  displayName: "Authorized Officer",
  isViewer: false,
  canEdit: true,
  guardAction: (_actionLabel: string, actionCallback?: () => void) => {
    if (actionCallback) actionCallback();
    return true;
  },
  showViewerModal: () => {},
  closeViewerModal: () => {},
};

const OfficerContext = createContext<CurrentOfficer>(defaultContextValue);

export function OfficerProvider({
  officer,
  children,
}: {
  officer: {
    name: string;
    email: string;
    rank: string;
    role: string;
    displayName: string;
  };
  children: React.ReactNode;
}) {
  // Reactive Convex query: Real-time synchronization of officer role and clearance
  const liveAuth = useQuery(
    api.access.checkByEmail,
    officer?.email ? { email: officer.email } : "skip"
  );

  // Restriction modal state hosted globally for all dashboard pages
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    actionLabel: string;
  }>({
    isOpen: false,
    actionLabel: "",
  });

  // Calculate live dynamic clearance
  const liveUser = liveAuth?.user;
  const effectiveRole = liveUser?.role || officer.role || "VIEWER";
  const effectiveName = liveUser?.name || officer.name;
  const effectiveRank = liveUser?.rank || officer.rank;
  const effectiveEmail = officer.email || liveUser?.email || "";

  const effectiveDisplayName = useMemo(() => {
    if (effectiveRank && effectiveRank !== "Staff Officer" && effectiveRank !== "Personnel Officer") {
      return `${effectiveRank} ${effectiveName}`;
    }
    return effectiveName;
  }, [effectiveRank, effectiveName]);

  const isViewer = effectiveRole === "VIEWER";
  const canEdit =
    !isViewer &&
    (effectiveRole === "DEVELOPER" ||
      effectiveRole === "COMMANDER" ||
      effectiveRole === "ADMIN" ||
      effectiveRole === "OPERATOR");

  const showViewerModal = (actionLabel: string) => {
    setModalState({ isOpen: true, actionLabel });
  };

  const closeViewerModal = () => {
    setModalState({ isOpen: false, actionLabel: "" });
  };

  /**
   * Action Guard:
   * If the current user's role is VIEWER, prevents execution and triggers the
   * ViewerRestrictedModal popup. Otherwise, invokes the action callback.
   */
  const guardAction = (actionLabel: string, actionCallback?: () => void): boolean => {
    if (isViewer) {
      showViewerModal(actionLabel);
      return false;
    }
    if (actionCallback) {
      actionCallback();
    }
    return true;
  };

  const contextValue: CurrentOfficer = useMemo(
    () => ({
      name: effectiveName,
      email: effectiveEmail,
      rank: effectiveRank,
      role: effectiveRole,
      displayName: effectiveDisplayName,
      isViewer,
      canEdit,
      guardAction,
      showViewerModal,
      closeViewerModal,
    }),
    [
      effectiveName,
      effectiveEmail,
      effectiveRank,
      effectiveRole,
      effectiveDisplayName,
      isViewer,
      canEdit,
    ]
  );

  return (
    <OfficerContext.Provider value={contextValue}>
      {children}
      <ViewerRestrictedModal
        isOpen={modalState.isOpen}
        onClose={closeViewerModal}
        actionLabel={modalState.actionLabel}
        officerName={effectiveName}
        officerEmail={effectiveEmail}
        officerRole={effectiveRole}
      />
    </OfficerContext.Provider>
  );
}

export function useCurrentOfficer() {
  return useContext(OfficerContext);
}
