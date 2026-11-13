import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { randomAvatarId, type AvatarKind } from '@/lib/avatars';
import { AppError, errorMessage } from '@/lib/errors';
import { initialJoinState, joinReducer } from '@/lib/joinFlow';
import { pickImage } from '@/services/media/pickImage';
import { supabase } from '@/services/supabase/client';
import { uniqueChannelName } from '@/services/supabase/realtime';
import { getSessionPreview, joinSession } from '@/services/supabase/sessions';
import { publicUrl, uploadImage } from '@/services/supabase/storage';
import type { MemberStatus } from '@/types/session';

/** Cada cuánto se vuelve a mirar el estado mientras se espera la aprobación (por si se pierde un evento). */
const PENDING_POLL_MS = 15_000;

/**
 * Entrada tipo Kahoot (S1-06): hace las llamadas de red y le pasa los resultados a `joinReducer`.
 */
export function useJoinFlow(code: string) {
  const { ensureAnonymous, profile } = useAuth();
  const [state, dispatch] = useReducer(joinReducer, initialJoinState);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // El perfil solo se usa para rellenar el nombre al cargar; no debe relanzar la carga.
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Carga (y recarga al reintentar): sesión anónima + vista previa del viaje.
  useEffect(() => {
    if (state.step !== 'cargando') return;
    let active = true;
    (async () => {
      try {
        const user = await ensureAnonymous();
        if (!active) return;
        setUserId(user.id);
        const preview = await getSessionPreview(code);
        if (!active) return;
        const saved = profileRef.current;
        const hasSavedAvatar = saved !== null && saved.avatar_value !== '' && saved.display_name !== '';
        dispatch({
          type: 'preview_loaded',
          preview,
          defaultName: saved?.display_name ?? '',
          avatarKind: hasSavedAvatar && saved.avatar_kind === 'foto' ? 'foto' : 'preset',
          avatarValue: hasSavedAvatar ? saved.avatar_value : randomAvatarId(),
        });
      } catch (error) {
        if (active) dispatch({ type: 'load_failed', message: errorMessage(error) });
      }
    })();
    return () => {
      active = false;
    };
  }, [state.step, code, ensureAnonymous]);

  // Esperando aprobación: escuchar cambios de la fila propia, con una consulta de respaldo.
  const sessionId = state.preview?.session_id ?? null;
  useEffect(() => {
    if (state.step !== 'pendiente' || sessionId === null || userId === null) return;

    const channel = supabase
      .channel(uniqueChannelName(`entrada:${sessionId}:${userId}`))
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_members', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as { user_id?: string; status?: MemberStatus };
          if (row.user_id === userId && row.status) dispatch({ type: 'status_changed', status: row.status });
        },
      )
      .subscribe();

    const poll = setInterval(() => {
      getSessionPreview(code)
        .then((preview) => {
          if (preview.my_status) dispatch({ type: 'status_changed', status: preview.my_status });
        })
        .catch(() => undefined);
    }, PENDING_POLL_MS);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [state.step, sessionId, userId, code]);

  const pickPhoto = useCallback(async () => {
    try {
      const uri = await pickImage({ square: true });
      if (uri === null) return;
      setUploading(true);
      const user = await ensureAnonymous();
      const path = await uploadImage('avatares', user.id, uri);
      dispatch({ type: 'set_avatar', kind: 'foto', value: publicUrl('avatares', path) });
    } catch (error) {
      dispatch({ type: 'show_notice', message: errorMessage(error) });
    } finally {
      setUploading(false);
    }
  }, [ensureAnonymous]);

  const submit = useCallback(async () => {
    dispatch({ type: 'submit' });
    try {
      const result = await joinSession({
        nfcCode: code,
        displayName: state.name,
        avatarKind: state.avatarKind,
        avatarValue: state.avatarValue,
        seat: state.seat,
      });
      dispatch({ type: 'join_result', status: result.status });
    } catch (error) {
      if (error instanceof AppError && error.code === 'SEAT_TAKEN') {
        try {
          const preview = await getSessionPreview(code);
          dispatch({ type: 'seat_taken', preview, message: error.message });
          return;
        } catch {
          // Si tampoco se puede recargar, se muestra el error normal.
        }
      }
      dispatch({ type: 'join_failed', message: errorMessage(error) });
    }
  }, [code, state.name, state.avatarKind, state.avatarValue, state.seat]);

  return {
    state,
    uploading,
    start: useCallback(() => dispatch({ type: 'start' }), []),
    retry: useCallback(() => dispatch({ type: 'retry' }), []),
    back: useCallback(() => dispatch({ type: 'back' }), []),
    setName: useCallback((name: string) => dispatch({ type: 'set_name', name }), []),
    setAvatar: useCallback((kind: AvatarKind, value: string) => dispatch({ type: 'set_avatar', kind, value }), []),
    setSeat: useCallback((seat: number | null) => dispatch({ type: 'set_seat', seat }), []),
    profileDone: useCallback(() => dispatch({ type: 'profile_done' }), []),
    pickPhoto,
    submit,
  };
}
