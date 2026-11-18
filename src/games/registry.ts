import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import type { GameId } from '@/services/supabase/games';

/** Juegos de la sala (S2-09). En este sprint solo «probable» está disponible. */
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
    description: 'Suenan 10 segundos de una canción de la cola. ¿Quién la reconoce?',
    icon: 'music-circle',
    minPlayers: 2,
    available: false,
  },
  {
    id: 'quien_la_puso',
    name: '¿Quién la ha puesto?',
    description: 'Adivina quién del coche ha puesto la canción que suena.',
    icon: 'account-music',
    minPlayers: 3,
    available: false,
  },
  {
    id: 'trivial',
    name: 'Trivial del camino',
    description: 'Preguntas sobre los sitios por los que pasáis.',
    icon: 'map-marker-question',
    minPlayers: 2,
    available: false,
  },
  {
    id: 'matriculas',
    name: 'Cazamatrículas',
    description: 'Busca letras y números en las matrículas de otros coches.',
    icon: 'card-text',
    minPlayers: 2,
    available: false,
  },
];

export function gameInfo(id: string): GameInfo | undefined {
  return GAMES.find((game) => game.id === id);
}
