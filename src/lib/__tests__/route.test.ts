import { arrivalClock, parseOsrmRoute, parsePlaces, routeProgress, shouldRefreshRoute } from '../route';

describe('parseOsrmRoute', () => {
  it('lee distancia, duración y el trazado en [lat, lon]', () => {
    const route = parseOsrmRoute({
      code: 'Ok',
      routes: [{ distance: 1234.6, duration: 95.4, geometry: { coordinates: [[-4.77, 37.88], [-4.78, 37.89]] } }],
    });
    expect(route).toEqual({ distanceM: 1235, durationS: 95, path: [[37.88, -4.77], [37.89, -4.78]] });
  });
  it('null si OSRM no encuentra ruta', () => {
    expect(parseOsrmRoute({ code: 'NoRoute', routes: [] })).toBeNull();
    expect(parseOsrmRoute('nada')).toBeNull();
  });
});

describe('parsePlaces', () => {
  it('saca nombre corto y detalle de Nominatim', () => {
    const places = parsePlaces([
      { lat: '37.3886', lon: '-5.9823', name: 'Sevilla', display_name: 'Sevilla, Andalucía, España' },
      { lat: 'x', lon: '1', display_name: 'Roto' },
    ]);
    expect(places).toEqual([{ name: 'Sevilla', detail: 'Andalucía, España', lat: 37.3886, lon: -5.9823 }]);
  });
  it('vacío si la respuesta no es una lista', () => {
    expect(parsePlaces({ error: 'x' })).toEqual([]);
  });
});

describe('arrivalClock', () => {
  it('suma lo que queda a la hora actual', () => {
    const now = new Date(2026, 10, 22, 18, 20).getTime();
    expect(arrivalClock(now, 22 * 60)).toBe('18:42');
  });
});

describe('shouldRefreshRoute', () => {
  const to = { lat: 37.88, lon: -4.78 };

  it('pide la ruta la primera vez y al cambiar de destino', () => {
    expect(shouldRefreshRoute(null, to, 0, 0)).toBe(true);
    expect(shouldRefreshRoute({ to, at: 0 }, { lat: 40, lon: -3 }, 1000, 0)).toBe(true);
  });

  it('no la repite mientras sigáis por ella', () => {
    expect(shouldRefreshRoute({ to, at: 0 }, to, 60_000, 30)).toBe(false);
  });

  it('la recalcula al salirse de la ruta, pero no más de una vez cada 20 s', () => {
    expect(shouldRefreshRoute({ to, at: 0 }, to, 10_000, 500)).toBe(false);
    expect(shouldRefreshRoute({ to, at: 0 }, to, 25_000, 500)).toBe(true);
  });

  it('la renueva cada 5 min', () => {
    expect(shouldRefreshRoute({ to, at: 0 }, to, 301_000, 0)).toBe(true);
  });
});

describe('routeProgress', () => {
  // Ruta recta hacia el norte: 3 tramos de unos 111 m.
  const route = {
    distanceM: 333,
    durationS: 60,
    path: [
      [37.0, -4.0],
      [37.001, -4.0],
      [37.002, -4.0],
      [37.003, -4.0],
    ] as [number, number][],
  };

  it('al empezar queda toda la ruta', () => {
    const p = routeProgress(route, { lat: 37.0, lon: -4.0 });
    expect(p.remainingM).toBe(333);
    expect(p.remainingS).toBe(60);
    expect(p.offRouteM).toBe(0);
    expect(p.path).toHaveLength(4);
  });

  it('a mitad de camino queda lo que falta y el tiempo baja igual', () => {
    const p = routeProgress(route, { lat: 37.002, lon: -4.0 });
    expect(p.remainingM).toBe(111);
    expect(p.remainingS).toBe(20);
    expect(p.path).toEqual([
      [37.002, -4.0],
      [37.003, -4.0],
    ]);
  });

  it('dice cuánto se ha salido de la ruta', () => {
    const p = routeProgress(route, { lat: 37.001, lon: -3.995 });
    expect(p.offRouteM).toBeGreaterThan(400);
  });
});
