import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import type { CarFormValues } from '@/lib/carForm';
import { AppError, errorMessage } from '@/lib/errors';
import { createCar, getMyCar, updateCar, uploadCarPhoto, type Car } from '@/services/supabase/cars';

/** El coche del conductor con sesión iniciada (null si es pasajero o aún no lo ha registrado). */
export function useMyCar() {
  const { user, isAnonymous } = useAuth();
  const userId = !isAnonymous ? (user?.id ?? null) : null;
  // El coche va con el id de su dueño: si cambia la sesión, el anterior se descarta solo.
  const [loaded, setLoaded] = useState<{ userId: string; car: Car | null } | null>(null);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCar = useCallback(
    (id: string) =>
      getMyCar(id)
        .then((row) => {
          setLoaded({ userId: id, car: row });
          setError(null);
        })
        .catch((err: unknown) => setError(errorMessage(err))),
    [],
  );

  useEffect(() => {
    if (userId !== null) void fetchCar(userId);
  }, [userId, fetchCar]);

  /** Vuelve a pedir el coche (botón «Reintentar» o al volver a la pantalla). */
  const reload = useCallback(async () => {
    if (userId === null) return;
    setReloading(true);
    setError(null);
    await fetchCar(userId);
    setReloading(false);
  }, [userId, fetchCar]);

  const car = userId !== null && loaded?.userId === userId ? loaded.car : null;
  // Primera carga de este conductor (sin error) o recarga pedida a mano.
  const loading = reloading || (userId !== null && loaded?.userId !== userId && error === null);

  /** Crea o actualiza el coche. `newPhotoUri` es una foto nueva elegida en el móvil (o null para dejar la que hay). */
  const save = useCallback(
    async (values: CarFormValues, newPhotoUri: string | null): Promise<Car> => {
      if (userId === null) throw new AppError('Inicia sesión como conductor para guardar tu coche.');
      const photoPath = newPhotoUri !== null ? await uploadCarPhoto(userId, newPhotoUri) : (car?.photo_path ?? null);
      const saved = car ? await updateCar(car, values, photoPath) : await createCar(userId, values, photoPath);
      setLoaded({ userId, car: saved });
      return saved;
    },
    [userId, car],
  );

  return { car, loading, error, reload, save };
}
