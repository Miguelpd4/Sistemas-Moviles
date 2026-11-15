import { CAR_MAKES, carModelTitle, findMake, modelsFor, normalizeText, suggest } from '../carCatalog';
import { isCarColor, isLightPaint, paintHex } from '../carColors';
import { pickCarImage, searchQueries, wikiSearchUrl } from '../carImage';

describe('catálogo de coches', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalizeText('  Citroën ')).toBe('citroen');
  });

  it('encuentra la marca aunque se escriba sin tilde', () => {
    expect(findMake('citroen')).toBe('Citroën');
    expect(findMake('Marca inventada')).toBeNull();
  });

  it('sugiere primero lo que empieza por el texto', () => {
    expect(suggest(CAR_MAKES, 're')[0]).toBe('Renault');
    expect(suggest(modelsFor('Renault'), 'cl')).toEqual(['Clio']);
    expect(suggest(modelsFor('renault'), 'clio')).toEqual([]);
  });

  it('modelsFor de una marca desconocida está vacío', () => {
    expect(modelsFor('Lada')).toEqual([]);
  });

  it('carModelTitle junta lo que haya', () => {
    expect(carModelTitle('Renault', 'Clio', 'V')).toBe('Renault Clio V');
    expect(carModelTitle('Renault', 'Clio', '')).toBe('Renault Clio');
    expect(carModelTitle(null, null)).toBe('Coche');
  });
});

describe('colores de coche', () => {
  it('reconoce los colores válidos', () => {
    expect(isCarColor('rojo')).toBe(true);
    expect(isCarColor('fucsia')).toBe(false);
    expect(paintHex(null)).toBe(paintHex('gris'));
    expect(isLightPaint('blanco')).toBe(true);
    expect(isLightPaint('negro')).toBe(false);
  });
});

describe('foto del modelo', () => {
  it('construye la URL de búsqueda de Wikipedia', () => {
    const url = wikiSearchUrl('es', 'Renault Clio');
    expect(url).toContain('https://es.wikipedia.org/w/api.php?');
    expect(url).toContain('gsrsearch=Renault%20Clio');
    expect(url).toContain('origin=*');
  });

  it('busca primero con versión y después sin ella', () => {
    expect(searchQueries('Renault', 'Clio', 'V')).toEqual(['Renault Clio V', 'Renault Clio']);
    expect(searchQueries('Renault', 'Clio')).toEqual(['Renault Clio']);
  });

  it('elige la primera foto cuyo título es el del modelo', () => {
    const pages = [
      { index: 2, title: 'Renault Clio', thumbnail: { source: 'https://upload.wikimedia.org/clio.jpg' } },
      { index: 1, title: 'Copa Renault Clio', thumbnail: { source: 'https://upload.wikimedia.org/carrera.svg' } },
      { index: 0, title: 'Renault', thumbnail: { source: 'https://upload.wikimedia.org/logo.png' } },
    ];
    expect(pickCarImage(pages, 'Renault', 'Clio')).toBe('https://upload.wikimedia.org/clio.jpg');
  });

  it('acepta marcas con guion y títulos sin tilde', () => {
    const pages = [{ index: 0, title: 'SEAT León', thumbnail: { source: 'https://upload.wikimedia.org/leon.jpg' } }];
    expect(pickCarImage(pages, 'Seat', 'Leon')).toBe('https://upload.wikimedia.org/leon.jpg');
    const mercedes = [{ index: 0, title: 'Mercedes-Benz Clase A', thumbnail: { source: 'https://upload.wikimedia.org/a.jpg' } }];
    expect(pickCarImage(mercedes, 'Mercedes-Benz', 'Clase A')).toBe('https://upload.wikimedia.org/a.jpg');
  });

  it('devuelve null si nada encaja', () => {
    expect(pickCarImage([{ index: 0, title: 'Ford Focus', thumbnail: { source: 'https://x/f.jpg' } }], 'Renault', 'Clio')).toBeNull();
    expect(pickCarImage([], 'Renault', 'Clio')).toBeNull();
  });
});
