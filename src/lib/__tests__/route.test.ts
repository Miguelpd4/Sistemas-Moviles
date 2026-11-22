import { arrivalClock, parseOsrmRoute, parsePlaces, shouldRefreshRoute } from '../route';

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
  const from = { lat: 37.88, lon: -4.77 };
  const to = { lat: 37.39, lon: -5.98 };
  it('pide ruta la primera vez y al cambiar de destino', () => {
    expect(shouldRefreshRoute(null, from, to, 0)).toBe(true);
    expect(shouldRefreshRoute({ from, to, at: 0 }, from, { lat: 40, lon: -3 }, 1000)).toBe(true);
  });
  it('no la pide si casi no se ha movido y es reciente', () => {
    expect(shouldRefreshRoute({ from, to, at: 0 }, { lat: 37.881, lon: -4.77 }, to, 60_000)).toBe(false);
  });
  it('la pide si se ha movido más de 300 m o han pasado 2 min', () => {
    expect(shouldRefreshRoute({ from, to, at: 0 }, { lat: 37.885, lon: -4.77 }, to, 1000)).toBe(true);
    expect(shouldRefreshRoute({ from, to, at: 0 }, from, to, 121_000)).toBe(true);
  });
});
