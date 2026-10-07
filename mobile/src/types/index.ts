export type MilitaryRank =
  | "PVT"
  | "PFC"
  | "CPL"
  | "SGT"
  | "SSG"
  | "TSG"
  | "MSg"
  | "2LT"
  | "1LT"
  | "CPT"
  | "MAJ"
  | "LTC"
  | "COL"
  | "BGEN";

export type ReadinessState = "READY" | "STANDBY" | "UNAVAILABLE";

export interface TacticalAlert {
  id: string;
  originalIndex: number;
  timestamp: string;
  sender: string;
  message: string;
  level: "RED" | "YELLOW" | "INFO" | "TEST";
  isAcknowledged: boolean;
  acknowledgedAt?: string;
}

export interface SoldierProfile {
  rank: MilitaryRank;
  firstName: string;
  lastName: string;
  serialNumber: string; // AFPSN
  mobileNumber: string;
  unit: string; // e.g. 1001st CDC / 10RCDG HQ
  groupName: string; // e.g. Ready Reserve
  readiness: ReadinessState;
}
