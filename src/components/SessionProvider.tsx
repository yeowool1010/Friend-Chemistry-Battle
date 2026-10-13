"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import {
  applyMinjiAnswers,
  assignBattle,
  beginAsGuest,
  getClientSnapshot,
  getServerSnapshot,
  setAnswer,
  startAsUser,
  submitMyAnswers,
  subscribeSession,
  updateSession,
} from "@/lib/session";
import { createDefaultSession } from "@/lib/sampleData";
import type { BattleSession } from "@/lib/types";

interface SessionContextValue {
  session: BattleSession;
  hydrated: boolean;
  startTest: (name: string) => void;
  joinTest: (name: string, battleId: string) => void;
  chooseAnswer: (questionId: string, choiceIndex: number) => void;
  fillMinjiAnswers: () => void;
  submitTest: () => BattleSession | null;
  rememberBattle: (battleId: string, role: "host" | "guest", inviteToken: string | null) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeSession, getClientSnapshot, getServerSnapshot);

  const value: SessionContextValue = {
    session: snapshot.session,
    hydrated: snapshot.hydrated,
    startTest: (name) => updateSession(startAsUser(name)),
    joinTest: (name, battleId) => updateSession(beginAsGuest(name, battleId)),
    chooseAnswer: (questionId, choiceIndex) => {
      updateSession(setAnswer(getClientSnapshot().session, questionId, choiceIndex));
    },
    fillMinjiAnswers: () => updateSession(applyMinjiAnswers(getClientSnapshot().session)),
    submitTest: () => {
      const next = submitMyAnswers(getClientSnapshot().session);
      if (!next) return null;
      updateSession(next);
      return next;
    },
    rememberBattle: (battleId, role, inviteToken) => {
      updateSession(assignBattle(getClientSnapshot().session, battleId, role, inviteToken));
    },
    reset: () => updateSession(createDefaultSession()),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("SessionProvider 안에서만 세션을 읽을 수 있습니다.");
  }
  return value;
}
