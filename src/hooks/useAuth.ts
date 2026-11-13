import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '@/context/AuthProvider';

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error('useAuth se ha usado fuera de <AuthProvider>.');
  }
  return value;
}
