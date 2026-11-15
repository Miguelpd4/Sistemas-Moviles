import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CarHero } from '@/components/coche/CarHero';
import { SeatLegend, SeatMap } from '@/components/sala/SeatMap';
import { AppText, Avatar, Badge, Button, Notice, StepIndicator, TextField } from '@/components/ui';
import type { AvatarKind } from '@/lib/avatars';
import { freeSeats, seatLabel } from '@/lib/seats';
import type { CarLook } from '@/services/supabase/sessions';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';
import type { SessionPreview } from '@/types/session';

import { AvatarPicker } from './AvatarPicker';

/** Pasos de la entrada tipo Kahoot (S1-06). Cada uno es un componente sin estado propio. */

const STEPS = ['Bienvenida', 'Tu personaje', 'Tu asiento'] as const;

export function previewCarLook(preview: SessionPreview): CarLook {
  return {
    name: preview.car_name,
    make: preview.car_make,
    model: preview.car_model,
    version: preview.car_version,
    color: preview.car_color,
    photoPath: preview.car_photo_path,
    imageUrl: preview.car_image_url,
  };
}

export function LoadingStep() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.centered} accessibilityLabel="Cargando el viaje">
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText color={colors.textSecondary}>Buscando el viaje de este coche…</AppText>
    </View>
  );
}

export function ErrorStep({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.block}>
      <View style={styles.bigIcon}>
        <Ionicons name="car-outline" size={44} color={colors.textSecondary} />
      </View>
      <AppText variant="display" accessibilityRole="header">
        No se puede entrar ahora
      </AppText>
      <Notice message={message} />
      <Button label="Reintentar" icon="refresh" onPress={onRetry} />
    </View>
  );
}

export function WelcomeStep({ preview, onEnter }: { preview: SessionPreview; onEnter: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const free = freeSeats(preview.seats, preview.taken_seats).length;
  return (
    <View style={styles.block}>
      <StepIndicator steps={STEPS} current={0} />
      <View style={styles.driver}>
        <View style={styles.driverAvatar}>
          <Avatar kind={preview.driver_avatar_kind} value={preview.driver_avatar_value} size={60} />
        </View>
        <View style={styles.driverText}>
          <AppText variant="label" color={colors.primaryText}>
            Estás en el coche de
          </AppText>
          <AppText variant="hero" accessibilityRole="header" numberOfLines={2}>
            {preview.driver_name}
          </AppText>
        </View>
      </View>
      <CarHero car={previewCarLook(preview)} extra={`${preview.seats} plazas`}>
        <View style={styles.badges}>
          <Badge label={preview.status === 'en_curso' ? 'En marcha' : 'Esperando pasajeros'} tone={preview.status === 'en_curso' ? 'live' : 'primary'} />
          <Badge label={free === 1 ? 'Queda 1 asiento' : `Quedan ${free} asientos`} />
          {preview.join_mode === 'aprobacion' ? <Badge label="El conductor acepta a cada uno" /> : null}
        </View>
      </CarHero>
      <Button label="Subir al coche" icon="arrow-forward" size="lg" onPress={onEnter} />
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
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const name = props.name.trim();
  return (
    <View style={styles.block}>
      <StepIndicator steps={STEPS} current={1} />
      <AppText variant="display" accessibilityRole="header">
        ¿Quién eres?
      </AppText>
      <View style={styles.me}>
        <View style={styles.meRing}>
          <Avatar kind={props.avatarKind} value={props.avatarValue} size={112} />
        </View>
        <AppText variant="title" numberOfLines={1} color={name ? colors.text : colors.textTertiary}>
          {name || 'Tu nombre'}
        </AppText>
      </View>
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
      <View style={styles.actions}>
        <Button label="Siguiente" icon="arrow-forward" size="lg" onPress={props.onNext} disabled={props.uploading} />
        <Button label="Atrás" variant="ghost" onPress={props.onBack} />
      </View>
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
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const noneFree = freeSeats(preview.seats, preview.taken_seats).length === 0;
  return (
    <View style={styles.block}>
      <StepIndicator steps={STEPS} current={2} />
      <AppText variant="display" accessibilityRole="header">
        ¿Dónde te sientas?
      </AppText>
      <SeatMap
        seats={preview.seats}
        taken={preview.taken_seats}
        selected={seat}
        onSelect={onSeat}
        paint={preview.car_color}
      />
      <SeatLegend />
      <AppText variant="bodyStrong" color={seat !== null ? colors.primaryText : colors.textSecondary} style={styles.center} accessibilityLiveRegion="polite">
        {seat !== null ? `Vas en: ${seatLabel(seat)}` : noneFree ? 'No quedan asientos libres: puedes entrar sin asiento.' : 'Toca un asiento libre.'}
      </AppText>
      {notice !== null ? <Notice message={notice} /> : null}
      <View style={styles.actions}>
        <Button
          label={seat === null && noneFree ? 'Entrar sin asiento' : preview.join_mode === 'aprobacion' ? 'Pedir entrar' : 'Entrar en la sala'}
          icon="checkmark"
          size="lg"
          onPress={onSubmit}
          loading={submitting}
          disabled={seat === null && !noneFree}
        />
        <Button label="Atrás" variant="ghost" onPress={onBack} disabled={submitting} />
      </View>
    </View>
  );
}

export function PendingStep({ driverName }: { driverName: string }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.centered}>
      <View style={styles.waiting}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
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
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.block}>
      <View style={styles.bigIcon}>
        <Ionicons name="close" size={44} color={colors.danger} />
      </View>
      <AppText variant="display" accessibilityRole="header">
        No has entrado en este viaje
      </AppText>
      <Notice message={message} />
      <Button label="Volver al inicio" variant="secondary" icon="home-outline" onPress={onHome} />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  block: { gap: spacing.lg },
  centered: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  center: { textAlign: 'center' },
  bigIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driver: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  driverText: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  driverAvatar: { padding: 3, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.primary },
  me: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  meRing: { padding: 5, borderRadius: radius.pill, borderWidth: 3, borderColor: colors.primary },
  actions: { gap: spacing.xs },
  waiting: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
