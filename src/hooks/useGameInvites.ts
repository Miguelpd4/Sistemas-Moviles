import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import { gameDisplayName } from '@/games/registry';
import { decideInvite, invitePath, roundFinished, type GameInvite, type InviteTab, type RoundChange } from '@/lib/gameInvites';
import { vibrate } from '@/services/device/feedback';

import { useBroadcast } from './useBroadcast';
import { useSession } from './useSession';

export type ShownInvite = GameInvite & { gameName: string; creatorName: string };

/**
 * Avisos de partida nueva (para el layout de la sala): escucha el evento `round` del canal de la
 * sala, enseña el aviso en cualquier pestaña y marca la pestaña del juego hasta que se visita.
 * `viewed` se llama al entrar en cada pestaña (evento `focus` de las pestañas).
 */
export function useGameInvites() {
  const { sessionId, myId, members } = useSession();
  const seenRef = useRef(new Set<string>());
  const viewingRef = useRef<string | null>(null);
  const [invite, setInvite] = useState<GameInvite | null>(null);
  // Pestañas con una partida sin consultar (la ronda de cada una).
  const [pending, setPending] = useState<Partial<Record<InviteTab, string>>>({});

  useBroadcast('round', (change) => {
    const event = change as RoundChange;
    // Una ronda que termina quita su aviso y su marca.
    setInvite((current) => (current && roundFinished(event, current.roundId) ? null : current));
    setPending((current) => {
      const ended = (Object.keys(current) as InviteTab[]).filter((tab) => {
        const roundId = current[tab];
        return roundId !== undefined && roundFinished(event, roundId);
      });
      if (ended.length === 0) return current;
      const next = { ...current };
      for (const tab of ended) delete next[tab];
      return next;
    });

    const { invite: next, markSeen } = decideInvite(event, { myId, seen: seenRef.current, viewing: viewingRef.current });
    if (markSeen) seenRef.current.add(markSeen);
    if (!next) return;
    vibrate();
    setInvite(next);
    setPending((current) => ({ ...current, [next.tab]: next.roundId }));
  });

  /** Al entrar en una pestaña: deja de estar pendiente y, si es la del aviso, el aviso se va. */
  const viewed = useCallback((routeName: string) => {
    viewingRef.current = routeName;
    if (routeName !== 'juegos' && routeName !== 'musica') return;
    setPending((current) => {
      if (current[routeName] === undefined) return current;
      const next = { ...current };
      delete next[routeName];
      return next;
    });
    setInvite((current) => (current?.tab === routeName ? null : current));
  }, []);

  const dismiss = useCallback(() => setInvite(null), []);

  const enter = useCallback(() => {
    if (!invite) return;
    router.navigate(invitePath(sessionId, invite.tab));
  }, [invite, sessionId]);

  const shown = useMemo<ShownInvite | null>(() => {
    if (!invite) return null;
    const creator = members.find((member) => member.user_id === invite.creatorId);
    return { ...invite, gameName: gameDisplayName(invite.game), creatorName: creator?.display_name ?? 'Alguien del coche' };
  }, [invite, members]);

  return { invite: shown, pending, viewed, dismiss, enter };
}
