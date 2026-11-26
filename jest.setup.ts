// El tema guarda la apariencia con AsyncStorage, que no existe fuera del móvil.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated 4 (animaciones al pulsar y al aparecer): en Jest no hay hilo de UI y su simulación
// oficial no arranca, así que se sustituye por lo mínimo que usa COPI (sin animar).
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  const Animated = { View: RN.View, Text: RN.Text, Image: RN.Image, ScrollView: RN.ScrollView, createAnimatedComponent: (c: unknown) => c };
  const identity = (value: unknown) => value;
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (initial: unknown) => {
      const shared = { value: initial, get: () => shared.value, set: (next: unknown) => (shared.value = next) };
      return shared;
    },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => true,
    withSpring: identity,
    withTiming: identity,
    withRepeat: identity,
    withDelay: (_delay: number, value: unknown) => value,
    withSequence: (...values: unknown[]) => values[values.length - 1],
    cancelAnimation: () => undefined,
    Easing: { out: identity, in: identity, inOut: identity, ease: identity, cubic: identity, quad: identity },
  };
});
