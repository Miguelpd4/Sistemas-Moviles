/**
 * Marcas y modelos habituales en España, para autocompletar el formulario del coche.
 * No es una lista cerrada: se puede escribir cualquier marca o modelo que no esté.
 */
export const CAR_CATALOG: Readonly<Record<string, readonly string[]>> = {
  Audi: ['A1', 'A3', 'A4', 'A5', 'A6', 'Q2', 'Q3', 'Q5', 'e-tron'],
  BMW: ['Serie 1', 'Serie 2', 'Serie 3', 'Serie 5', 'X1', 'X2', 'X3', 'X5', 'i3'],
  Citroën: ['C1', 'C3', 'C3 Aircross', 'C4', 'C5 Aircross', 'Berlingo', 'Xsara Picasso', 'C4 Picasso'],
  Cupra: ['Born', 'Formentor', 'León', 'Ateca'],
  Dacia: ['Sandero', 'Duster', 'Logan', 'Jogger', 'Spring', 'Lodgy'],
  Fiat: ['500', 'Panda', 'Tipo', 'Punto', '500X', 'Doblò'],
  Ford: ['Fiesta', 'Focus', 'Kuga', 'Puma', 'Mondeo', 'Ka', 'C-Max', 'Transit Connect'],
  Honda: ['Civic', 'Jazz', 'CR-V', 'HR-V'],
  Hyundai: ['i10', 'i20', 'i30', 'Tucson', 'Kona', 'Bayon', 'Ioniq'],
  Jeep: ['Renegade', 'Compass', 'Avenger'],
  Kia: ['Picanto', 'Rio', 'Ceed', 'XCeed', 'Stonic', 'Niro', 'Sportage'],
  Mazda: ['2', '3', 'CX-3', 'CX-30', 'CX-5', 'MX-5'],
  'Mercedes-Benz': ['Clase A', 'Clase B', 'Clase C', 'Clase E', 'CLA', 'GLA', 'GLC', 'Vito'],
  MG: ['ZS', 'MG4', 'HS', 'MG3'],
  Mini: ['Cooper', 'Countryman', 'Clubman'],
  Nissan: ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Leaf', 'Note'],
  Opel: ['Corsa', 'Astra', 'Mokka', 'Crossland', 'Grandland', 'Insignia', 'Zafira', 'Meriva'],
  Peugeot: ['106', '206', '207', '208', '2008', '307', '308', '3008', '5008', '508', 'Partner', 'Rifter'],
  Renault: ['Twingo', 'Clio', 'Mégane', 'Captur', 'Kadjar', 'Austral', 'Arkana', 'Scénic', 'Kangoo', 'Zoe', 'Laguna'],
  Seat: ['Ibiza', 'León', 'Arona', 'Ateca', 'Tarraco', 'Toledo', 'Altea', 'Mii', 'Córdoba'],
  Skoda: ['Fabia', 'Scala', 'Octavia', 'Kamiq', 'Karoq', 'Kodiaq', 'Superb'],
  Suzuki: ['Swift', 'Ignis', 'Vitara', 'S-Cross'],
  Tesla: ['Model 3', 'Model Y', 'Model S'],
  Toyota: ['Aygo', 'Yaris', 'Yaris Cross', 'Corolla', 'Auris', 'C-HR', 'RAV4', 'Prius'],
  Volkswagen: ['Up!', 'Polo', 'Golf', 'T-Cross', 'T-Roc', 'Tiguan', 'Touran', 'Passat', 'ID.3', 'ID.4'],
  Volvo: ['V40', 'XC40', 'XC60', 'XC90'],
};

export const CAR_MAKES: readonly string[] = Object.keys(CAR_CATALOG).sort((a, b) => a.localeCompare(b, 'es'));

/** Minúsculas y sin tildes, para comparar «citroen» con «Citroën». */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Sugerencias que empiezan por lo escrito primero y después las que lo contienen. Máximo `limit`. */
export function suggest(options: readonly string[], query: string, limit = 6): string[] {
  const q = normalizeText(query);
  if (q === '') return options.slice(0, limit);
  const starts: string[] = [];
  const contains: string[] = [];
  for (const option of options) {
    const n = normalizeText(option);
    if (n === q) continue; // Ya está escrito tal cual: no hace falta sugerirlo.
    if (n.startsWith(q)) starts.push(option);
    else if (n.includes(q)) contains.push(option);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** La marca del catálogo que coincide con lo escrito (sin distinguir tildes ni mayúsculas), o null. */
export function findMake(text: string): string | null {
  const n = normalizeText(text);
  return CAR_MAKES.find((make) => normalizeText(make) === n) ?? null;
}

/** Modelos de una marca escrita a mano (vacío si la marca no está en el catálogo). */
export function modelsFor(makeText: string): readonly string[] {
  const make = findMake(makeText);
  return make ? (CAR_CATALOG[make] ?? []) : [];
}

/** «Renault Clio V», «Renault Clio» o «Coche» si no hay datos. */
export function carModelTitle(make: string | null | undefined, model: string | null | undefined, version?: string | null): string {
  const parts = [make, model, version].map((part) => part?.trim() ?? '').filter((part) => part !== '');
  return parts.length > 0 ? parts.join(' ') : 'Coche';
}
