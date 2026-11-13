import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Notice, TextField } from '@/components/ui';
import {
  FUEL_TYPES,
  MAX_SEATS,
  MIN_SEATS,
  hasErrors,
  validateCarForm,
  type CarFormErrors,
  type CarFormValues,
} from '@/lib/carForm';
import { errorMessage } from '@/lib/errors';
import { pickImage } from '@/services/media/pickImage';
import type { Car } from '@/services/supabase/cars';
import { publicUrl } from '@/services/supabase/storage';
import { colors, radius, spacing } from '@/theme';

type Props = {
  car: Car | null;
  onSave: (values: CarFormValues, newPhotoUri: string | null) => Promise<unknown>;
};

function initialValues(car: Car | null): CarFormValues {
  return car
    ? {
        name: car.name,
        consumption: String(car.consumption_l_100km).replace('.', ','),
        fuelType: car.fuel_type,
        seats: car.seats,
      }
    : { name: '', consumption: '', fuelType: null, seats: 5 };
}

/** Datos del coche: nombre, consumo, combustible, plazas y foto (S1-07). */
export function CarForm({ car, onSave }: Props) {
  const [values, setValues] = useState<CarFormValues>(() => initialValues(car));
  const [errors, setErrors] = useState<CarFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);

  const change = (patch: Partial<CarFormValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    setMessage(null);
    if (submitted) setErrors(validateCarForm(next));
  };

  const choosePhoto = async () => {
    try {
      const uri = await pickImage({ square: false });
      if (uri !== null) setPhotoUri(uri);
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: 'error' });
    }
  };

  const submit = async () => {
    setSubmitted(true);
    const found = validateCarForm(values);
    setErrors(found);
    if (hasErrors(found)) return;
    setSaving(true);
    setMessage(null);
    try {
      await onSave(values, photoUri);
      setPhotoUri(null);
      setMessage({ text: car ? 'Cambios guardados.' : 'Coche registrado.', tone: 'success' });
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const shownPhoto = photoUri ?? (car?.photo_path ? publicUrl('coches', car.photo_path) : null);

  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {car ? 'Tu coche' : 'Registra tu coche'}
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shownPhoto ? 'Cambiar la foto del coche' : 'Añadir una foto del coche (opcional)'}
        onPress={choosePhoto}
        style={styles.photo}
      >
        {shownPhoto ? (
          <Image source={{ uri: shownPhoto }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
            <AppText color={colors.textSecondary}>Foto del coche (opcional)</AppText>
          </View>
        )}
      </Pressable>

      <TextField label="Nombre del coche" value={values.name} onChangeText={(name) => change({ name })} error={errors.name} placeholder="Por ejemplo, El Ibiza de Ana" maxLength={40} />
      <TextField
        label="Consumo medio (litros cada 100 km)"
        value={values.consumption}
        onChangeText={(consumption) => change({ consumption })}
        error={errors.consumption}
        keyboardType="decimal-pad"
        placeholder="6,5"
      />

      <View style={styles.group}>
        <AppText variant="caption" color={colors.textSecondary}>
          Combustible
        </AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {FUEL_TYPES.map((fuel) => {
            const selected = values.fuelType === fuel.value;
            return (
              <Pressable
                key={fuel.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => change({ fuelType: fuel.value })}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <AppText variant="bodyStrong" color={selected ? colors.textOnPrimary : colors.text}>
                  {fuel.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {errors.fuelType ? (
          <AppText variant="caption" color={colors.danger}>
            {errors.fuelType}
          </AppText>
        ) : null}
      </View>

      <View style={styles.group}>
        <AppText variant="caption" color={colors.textSecondary}>
          Plazas (conductor incluido)
        </AppText>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Una plaza menos"
            disabled={values.seats <= MIN_SEATS}
            onPress={() => change({ seats: values.seats - 1 })}
            style={[styles.stepButton, values.seats <= MIN_SEATS && styles.disabled]}
          >
            <Ionicons name="remove" size={24} color={colors.text} />
          </Pressable>
          <AppText variant="title" accessibilityLiveRegion="polite" accessibilityLabel={`${values.seats} plazas`}>
            {values.seats}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Una plaza más"
            disabled={values.seats >= MAX_SEATS}
            onPress={() => change({ seats: values.seats + 1 })}
            style={[styles.stepButton, values.seats >= MAX_SEATS && styles.disabled]}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {message !== null ? <Notice message={message.text} tone={message.tone} /> : null}
      <Button label={car ? 'Guardar cambios' : 'Registrar coche'} onPress={submit} loading={saving} />
    </Card>
  );
}

const styles = StyleSheet.create({
  photo: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceStrong },
  photoImage: { width: '100%', aspectRatio: 4 / 3 },
  photoEmpty: { aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
