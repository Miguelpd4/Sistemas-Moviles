import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/ui';
import { normalizeCarCode } from '@/lib/carCode';

/**
 * Destino de la URL de la pegatina: https://<dominio>/c/<codigo_coche>.
 * TODO(entrada): buscar la sesión activa en Supabase y abrir el lobby tipo Kahoot.
 */
export default function PegatinaScreen() {
  const { carCode } = useLocalSearchParams<{ carCode: string }>();
  const code = normalizeCarCode(carCode);

  if (code === null) {
    return (
      <PlaceholderScreen
        title="Pegatina no válida"
        description="No hemos reconocido el código de este coche. Prueba a tocar la pegatina otra vez o escanea el QR del conductor."
      />
    );
  }

  return (
    <PlaceholderScreen
      title="Uniéndote al coche"
      description={`Código del coche: ${code}. Pronto entrarás en la sala desde aquí.`}
    />
  );
}
