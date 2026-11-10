import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '../Button';

describe('Button', () => {
  it('muestra la etiqueta y responde al toque', async () => {
    const onPress = jest.fn();
    await render(<Button label="Crear viaje" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Crear viaje' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no responde mientras está cargando', async () => {
    const onPress = jest.fn();
    await render(<Button label="Guardar" loading onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
