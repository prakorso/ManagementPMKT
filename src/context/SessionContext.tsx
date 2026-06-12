import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '@/types';
import { useData } from '@/context/DataContext';
import {
  loadRoleAssignments,
  loadSession,
  saveRoleAssignments,
  saveSession,
  type SessionUser,
} from '@/auth/sessionStore';

interface SessionContextValue {
  session: SessionUser | null;
  /** All profiles available to sign in as (derived from the team + manager/VP). */
  profiles: SessionUser[];
  login: (user: SessionUser) => void;
  logout: () => void;
  /** Manager-assigned role per member id (Settings). */
  roleAssignments: Record<string, Role>;
  setRole: (memberId: string, role: Role) => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const MANAGER_ID = 'manager';
export const VP_ID = 'vp';

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data } = useData();
  const [session, setSession] = useState<SessionUser | null>(() => loadSession());
  const [roleAssignments, setRoleAssignments] = useState<Record<string, Role>>(() => loadRoleAssignments());

  const profiles = useMemo<SessionUser[]>(() => {
    if (!data) return [];
    const manager: SessionUser = { id: MANAGER_ID, name: data.program.managerName, role: 'manager' };
    const vp: SessionUser = { id: VP_ID, name: 'VP', role: 'vp' };
    const members: SessionUser[] = data.teamMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: roleAssignments[m.id] ?? 'member',
      memberId: m.id,
      email: m.email,
    }));
    return [manager, vp, ...members];
  }, [data, roleAssignments]);

  const login = useCallback((user: SessionUser) => {
    setSession(user);
    saveSession(user);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    saveSession(null);
  }, []);

  const setRole = useCallback(
    (memberId: string, role: Role) => {
      setRoleAssignments((prev) => {
        const next = { ...prev, [memberId]: role };
        saveRoleAssignments(next);
        return next;
      });
      // Keep the active session in sync if the manager re-roles the signed-in user.
      setSession((prev) => {
        if (prev && prev.memberId === memberId) {
          const updated = { ...prev, role };
          saveSession(updated);
          return updated;
        }
        return prev;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ session, profiles, login, logout, roleAssignments, setRole }),
    [session, profiles, login, logout, roleAssignments, setRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
