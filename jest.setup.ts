// El tema guarda la apariencia con AsyncStorage, que no existe fuera del móvil.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
