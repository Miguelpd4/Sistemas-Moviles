import { createEmitter } from '../emitter';

type Events = { a: number; b: string };

describe('createEmitter', () => {
  it('llama solo a los handlers del evento correcto', () => {
    const emitter = createEmitter<Events>();
    const onA = jest.fn();
    const onB = jest.fn();
    emitter.on('a', onA);
    emitter.on('b', onB);
    emitter.emit('a', 1);
    expect(onA).toHaveBeenCalledWith(1);
    expect(onB).not.toHaveBeenCalled();
  });

  it('deja de llamar tras desuscribirse', () => {
    const emitter = createEmitter<Events>();
    const onA = jest.fn();
    const off = emitter.on('a', onA);
    off();
    emitter.emit('a', 2);
    expect(onA).not.toHaveBeenCalled();
  });

  it('un handler que falla no impide que lleguen los demás', () => {
    const emitter = createEmitter<Events>();
    const after = jest.fn();
    emitter.on('b', () => {
      throw new Error('roto');
    });
    emitter.on('b', after);
    emitter.emit('b', 'x');
    expect(after).toHaveBeenCalledWith('x');
  });
});
