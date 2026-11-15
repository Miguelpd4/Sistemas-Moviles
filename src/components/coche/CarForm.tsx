import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, FormSection, Notice, SuggestField, TextField } from '@/components/ui';
import { CAR_MAKES, carModelTitle, modelsFor } from '@/lib/carCatalog';
import {
  FUEL_TYPES,
  MAX_SEATS,
  MIN_SEATS,
  hasErrors,
  validateCarForm,
  type CarFormErrors,
  type CarFormValues,
} from '@/lib/carForm';
import { isCarColor } from '@/lib/carColors';
import { errorMessage } from '@/lib/errors';
import { pickImage } from '@/services/media/pickImage';
import type { Car } from '@/services/supabase/cars';
import type { CarLook } from '@/services/supabase/sessions';
import { radius, spacing, useTheme } from '@/theme';

import { CarHero } from './CarHero';
import { ColorSwatches } from './ColorSwatches';

type Props = {
  car: Car | null;
  onSave: (values: CarFormValues, newPhotoUri: string | null) => Promise<unknown>;
};

function initialValues(car: Car | null): CarFormValues {
  return car
    ? {
        name: car.name,
        make: car.make ?? '',
        model: car.model ?? '',
        version: car.version ?? '',
        color: isCarColor(car.color) ? car.color : null,
        consumption: String(car.consumption_l_100km).replace('.', ','),
        fuelType: car.fuel_type,
        seats: car.seats,
      }
    : { name: '', make: '', model: '', version: '', color: null, consumption: '', fuelType: null, seats: 5 };
}

/** Nombre que se propone mientras el conductor no escriba uno: «Clio de Ana» no lo sabemos, «Mi Clio» sí. */
function suggestedName(model: string): string {
  const clean = model.trim();
  return clean ? `Mi ${clean}` : '';
}

/**
 * Datos del coche (S1-07). Arriba, la vista previa: el coche cambia de color y de nombre según se
 * rellena el formulario, y al guardar se busca la foto del modelo.
 */
export function CarForm({ car, onSave }: Props) {
  const { colors } = useTheme();
  const [values, setValues] = useState<CarFormValues>(() => initialValues(car));
  const [nameTouched, setNameTouched] = useState(car !== null);
  const [errors, setErrors] = useState<CarFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);

  const change = (patch: Partial<CarFormValues>) => {
    setValues((current) => {
      const next = { ...current, ...patch };
      if (!nameTouched && patch.model !== undefined) next.name = suggestedName(next.model);
      if (submitted) setErrors(validateCarForm(next));
      return next;
    });
    setMessage(null);
  };

  const models = useMemo(() => modelsFor(values.make), [values.make]);

  // La foto del modelo guardada solo vale si marca, modelo y versión no han cambiado.
  const sameModel =
    car !== null &&
    (car.make ?? '') === values.make.trim() &&
    (car.model ?? '') === values.model.trim() &&
    (car.version ?? '') === values.version.trim();

  const preview: CarLook = {
    name: values.name.trim() || 'Tu coche',
    make: values.make.trim() || null,
    model: values.model.trim() || null,
    version: values.version.trim() || null,
    color: values.color,
    photoPath: car?.photo_path ?? null,
    imageUrl: sameModel ? car.model_image_url : null,
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
    if (hasErrors(found)) {
      setMessage({ text: 'Revisa los campos marcados en rojo.', tone: 'error' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await onSave(values, photoUri);
      setPhotoUri(null);
      setMessage({ text: car ? 'Cambios guardados.' : 'Coche registrado. Ya puedes grabar la pegatina.', tone: 'success' });
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const hasOwnPhoto = photoUri !== null || car?.photo_path != null;
  const modelChanged = car !== null && !sameModel && values.model.trim() !== '';

  return (
    <View style={styles.form}>
      <CarHero
        car={preview}
        code={car?.nfc_code ?? null}
        overline={car ? 'Así lo verán los pasajeros' : 'Vista previa'}
        extra={`${values.seats} plazas`}
        localUri={photoUri}
      >
        {modelChanged || (car === null && values.model.trim() !== '') ? (
          <AppText variant="caption" color={colors.primaryText}>
            Al guardar buscaremos una foto del {carModelTitle(values.make, values.model, values.version)}.
          </AppText>
        ) : null}
      </CarHero>

      <FormSection title="Qué coche es" description="Escribe la marca y toca una sugerencia. Con el modelo buscamos su foto.">
        <SuggestField
          label="Marca"
          value={values.make}
          onChange={(make) => change({ make })}
          options={CAR_MAKES}
          placeholder="Renault"
          error={errors.make}
          maxLength={30}
        />
        <SuggestField
          label="Modelo"
          value={values.model}
          onChange={(model) => change({ model })}
          options={models}
          placeholder="Clio"
          error={errors.model}
          maxLength={40}
        />
        <TextField
          label="Versión o generación (opcional)"
          value={values.version}
          onChangeText={(version) => change({ version })}
          placeholder="V, 2019, Sport Tourer…"
          error={errors.version}
          maxLength={40}
        />
        <View style={styles.group}>
          <AppText variant="label" color={colors.textSecondary}>
            Color
          </AppText>
          <ColorSwatches value={values.color} onChange={(color) => change({ color })} />
        </View>
        <TextField
          label="Nombre en la app"
          value={values.name}
          onChangeText={(name) => {
            setNameTouched(true);
            change({ name });
          }}
          error={errors.name}
          hint="Es lo que verán los pasajeros al tocar la pegatina."
          placeholder="El Clio de Ana"
          maxLength={40}
        />
      </FormSection>

      <FormSection title="Para repartir la gasolina" description="Con esto calculamos cuánto cuesta cada viaje.">
        <TextField
          label="Consumo medio (litros cada 100 km)"
          value={values.consumption}
          onChangeText={(consumption) => change({ consumption })}
          error={errors.consumption}
          keyboardType="decimal-pad"
          placeholder="6,5"
        />
        <View style={styles.group}>
          <AppText variant="label" color={colors.textSecondary}>
            Combustible
          </AppText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {FUEL_TYPES.map((fuel) => (
              <Chip
                key={fuel.value}
                label={fuel.label}
                selected={values.fuelType === fuel.value}
                onPress={() => change({ fuelType: fuel.value })}
              />
            ))}
          </View>
          {errors.fuelType ? (
            <AppText variant="caption" color={colors.danger}>
              {errors.fuelType}
            </AppText>
          ) : null}
        </View>
      </FormSection>

      <FormSection title="Plazas" description="Conductor incluido. Son los asientos que verán los pasajeros.">
        <View style={styles.stepper}>
          <StepButton
            icon="remove"
            label="Una plaza menos"
            disabled={values.seats <= MIN_SEATS}
            onPress={() => change({ seats: values.seats - 1 })}
          />
          <View style={styles.stepValue}>
            <AppText variant="hero" accessibilityLiveRegion="polite" accessibilityLabel={`${values.seats} plazas`}>
              {values.seats}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              plazas
            </AppText>
          </View>
          <StepButton
            icon="add"
            label="Una plaza más"
            disabled={values.seats >= MAX_SEATS}
            onPress={() => change({ seats: values.seats + 1 })}
          />
        </View>
      </FormSection>

      <FormSection
        title="Foto propia"
        description="Opcional. Si subes una foto de tu coche, se usa en lugar de la del modelo."
      >
        <Button
          label={hasOwnPhoto ? 'Cambiar la foto' : 'Elegir una foto'}
          icon="camera-outline"
          variant="secondary"
          onPress={choosePhoto}
        />
      </FormSection>

      {message !== null ? <Notice message={message.text} tone={message.tone} /> : null}
      <Button label={car ? 'Guardar cambios' : 'Registrar coche'} size="lg" onPress={submit} loading={saving} />
    </View>
  );
}

type StepButtonProps = {
  icon: 'add' | 'remove';
  label: string;
  disabled: boolean;
  onPress: () => void;
};

function StepButton({ icon, label, disabled, onPress }: StepButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: pressed ? colors.primary : colors.surfaceStrong },
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={26} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepValue: { alignItems: 'center' },
  stepButton: { width: 60, height: 60, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
});
