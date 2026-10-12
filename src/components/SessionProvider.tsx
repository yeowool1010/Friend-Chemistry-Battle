"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  applyMinjiAnswers,
  getClientSnapshot,
  getServerSnapshot,
  loadSamplePair,
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
  chooseAnswer: (questionId: string, choiceIndex: number) => void;
  fillMinjiAnswers: () => void;
  submitTest: () => boolean;
  showSamplePair: () => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeSession, getClientSnapshot, getServerSnapshot);

  const value: SessionContextValue = {
    session: snapshot.session,
    hydrated: snapshot.hydrated,
    startTest: (name) => updateSession(startAsUser(name)),
    chooseAnswer: (questionId, choiceIndex) => {
      updateSession(setAnswer(getClientSnapshot().session, questionId, choiceIndex));
    },
    fillMinjiAnswers: () => updateSession(applyMinjiAnswers(getClientSnapshot().session)),
    submitTest: () => {
      const next = submitMyAnswers(getClientSnapshot().session);
      if (!next) return false;
      updateSession(next);
      return true;
    },
    showSamplePair: () => updateSession(loadSamplePair()),
    reset: () => updateSession(createDefaultSession()),
  };

  return (
    <SessionContext.Provider value={value}>
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
        <AppHeader />
        <div className="flex-1">{children}</div>
      </div>
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("SessionProvider 안에서만 세션을 읽을 수 있습니다.");
  }
  return value;
}
