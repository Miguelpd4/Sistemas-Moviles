let counter = 0;

/**
 * Nombre único para un canal de Realtime.
 *
 * supabase.channel(nombre) devuelve el canal que ya exista con ese nombre. Si dos pantallas
 * montadas a la vez (por ejemplo, el Modo conductor debajo de la Sala) piden el mismo nombre,
 * la segunda recibe un canal ya suscrito y `.on()` lanza «cannot add callbacks after subscribe()».
 * Con un sufijo único, cada pantalla tiene su propio canal.
 */
export function uniqueChannelName(base: string): string {
  counter += 1;
  return `${base}:${counter}-${Math.random().toString(36).slice(2, 8)}`;
}
