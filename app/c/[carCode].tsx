import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, type ReactNode } from 'react';

import {
  ErrorStep,
  LoadingStep,
  PendingStep,
  ProfileStep,
  RejectedStep,
  SeatStep,
  WelcomeStep,
} from '@/components/entrada/JoinSteps';
import { PlaceholderScreen, Screen } from '@/components/ui';
import { useJoinFlow } from '@/hooks/useJoinFlow';
import { normalizeCarCode } from '@/lib/carCode';
import { RPC_MESSAGES } from '@/lib/errors';

/**
 * Destino de la URL de la pegatina: https://<dominio>/c/<codigo_coche> (S1-06).
 * Guía al pasajero en 4 pasos hasta la sala: bienvenida, nombre y personaje, asiento y confirmación.
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
  return <JoinFlow code={code} />;
}

function JoinFlow({ code }: { code: string }) {
  const flow = useJoinFlow(code);
  const { state } = flow;
  const sessionId = state.preview?.session_id;

  useEffect(() => {
    if (state.step === 'dentro' && sessionId) {
      router.replace({ pathname: '/sala/[sessionId]', params: { sessionId } });
    }
  }, [state.step, sessionId]);

  const preview = state.preview;
  let content: ReactNode = null;
  switch (state.step) {
    case 'cargando':
    case 'dentro':
      content = <LoadingStep />;
      break;
    case 'error':
      content = <ErrorStep message={state.error ?? 'No se ha podido cargar el viaje.'} onRetry={flow.retry} />;
      break;
    case 'bienvenida':
      content = preview ? <WelcomeStep preview={preview} onEnter={flow.start} /> : <LoadingStep />;
      break;
    case 'perfil':
      content = (
        <ProfileStep
          name={state.name}
          avatarKind={state.avatarKind}
          avatarValue={state.avatarValue}
          uploading={flow.uploading}
          notice={state.notice}
          onName={flow.setName}
          onAvatar={flow.setAvatar}
          onPickPhoto={flow.pickPhoto}
          onNext={flow.profileDone}
          onBack={flow.back}
        />
      );
      break;
    case 'asiento':
    case 'enviando':
      content = preview ? (
        <SeatStep
          preview={preview}
          seat={state.seat}
          submitting={state.step === 'enviando'}
          notice={state.notice}
          onSeat={flow.setSeat}
          onSubmit={flow.submit}
          onBack={flow.back}
        />
      ) : (
        <LoadingStep />
      );
      break;
    case 'pendiente':
      content = <PendingStep driverName={preview?.driver_name ?? 'el conductor'} />;
      break;
    case 'rechazado':
      content = <RejectedStep message={RPC_MESSAGES.JOIN_REJECTED} onHome={() => router.replace('/')} />;
      break;
  }

  return <Screen>{content}</Screen>;
}
