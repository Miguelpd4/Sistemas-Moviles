import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import type { GameId } from '@/services/supabase/games';

/** Juegos de la sala (S2-09): «probable», «Adivina la canción» (#21), «¿Quién la ha puesto?» (#22), «Bingo de carretera», «Trivial del camino» y «Cazamatrículas» (#48). */
export type GameInfo = {
  id: GameId;
  name: string;
  description: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  minPlayers: number;
  available: boolean;
};

export const GAMES: readonly GameInfo[] = [
  {
    id: 'probable',
    name: '¿Quién es más probable que…?',
    description: 'Una pregunta, 30 segundos y todos votan a alguien del coche.',
    icon: 'account-question',
    minPlayers: 3,
    available: true,
  },
  {
    id: 'adivina_cancion',
    name: 'Adivina la canción',
    description: 'Suenan 10 segundos de una canción del viaje en el coche. ¿Cuál es?',
    icon: 'music-circle',
    minPlayers: 2,
    available: true,
  },
  {
    id: 'quien_la_puso',
    name: '¿Quién la ha puesto?',
    description: 'Adivina quién del coche ha puesto la canción que suena.',
    icon: 'account-music',
    minPlayers: 3,
    available: true,
  },
  {
    id: 'bingo',
    name: 'Bingo de carretera',
    description: 'Cada uno con su cartón: marca lo que veas por la ventanilla. ¡Línea y bingo!',
    icon: 'grid',
    minPlayers: 2,
    available: true,
  },
  {
    id: 'trivial',
    name: 'Trivial del camino',
    description: 'Preguntas sobre los sitios de Wikipedia que tenéis cerca. 30 segundos por pregunta.',
    icon: 'map-marker-question',
    minPlayers: 2,
    available: true,
  },
  {
    id: 'matriculas',
    name: 'Cazamatrículas',
    description: 'Un reto y 3 minutos: el primero que vea una matrícula que lo cumpla, gana.',
    icon: 'card-text',
    minPlayers: 2,
    available: true,
  },
];

export function gameInfo(id: string): GameInfo | undefined {
  return GAMES.find((game) => game.id === id);
}
