import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { suggest } from '@/lib/carCatalog';
import { spacing } from '@/theme';

import { Chip } from './Chip';
import { TextField } from './TextField';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  error?: string | undefined;
  hint?: string;
  maxLength?: number;
};

/**
 * Campo de texto libre con sugerencias debajo (sin desplegable flotante, para que funcione
 * igual en Android y en la web). Las sugerencias aparecen solo mientras se escribe.
 */
export function SuggestField({ label, value, onChange, options, placeholder, error, hint, maxLength }: Props) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => (focused ? suggest(options, value, 6) : []), [focused, options, value]);

  return (
    <View style={styles.wrapper}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        error={error}
        hint={hint}
        maxLength={maxLength}
        autoCapitalize="words"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        // Pequeño retraso para que el toque en una sugerencia llegue antes de ocultarlas.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {suggestions.length > 0 ? (
        <View style={styles.suggestions} accessibilityLabel={`Sugerencias para ${label}`}>
          {suggestions.map((option) => (
            <Chip key={option} label={option} role="button" onPress={() => onChange(option)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
