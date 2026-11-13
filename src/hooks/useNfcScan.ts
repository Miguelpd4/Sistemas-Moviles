import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { AppError, errorMessage } from '@/lib/errors';
import { NFC_CANCELLED, cancelRead, isNfcSupported, readCarCode } from '@/services/nfc/reader';

type NfcScan = {
  /** null mientras se comprueba si el móvil tiene NFC. */
  supported: boolean | null;
  scanning: boolean;
  error: string | null;
  /** Empieza a leer; devuelve el código o null si se cancela o falla (el error queda en `error`). */
  start: () => Promise<string | null>;
  cancel: () => void;
  clearError: () => void;
};

export function useNfcScan(): NfcScan {
  const [supported, setSupported] = useState<boolean | null>(Platform.OS === 'android' ? null : false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (Platform.OS === 'android') {
      void isNfcSupported().then((value) => {
        if (mounted.current) setSupported(value);
      });
    }
    return () => {
      mounted.current = false;
      void cancelRead();
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setScanning(true);
    try {
      return await readCarCode();
    } catch (err) {
      if (!(err instanceof AppError && err.code === NFC_CANCELLED) && mounted.current) {
        setError(errorMessage(err));
      }
      return null;
    } finally {
      if (mounted.current) setScanning(false);
    }
  }, []);

  const cancel = useCallback(() => {
    void cancelRead();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { supported, scanning, error, start, cancel, clearError };
}
