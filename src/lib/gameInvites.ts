/**
 * Avisos de partida nueva en la sala: cuando alguien empieza un juego, los demás lo ven en
 * cualquier pestaña con un botón para entrar. Llega por el evento `round` del canal de la sala
 * (INSERT en game_rounds). Funciones puras: el estado lo lleva useGameInvites.
 */

/** Pestaña donde se juega: los turnos de DJ van en Música; el resto, en Juegos. */
export type InviteTab = 'juegos' | 'musica';

export type RoundChange = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: { id?: string; game?: string; status?: string; created_by?: string };
  old?: { id?: string };
};

export type GameInvite = { roundId: string; game: string; creatorId: string; tab: InviteTab };

export function inviteTab(game: string): InviteTab {
  return game === 'dj' ? 'musica' : 'juegos';
}

/** Ruta de la pestaña donde se juega. */
export function invitePath(sessionId: string, tab: InviteTab): `/sala/${string}/${InviteTab}` {
  return `/sala/${sessionId}/${tab}`;
}

type Context = {
  myId: string | null;
  /** Rondas ya tratadas: nunca se avisa dos veces de la misma. */
  seen: ReadonlySet<string>;
  /** Pestaña que se está viendo ahora (nombre de la ruta: index, musica, juegos…). */
  viewing: string | null;
};

/**
 * ¿Hay que avisar de este cambio? Solo las rondas nuevas (INSERT) y activas, que no he empezado
 * yo y cuya pestaña no estoy viendo ya. `markSeen` es la ronda que queda tratada (aunque no se
 * avise), para no repetir el aviso con actualizaciones posteriores.
 */
export function decideInvite(change: RoundChange, { myId, seen, viewing }: Context): { invite: GameInvite | null; markSeen: string | null } {
  const { id, game, status, created_by: creatorId } = change.new;
  if (change.eventType !== 'INSERT' || !id || seen.has(id)) return { invite: null, markSeen: null };
  if (!game || !creatorId || status !== 'activa' || creatorId === myId) return { invite: null, markSeen: id };
  const tab = inviteTab(game);
  if (viewing === tab) return { invite: null, markSeen: id };
  return { invite: { roundId: id, game, creatorId, tab }, markSeen: id };
}

/** ¿Este cambio termina la ronda `roundId` (revelada, cerrada o borrada)? */
export function roundFinished(change: RoundChange, roundId: string): boolean {
  if (change.eventType === 'DELETE') return change.old?.id === roundId;
  return change.eventType === 'UPDATE' && change.new.id === roundId && change.new.status !== undefined && change.new.status !== 'activa';
}
