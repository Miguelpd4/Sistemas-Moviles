/**
 * Emisor de eventos tipado (S2-02). Los avisos de Broadcast pasan por aquí para que solo el
 * componente suscrito a un evento vuelva a pintarse, no toda la sala.
 */
export type Handler<T> = (payload: T) => void;

export type Emitter<Events extends Record<string, unknown>> = {
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
  clear(): void;
};

export function createEmitter<Events extends Record<string, unknown>>(): Emitter<Events> {
  const handlers = new Map<keyof Events, Set<Handler<never>>>();

  return {
    on(event, handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler as Handler<never>);
      return () => {
        set.delete(handler as Handler<never>);
      };
    },
    emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      // Copia: un handler puede desuscribirse mientras se recorre la lista.
      for (const handler of [...set]) {
        try {
          (handler as Handler<typeof payload>)(payload);
        } catch {
          // Un handler roto no debe impedir que lleguen los demás.
        }
      }
    },
    clear() {
      handlers.clear();
    },
  };
}
