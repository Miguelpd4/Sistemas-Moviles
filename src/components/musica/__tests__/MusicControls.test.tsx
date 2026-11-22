import { fireEvent, render, screen } from '@testing-library/react-native';

import { MusicControls } from '../MusicControls';

jest.mock('@/services/device/feedback', () => ({ vibrate: jest.fn() }));

describe('MusicControls', () => {
  const setup = async (isPlaying: boolean) => {
    const handlers = { onRestart: jest.fn(), onTogglePlay: jest.fn(), onNext: jest.fn(() => Promise.resolve()) };
    await render(<MusicControls isPlaying={isPlaying} {...handlers} />);
    return handlers;
  };

  it('enseña principio, pausa y siguiente mientras suena', async () => {
    const handlers = await setup(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Volver al principio de la canción' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Pausar la música' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Pasar a la siguiente canción' }));
    expect(handlers.onRestart).toHaveBeenCalledTimes(1);
    expect(handlers.onTogglePlay).toHaveBeenCalledWith(true);
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
  });

  it('en pausa, el botón del centro sigue con la música', async () => {
    const handlers = await setup(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Seguir con la música' }));
    expect(handlers.onTogglePlay).toHaveBeenCalledWith(false);
  });
});
