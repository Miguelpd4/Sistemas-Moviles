import { useContext } from 'react';

import { SessionContext, type SessionContextValue } from '@/context/SessionProvider';

/** La sala actual. Solo dentro de <SessionProvider>. */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) throw new Error('useSession se ha usado fuera de <SessionProvider>.');
  return value;
}
