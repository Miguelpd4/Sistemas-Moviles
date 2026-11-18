/** «¿Quién es más probable que…?» (S2-09): banco de preguntas y elección sin repetir. */

export type ProbableQuestion = { id: string; text: string };

/** 60 preguntas aptas para todos. Los id no se cambian: se guardan en las rondas. */
export const PROBABLE_QUESTIONS: readonly ProbableQuestion[] = [
  { id: 'p01', text: '¿Quién es más probable que se duerma antes de llegar?' },
  { id: 'p02', text: '¿Quién es más probable que pida parar para ir al baño?' },
  { id: 'p03', text: '¿Quién es más probable que ponga la canción más vergonzosa?' },
  { id: 'p04', text: '¿Quién es más probable que se pierda aunque lleve GPS?' },
  { id: 'p05', text: '¿Quién es más probable que llegue tarde a su propia boda?' },
  { id: 'p06', text: '¿Quién es más probable que se coma todo lo que hay en la guantera?' },
  { id: 'p07', text: '¿Quién es más probable que cante a gritos en un atasco?' },
  { id: 'p08', text: '¿Quién es más probable que olvide algo importante en casa?' },
  { id: 'p09', text: '¿Quién es más probable que haga una foto de cada paisaje?' },
  { id: 'p10', text: '¿Quién es más probable que se maree en las curvas?' },
  { id: 'p11', text: '¿Quién es más probable que pregunte «¿cuánto queda?» cada diez minutos?' },
  { id: 'p12', text: '¿Quién es más probable que se ría en el peor momento?' },
  { id: 'p13', text: '¿Quién es más probable que gane un concurso de la tele?' },
  { id: 'p14', text: '¿Quién es más probable que monte su propia empresa?' },
  { id: 'p15', text: '¿Quién es más probable que viva en otro país dentro de diez años?' },
  { id: 'p16', text: '¿Quién es más probable que adopte cinco perros?' },
  { id: 'p17', text: '¿Quién es más probable que se apunte a un maratón y lo termine?' },
  { id: 'p18', text: '¿Quién es más probable que escriba un libro?' },
  { id: 'p19', text: '¿Quién es más probable que salga en las noticias?' },
  { id: 'p20', text: '¿Quién es más probable que se olvide del cumpleaños de su madre?' },
  { id: 'p21', text: '¿Quién es más probable que coma pizza con piña sin remordimientos?' },
  { id: 'p22', text: '¿Quién es más probable que duerma hasta mediodía un lunes?' },
  { id: 'p23', text: '¿Quién es más probable que se haga famoso en internet?' },
  { id: 'p24', text: '¿Quién es más probable que deje el móvil sin batería en mitad del viaje?' },
  { id: 'p25', text: '¿Quién es más probable que cuente el mismo chiste dos veces?' },
  { id: 'p26', text: '¿Quién es más probable que se emocione con una película de dibujos?' },
  { id: 'p27', text: '¿Quién es más probable que discuta con el GPS?' },
  { id: 'p28', text: '¿Quién es más probable que aprenda a tocar un instrumento por su cuenta?' },
  { id: 'p29', text: '¿Quién es más probable que organice el próximo viaje?' },
  { id: 'p30', text: '¿Quién es más probable que se compre un coche demasiado caro?' },
  { id: 'p31', text: '¿Quién es más probable que pierda las llaves esta semana?' },
  { id: 'p32', text: '¿Quién es más probable que se ofrezca a conducir y luego se arrepienta?' },
  { id: 'p33', text: '¿Quién es más probable que conozca a alguien famoso por casualidad?' },
  { id: 'p34', text: '¿Quién es más probable que tenga la mejor música del coche?' },
  { id: 'p35', text: '¿Quién es más probable que haga amigos en una gasolinera?' },
  { id: 'p36', text: '¿Quién es más probable que se apunte a cualquier plan sin preguntar?' },
  { id: 'p37', text: '¿Quién es más probable que llegue el primero a todas partes?' },
  { id: 'p38', text: '¿Quién es más probable que cambie de canción antes de que acabe?' },
  { id: 'p39', text: '¿Quién es más probable que se lleve demasiada ropa para un fin de semana?' },
  { id: 'p40', text: '¿Quién es más probable que pruebe la comida más rara del menú?' },
  { id: 'p41', text: '¿Quién es más probable que se quede dormido en el cine?' },
  { id: 'p42', text: '¿Quién es más probable que gane a todos a las cartas?' },
  { id: 'p43', text: '¿Quién es más probable que tenga una idea genial a las tres de la mañana?' },
  { id: 'p44', text: '¿Quién es más probable que se haga vegetariano y aguante un año?' },
  { id: 'p45', text: '¿Quién es más probable que dé la vuelta al mundo?' },
  { id: 'p46', text: '¿Quién es más probable que se ponga a bailar en una boda antes que nadie?' },
  { id: 'p47', text: '¿Quién es más probable que recuerde todas las letras de las canciones?' },
  { id: 'p48', text: '¿Quién es más probable que pida perdón aunque no tenga la culpa?' },
  { id: 'p49', text: '¿Quién es más probable que tenga más plantas en casa?' },
  { id: 'p50', text: '¿Quién es más probable que sea el mejor cocinero del grupo?' },
  { id: 'p51', text: '¿Quién es más probable que se ofrezca voluntario para todo?' },
  { id: 'p52', text: '¿Quién es más probable que vea una serie entera en un día?' },
  { id: 'p53', text: '¿Quién es más probable que se invente una palabra y la ponga de moda?' },
  { id: 'p54', text: '¿Quién es más probable que haga reír a un desconocido?' },
  { id: 'p55', text: '¿Quién es más probable que monte el mejor plan de cumpleaños?' },
  { id: 'p56', text: '¿Quién es más probable que se lleve bien con todos los perros?' },
  { id: 'p57', text: '¿Quién es más probable que aprenda un idioma nuevo este año?' },
  { id: 'p58', text: '¿Quién es más probable que saque la mejor nota sin estudiar?' },
  { id: 'p59', text: '¿Quién es más probable que se ponga nervioso al hablar en público?' },
  { id: 'p60', text: '¿Quién es más probable que se acuerde de este viaje dentro de veinte años?' },
];

/** Tiempo para votar en cada ronda. */
export const PROBABLE_SECONDS = 30;

/**
 * Una pregunta que no se haya usado en esta sesión, o null si ya han salido todas.
 * `random` devuelve un número en [0, 1), como Math.random (se pasa para poder probarlo).
 */
export function pickQuestion(usedIds: Iterable<string>, random: () => number = Math.random): ProbableQuestion | null {
  const used = new Set(usedIds);
  const left = PROBABLE_QUESTIONS.filter((question) => !used.has(question.id));
  if (left.length === 0) return null;
  const index = Math.min(left.length - 1, Math.floor(random() * left.length));
  return left[index] ?? null;
}
