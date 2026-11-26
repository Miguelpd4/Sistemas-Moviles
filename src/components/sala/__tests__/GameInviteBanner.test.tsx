import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameInviteBanner } from '../GameInviteBanner';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const withSafeArea = (ui: ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

describe('GameInviteBanner', () => {
  it('dice quién ha iniciado qué juego y deja entrar o cerrar', async () => {
    const onEnter = jest.fn();
    const onDismiss = jest.fn();
    await render(withSafeArea(<GameInviteBanner gameName="Trivial del camino" creatorName="Carlos" tab="juegos" onEnter={onEnter} onDismiss={onDismiss} />));
    expect(screen.getByText('¡Hay una nueva partida!')).toBeTruthy();
    expect(screen.getByText('Carlos ha iniciado Trivial del camino.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar al juego' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar el aviso' }));
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('los turnos de DJ llevan a Música', async () => {
    await render(withSafeArea(<GameInviteBanner gameName="Turnos de DJ" creatorName="Bea" tab="musica" onEnter={jest.fn()} onDismiss={jest.fn()} />));
    expect(screen.getByRole('button', { name: 'Ir a Música' })).toBeTruthy();
  });
});
