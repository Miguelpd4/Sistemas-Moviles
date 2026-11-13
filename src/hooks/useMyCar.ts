import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import type { CarFormValues } from '@/lib/carForm';
import { AppError, errorMessage } from '@/lib/errors';
import { createCar, getMyCar, updateCar, uploadCarPhoto, type Car } from '@/services/supabase/cars';

/** El coche del conductor con sesión iniciada (null si es pasajero o aún no lo ha registrado). */
export function useMyCar() {
  const { user, isAnonymous } = useAuth();
  const userId = !isAnonymous ? (user?.id ?? null) : null;
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (userId === null) {
      setCar(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCar(await getMyCar(userId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Crea o actualiza el coche. `newPhotoUri` es una foto nueva elegida en el móvil (o null para dejar la que hay). */
  const save = useCallback(
    async (values: CarFormValues, newPhotoUri: string | null): Promise<Car> => {
      if (userId === null) throw new AppError('Inicia sesión como conductor para guardar tu coche.');
      const photoPath = newPhotoUri !== null ? await uploadCarPhoto(userId, newPhotoUri) : (car?.photo_path ?? null);
      const saved = car ? await updateCar(car.id, values, photoPath) : await createCar(userId, values, photoPath);
      setCar(saved);
      return saved;
    },
    [userId, car],
  );

  return { car, loading, error, reload, save };
}
