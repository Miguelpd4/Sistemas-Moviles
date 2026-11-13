import * as ImagePicker from 'expo-image-picker';

import { AppError } from '@/lib/errors';

type Options = {
  /** Abrir la cámara en lugar de la galería. */
  camera?: boolean;
  /** Recorte cuadrado (avatares). */
  square?: boolean;
};

/** Abre la galería o la cámara y devuelve la uri de la imagen elegida, o null si se cancela. */
export async function pickImage({ camera = false, square = true }: Options = {}): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: square ? [1, 1] : [4, 3],
    quality: 0.6,
  };

  try {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new AppError('Sin permiso para usar la cámara. Actívalo en los ajustes del móvil o elige una foto de la galería.');
      }
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return null;
    return result.assets[0]?.uri ?? null;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('No se ha podido abrir la imagen. Vuelve a intentarlo.', { details: error });
  }
}
