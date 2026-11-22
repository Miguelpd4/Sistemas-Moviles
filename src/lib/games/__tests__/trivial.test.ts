import { buildTrivia, parseGeoPlaces, readTrivialPayload, readTrivialSolution, redactClue, type WikiPlace } from '../trivial';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const here = { lat: 37.8847, lon: -4.7792 };

function place(id: string, title: string, km: number, extract = ''): WikiPlace {
  return { id, title, extract, lat: here.lat + km / 111, lon: here.lon, distanceM: Math.round(km * 1000) };
}

const MEZQUITA =
  'La Mezquita-catedral de Córdoba es un edificio religioso de la ciudad de Córdoba, en Andalucía. Empezó a construirse como mezquita en el año 786 y es Patrimonio de la Humanidad.';

describe('parseGeoPlaces', () => {
  it('lee las páginas, calcula la distancia y ordena de cerca a lejos', () => {
    const places = parseGeoPlaces(
      {
        query: {
          pages: [
            { pageid: 2, title: 'Puente romano de Córdoba', coordinates: [{ lat: 37.8794, lon: -4.7774 }], extract: 'Un puente.' },
            { pageid: 1, title: 'Mezquita-catedral de Córdoba', coordinates: [{ lat: 37.8789, lon: -4.7794 }], extract: MEZQUITA },
            { pageid: 3, title: 'Anexo:Monumentos de Córdoba', coordinates: [{ lat: 37.88, lon: -4.78 }] },
            { pageid: 4, title: 'Sin coordenadas' },
          ],
        },
      },
      here,
    );
    expect(places.map((p) => p.id)).toEqual(['2', '1']);
    expect(places[0]?.distanceM).toBeGreaterThan(500);
    expect(places[1]?.extract).toBe(MEZQUITA);
  });
  it('aguanta respuestas vacías o raras', () => {
    expect(parseGeoPlaces(null, here)).toEqual([]);
    expect(parseGeoPlaces({ query: { pages: 'x' } }, here)).toEqual([]);
  });
});

describe('redactClue', () => {
  it('tapa el nombre y sus palabras propias, pero no las genéricas', () => {
    const clue = redactClue(MEZQUITA, 'Mezquita-catedral de Córdoba');
    expect(clue).not.toMatch(/Mezquita-catedral de Córdoba/);
    expect(clue).not.toMatch(/Córdoba/);
    expect(clue).toMatch(/^La ___ es un edificio religioso/);
    expect(clue).toMatch(/Andalucía/);
  });
  it('quita la aclaración entre paréntesis del título y del texto', () => {
    expect(redactClue('Guadalquivir (del árabe al-wadi al-kabir) es el río de Andalucía.', 'Guadalquivir (río)')).toBe(
      '___ es el río de Andalucía.',
    );
  });
  it('corta los textos largos en una frase', () => {
    const long = `Villa del Río es un municipio. ${'Tiene muchas cosas bonitas que ver. '.repeat(20)}`;
    const clue = redactClue(long, 'Villa del Río');
    expect(clue.length).toBeLessThanOrEqual(261);
    expect(clue.startsWith('Villa del ___')).toBe(false);
  });
});

describe('buildTrivia', () => {
  const places = [
    place('1', 'Mezquita-catedral de Córdoba', 0.6, MEZQUITA),
    place('2', 'Puente romano de Córdoba', 0.9, 'El Puente romano de Córdoba cruza el río Guadalquivir y se construyó en el siglo I antes de Cristo.'),
    place('3', 'Medina Azahara', 6, 'Medina Azahara fue una ciudad palatina que mandó construir Abderramán III en el siglo X a las afueras.'),
    place('4', 'Torre de la Calahorra', 1.4, 'La Torre de la Calahorra es una fortaleza de origen islámico situada junto al puente.'),
    place('5', 'Palacio de Viana', 2.2, 'El Palacio de Viana es una casa señorial famosa por sus doce patios y sus jardines.'),
  ];

  it('con menos de 4 sitios no hay pregunta', () => {
    expect(buildTrivia(places.slice(0, 3), seeded(1))).toBeNull();
  });

  it('las preguntas siempre tienen 4 opciones distintas y la respuesta entre ellas', () => {
    for (let seed = 1; seed < 60; seed += 1) {
      const trivia = buildTrivia(places, seeded(seed));
      expect(trivia).not.toBeNull();
      if (!trivia) continue;
      const ids = trivia.payload.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(4);
      expect(ids).toContain(trivia.solution.option);
      if (trivia.payload.kind === 'cual_es') {
        const answer = places.find((p) => p.id === trivia.solution.option);
        expect(trivia.payload.clue).toContain('___');
        expect(trivia.payload.clue).not.toContain(answer?.title ?? '?');
      } else {
        const chosen = places.filter((p) => ids.includes(p.id));
        const nearest = chosen.reduce((a, b) => (a.distanceM < b.distanceM ? a : b));
        expect(trivia.solution.option).toBe(nearest.id);
        expect(trivia.payload.clue).toBeNull();
      }
    }
  });

  it('el payload no lleva la solución', () => {
    const trivia = buildTrivia(places, seeded(5));
    expect(JSON.stringify(trivia?.payload)).not.toMatch(/distanceM|extract|solution/);
  });

  it('evita repetir la respuesta de una pregunta anterior', () => {
    const answers = new Set<string>();
    for (let seed = 1; seed < 40; seed += 1) {
      const trivia = buildTrivia(places, seeded(seed), ['1', '2', '3', '4']);
      if (trivia?.payload.kind === 'cual_es') answers.add(trivia.solution.option);
    }
    expect([...answers]).toEqual(['5']);
  });
});

describe('lectura', () => {
  it('lee el payload y la solución', () => {
    expect(readTrivialPayload({ kind: 'cual_es', question: '¿Qué?', clue: 'x', options: [{ id: '1', label: 'A' }, { id: 2 }] })).toEqual({
      kind: 'cual_es',
      question: '¿Qué?',
      clue: 'x',
      options: [{ id: '1', label: 'A' }],
    });
    expect(readTrivialPayload({ kind: 'otro', options: [] })).toBeNull();
    expect(readTrivialSolution({ option: '1', title: 'A', extract: 'e', distanceM: 600 })).toEqual({
      option: '1',
      title: 'A',
      extract: 'e',
      distanceM: 600,
    });
    expect(readTrivialSolution(null)).toBeNull();
  });
});
