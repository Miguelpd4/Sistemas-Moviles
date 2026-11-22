import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { LicensePlate } from '@/components/coche/LicensePlate';
import { AppText, Avatar, Button } from '@/components/ui';
import { formatPlate } from '@/lib/games/matriculas';
import { plate as plateColors, radius, spacing, typography, useTheme } from '@/theme';

/** Cazamatrículas (#48): escribir la matrícula vista, quién va encontrando la suya y el ranking. */

type Person = { id: string; name: string; avatarKind: string; avatarValue: string };

type EntryProps = {
  disabled: boolean;
  /** Mi matrícula si ya la he encontrado. */
  found: { plate: string; points: number } | null;
  onSubmit: (text: string) => Promise<boolean>;
};

export function PlateEntry({ disabled, found, onSubmit }: EntryProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  if (found) {
    return (
      <View style={[styles.found, { backgroundColor: colors.primarySoft }]} accessible accessibilityLabel={`Cazada: ${formatPlate(found.plate)}, ${found.points} puntos`}>
        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
        <AppText variant="heading">¡Cazada!</AppText>
        <LicensePlate code={formatPlate(found.plate)} size="lg" />
        <AppText variant="label" color={colors.success}>
          +{found.points} puntos
        </AppText>
      </View>
    );
  }

  const send = async () => {
    setSending(true);
    const ok = await onSubmit(text);
    setSending(false);
    if (ok) setText('');
  };

  return (
    <View style={styles.entry}>
      <View style={styles.plateBox}>
        <View style={styles.band}>
          <AppText color={plateColors.bandText} style={styles.e} maxFontSizeMultiplier={1}>
            E
          </AppText>
        </View>
        <TextInput
          value={text}
          onChangeText={(value) => setText(value.toUpperCase())}
          placeholder="1234 BCD"
          placeholderTextColor={plateColors.placeholder}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
          editable={!disabled && !sending}
          returnKeyType="send"
          onSubmitEditing={() => void send()}
          accessibilityLabel="Matrícula que has visto"
          accessibilityHint="Cuatro números y tres letras, por ejemplo 1234 BCD"
          maxFontSizeMultiplier={1.3}
          style={styles.input}
        />
      </View>
      <Button
        label="¡La he visto!"
        icon="eye"
        size="lg"
        loading={sending}
        disabled={disabled || text.trim().length < 7}
        onPress={() => void send()}
      />
    </View>
  );
}

/** Quién ha cazado ya su matrícula, por orden de llegada (sin decir cuál: se ve al final). */
function PlateFindersBase({ people }: { people: readonly Person[] }) {
  const { colors } = useTheme();
  if (people.length === 0) {
    return (
      <AppText variant="caption" color={colors.textTertiary} style={styles.center}>
        Nadie la ha encontrado todavía. ¡Mirad bien los coches de alrededor!
      </AppText>
    );
  }
  return (
    <View style={styles.list}>
      {people.map((person, index) => (
        <View key={person.id} style={[styles.row, { backgroundColor: colors.surface }]} accessible accessibilityLabel={`${index + 1}º: ${person.name}`}>
          <AppText variant="heading" color={colors.primaryText} style={styles.position}>
            {index + 1}º
          </AppText>
          <Avatar kind={person.avatarKind} value={person.avatarValue} size={36} />
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {person.name}
          </AppText>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
      ))}
    </View>
  );
}
export const PlateFinders = memo(PlateFindersBase);

export type PlateRow = Person & { plate: string; position: number; points: number };

/** Resultado: cada uno con la matrícula que cazó y sus puntos. */
function PlateRankingBase({ rows }: { rows: readonly PlateRow[] }) {
  const { colors } = useTheme();
  if (rows.length === 0) {
    return (
      <AppText color={colors.textSecondary} style={styles.center}>
        Esta vez nadie ha cazado ninguna. ¡Otro reto!
      </AppText>
    );
  }
  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View
          key={row.id}
          style={[styles.row, { backgroundColor: colors.surface }]}
          accessible
          accessibilityLabel={`${row.position}º ${row.name}, matrícula ${formatPlate(row.plate)}, ${row.points} puntos`}
        >
          <AppText variant="heading" color={colors.primaryText} style={styles.position}>
            {row.position}º
          </AppText>
          <Avatar kind={row.avatarKind} value={row.avatarValue} size={36} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {row.name}
            </AppText>
            <AppText variant="caption" color={colors.success}>
              +{row.points} puntos
            </AppText>
          </View>
          <LicensePlate code={formatPlate(row.plate)} size="sm" />
        </View>
      ))}
    </View>
  );
}
export const PlateRanking = memo(PlateRankingBase);

const styles = StyleSheet.create({
  entry: { gap: spacing.sm + 2 },
  plateBox: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: plateColors.border,
    borderRadius: 8,
    backgroundColor: plateColors.background,
    overflow: 'hidden',
    minWidth: 260,
  },
  band: { width: 34, backgroundColor: plateColors.band, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  e: { fontSize: 16, lineHeight: 18 },
  input: {
    ...typography.plate,
    flex: 1,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 3,
    color: plateColors.text,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  found: { alignItems: 'center', gap: spacing.xs + 2, padding: spacing.lg, borderRadius: radius.lg },
  list: { gap: spacing.xs + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2, borderRadius: radius.md },
  position: { minWidth: 34 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
