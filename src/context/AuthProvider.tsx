import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AppError, toAppError, toAuthError } from '@/lib/errors';
import { normalizePaypal, normalizePhone } from '@/lib/profileForm';
import { supabase } from '@/services/supabase/client';
import type { ProfileRow } from '@/types/database';

export type ProfilePatch = Partial<
  Pick<ProfileRow, 'display_name' | 'avatar_kind' | 'avatar_value' | 'phone' | 'paypal_username'>
>;

export type SignUpDriverInput = {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  paypalUsername?: string;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  /** true hasta saber si hay sesión guardada. */
  loading: boolean;
  /** Sin sesión o con sesión anónima (pasajero). */
  isAnonymous: boolean;
  /** Inicia sesión anónima si no hay ninguna. Devuelve el usuario. */
  ensureAnonymous: () => Promise<User>;
  signUpDriver: (input: SignUpDriverInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw toAppError(error, 'No se ha podido cargar tu perfil.');
  return data;
}

/** Quita los campos vacíos opcionales para guardarlos como null. */
function cleanPatch(patch: ProfilePatch): ProfilePatch {
  const clean: ProfilePatch = { ...patch };
  if (patch.display_name !== undefined) clean.display_name = patch.display_name.trim();
  if (patch.phone !== undefined) clean.phone = patch.phone?.trim() ? normalizePhone(patch.phone) : null;
  if (patch.paypal_username !== undefined) {
    clean.paypal_username = patch.paypal_username?.trim() ? normalizePaypal(patch.paypal_username) : null;
  }
  return clean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  // Evita dos inicios de sesión anónimos a la vez (por ejemplo, con el modo estricto de React).
  const pendingAnonymous = useRef<Promise<User> | null>(null);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        // Sin sesión guardada legible: se empieza sin sesión.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // El perfil se carga fuera del callback de onAuthStateChange (Supabase recomienda no
  // llamar a la API dentro de él).
  useEffect(() => {
    if (userId === null) {
      setProfile(null);
      return;
    }
    let active = true;
    fetchProfile(userId)
      .then((row) => {
        if (active) setProfile(row);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    setProfile(id ? await fetchProfile(id) : null);
  }, []);

  const ensureAnonymous = useCallback(async (): Promise<User> => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session.user;
    if (pendingAnonymous.current) return pendingAnonymous.current;

    pendingAnonymous.current = (async () => {
      try {
        const result = await supabase.auth.signInAnonymously();
        if (result.error || !result.data.user) {
          throw toAuthError(result.error, 'No se ha podido entrar. Revisa tu conexión y vuelve a intentarlo.');
        }
        setSession(result.data.session);
        return result.data.user;
      } finally {
        pendingAnonymous.current = null;
      }
    })();
    return pendingAnonymous.current;
  }, []);

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new AppError('No has iniciado sesión.');
    const { data: row, error } = await supabase
      .from('profiles')
      .update(cleanPatch(patch))
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw toAppError(error, 'No se ha podido guardar tu perfil. Revisa los datos.');
    setProfile(row);
  }, []);

  const signUpDriver = useCallback(
    async ({ email, password, displayName, phone, paypalUsername }: SignUpDriverInput) => {
      const { data: current } = await supabase.auth.getSession();
      // Un pasajero anónimo que se hace conductor empieza una cuenta nueva.
      if (current.session?.user.is_anonymous) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) throw toAuthError(error, 'No se ha podido crear la cuenta.');
      if (!data.session) {
        throw new AppError(
          'Cuenta creada, pero hay que confirmar el email. Desactiva «Confirm email» en Supabase o revisa tu correo.',
        );
      }
      setSession(data.session);
      const { data: row, error: updateError } = await supabase
        .from('profiles')
        .update(cleanPatch({ display_name: displayName, phone: phone ?? null, paypal_username: paypalUsername ?? null }))
        .eq('id', data.session.user.id)
        .select('*')
        .single();
      if (updateError) throw toAppError(updateError, 'La cuenta se ha creado, pero no se han guardado tu teléfono o tu PayPal.');
      setProfile(row);
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { data: current } = await supabase.auth.getSession();
    if (current.session?.user.is_anonymous) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toAuthError(error, 'No se ha podido entrar.');
    setSession(data.session);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw toAuthError(error, 'No se ha podido cerrar la sesión.');
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAnonymous: session?.user.is_anonymous ?? true,
      ensureAnonymous,
      signUpDriver,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [session, profile, loading, ensureAnonymous, signUpDriver, signIn, signOut, refreshProfile, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
