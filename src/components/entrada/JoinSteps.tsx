import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SeatMap } from '@/components/sala/SeatMap';
import { AppText, Button, Card, Notice, TextField } from '@/components/ui';
import type { AvatarKind } from '@/lib/avatars';
import { freeSeats, seatLabel } from '@/lib/seats';
import { colors, spacing } from '@/theme';
import type { SessionPreview } from '@/types/session';

import { AvatarPicker } from './AvatarPicker';

/** Pasos de la entrada tipo Kahoot (S1-06). Cada uno es un componente sin estado propio. */

export function LoadingStep() {
  return (
    <View style={styles.centered} accessibilityLabel="Cargando el viaje">
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText color={colors.textSecondary}>Buscando el viaje de este coche…</AppText>
    </View>
  );
}

export function ErrorStep({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.block}>
      <Ionicons name="car-outline" size={56} color={colors.textSecondary} />
      <AppText variant="title" accessibilityRole="header">
        No se puede entrar ahora
      </AppText>
      <Notice message={message} />
      <Button label="Reintentar" onPress={onRetry} />
    </View>
  );
}

export function WelcomeStep({ preview, onEnter }: { preview: SessionPreview; onEnter: () => void }) {
  return (
    <View style={styles.block}>
      <AppText color={colors.textSecondary}>¡Hola!</AppText>
      <AppText variant="display" accessibilityRole="header">
        Estás en el coche de {preview.driver_name}
      </AppText>
      <Card>
        <AppText variant="heading">{preview.car_name}</AppText>
        <AppText color={colors.textSecondary}>
          {preview.taken_seats.length} de {preview.seats} plazas ocupadas
          {preview.join_mode === 'aprobacion' ? ' · el conductor acepta a cada pasajero' : ''}
        </AppText>
      </Card>
      <Button label="Entrar" onPress={onEnter} />
    </View>
  );
}

type ProfileStepProps = {
  name: string;
  avatarKind: AvatarKind;
  avatarValue: string;
  uploading: boolean;
  notice: string | null;
  onName: (name: string) => void;
  onAvatar: (kind: AvatarKind, value: string) => void;
  onPickPhoto: () => void;
  onNext: () => void;
  onBack: () => void;
};

export function ProfileStep(props: ProfileStepProps) {
  return (
    <View style={styles.block}>
      <AppText variant="title" accessibilityRole="header">
        ¿Cómo te llamas?
      </AppText>
      <TextField
        label="Tu nombre"
        value={props.name}
        onChangeText={props.onName}
        placeholder="Por ejemplo, Lucía"
        autoCapitalize="words"
        autoComplete="given-name"
        maxLength={30}
        returnKeyType="done"
        onSubmitEditing={props.onNext}
      />
      <AppText variant="heading">Elige tu personaje</AppText>
      <AvatarPicker
        kind={props.avatarKind}
        value={props.avatarValue}
        onSelect={props.onAvatar}
        onPickPhoto={props.onPickPhoto}
        uploading={props.uploading}
      />
      {props.notice !== null ? <Notice message={props.notice} /> : null}
      <Button label="Siguiente" onPress={props.onNext} disabled={props.uploading} />
      <Button label="Atrás" variant="secondary" onPress={props.onBack} />
    </View>
  );
}

type SeatStepProps = {
  preview: SessionPreview;
  seat: number | null;
  submitting: boolean;
  notice: string | null;
  onSeat: (seat: number | null) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export function SeatStep({ preview, seat, submitting, notice, onSeat, onSubmit, onBack }: SeatStepProps) {
  const noneFree = freeSeats(preview.seats, preview.taken_seats).length === 0;
  return (
    <View style={styles.block}>
      <AppText variant="title" accessibilityRole="header">
        ¿Dónde te sientas?
      </AppText>
      <SeatMap seats={preview.seats} taken={preview.taken_seats} selected={seat} onSelect={onSeat} />
      <AppText color={colors.textSecondary} style={styles.center}>
        {seat !== null ? `Has elegido: ${seatLabel(seat)}` : noneFree ? 'No quedan asientos libres: puedes entrar sin asiento.' : 'Toca un asiento libre.'}
      </AppText>
      {notice !== null ? <Notice message={notice} /> : null}
      <Button
        label={seat === null && noneFree ? 'Entrar sin asiento' : 'Confirmar'}
        onPress={onSubmit}
        loading={submitting}
        disabled={seat === null && !noneFree}
      />
      <Button label="Atrás" variant="secondary" onPress={onBack} disabled={submitting} />
    </View>
  );
}

export function PendingStep({ driverName }: { driverName: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="title" accessibilityRole="header" style={styles.center}>
        Esperando a que {driverName} te acepte
      </AppText>
      <AppText color={colors.textSecondary} style={styles.center}>
        Entrarás en la sala en cuanto te acepten. No cierres esta pantalla.
      </AppText>
    </View>
  );
}

export function RejectedStep({ message, onHome }: { message: string; onHome: () => void }) {
  return (
    <View style={styles.block}>
      <AppText variant="title" accessibilityRole="header">
        No has entrado en este viaje
      </AppText>
      <Notice message={message} />
      <Button label="Volver al inicio" variant="secondary" onPress={onHome} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  centered: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  center: { textAlign: 'center' },
});
