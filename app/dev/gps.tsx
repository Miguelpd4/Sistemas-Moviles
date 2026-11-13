import * as Location from 'expo-location';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { AppText, Button, Card, Notice, Screen } from '@/components/ui';
import { FUEL_TYPES, type FuelType } from '@/lib/carForm';
import { totalDistanceM, type GeoPoint } from '@/lib/distance';
import { AppError, errorMessage } from '@/lib/errors';
import { formatKm } from '@/lib/format';
import { fetchFuelPrice } from '@/services/location/fuelPrice';
import {
  clearPoints,
  isTracking,
  loadPoints,
  openLocationSettings,
  startTracking,
  stopTracking,
} from '@/services/location/tracking';
import { colors } from '@/theme';

/** Prueba técnica de GPS en segundo plano y precio del combustible (S1-10). Solo en desarrollo. */
export default function DevGpsScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevGps />;
}

function DevGps() {
  const [tracking, setTracking] = useState(false);
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);
  const [fuel, setFuel] = useState<FuelType>('diesel');
  const [priceInfo, setPriceInfo] = useState<string | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const refresh = useCallback(async () => {
    setTracking(await isTracking());
    setPoints(await loadPoints());
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  const start = async () => {
    setError(null);
    setNeedsSettings(false);
    try {
      await startTracking();
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
      setNeedsSettings(err instanceof AppError && err.code === 'BACKGROUND_DENIED');
    }
  };

  const stop = async () => {
    await stopTracking();
    await refresh();
  };

  const reset = async () => {
    await clearPoints();
    await refresh();
  };

  const checkPrice = async () => {
    setLoadingPrice(true);
    setPriceInfo(null);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new AppError('Sin permiso de ubicación.');
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const started = Date.now();
      const result = await fetchFuelPrice(here.coords.latitude, here.coords.longitude, fuel);
      setPriceInfo(
        `${result.priceEurL.toFixed(3).replace('.', ',')} €/L · media de ${result.stations} gasolineras (hasta ${result.maxDistanceKm} km) · ${Date.now() - started} ms${result.cached ? ' (caché)' : ` (Ministerio: ${result.sourceMs} ms)`}`,
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingPrice(false);
    }
  };

  const last = points[points.length - 1];

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Prueba de GPS
      </AppText>
      {error !== null ? <Notice message={error} /> : null}
      {needsSettings ? <Button label="Abrir ajustes" variant="secondary" onPress={openLocationSettings} /> : null}

      <Card>
        <AppText variant="heading">GPS en segundo plano</AppText>
        <AppText>{tracking ? 'Midiendo (puedes apagar la pantalla)' : 'Parado'}</AppText>
        <AppText variant="display">{formatKm(totalDistanceM(points))}</AppText>
        <AppText color={colors.textSecondary}>
          {points.length} puntos{last ? ` · último a las ${new Date(last.timestamp).toLocaleTimeString('es-ES')}, precisión ${Math.round(last.accuracy ?? 0)} m` : ''}
        </AppText>
        {tracking ? <Button label="Parar" onPress={stop} /> : <Button label="Empezar" onPress={start} />}
        <Button label="Borrar puntos" variant="secondary" onPress={reset} />
      </Card>

      <Card>
        <AppText variant="heading">Precio del combustible aquí</AppText>
        {FUEL_TYPES.map((option) => (
          <Button
            key={option.value}
            label={`${fuel === option.value ? '● ' : ''}${option.label}`}
            variant={fuel === option.value ? 'primary' : 'secondary'}
            onPress={() => setFuel(option.value)}
          />
        ))}
        <Button label="Consultar precio" onPress={checkPrice} loading={loadingPrice} />
        {priceInfo !== null ? <Notice tone="success" message={priceInfo} /> : null}
      </Card>
    </Screen>
  );
}
