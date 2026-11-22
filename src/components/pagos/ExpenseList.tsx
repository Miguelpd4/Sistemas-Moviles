import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Notice } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { kindLabel } from '@/lib/expenseForm';
import { formatEuros } from '@/lib/format';
import type { Expense } from '@/services/supabase/payments';
import { ticketUrl } from '@/services/supabase/storage';
import { radius, spacing, useTheme } from '@/theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  combustible: 'flame-outline',
  peaje: 'trail-sign-outline',
  parking: 'car-outline',
  otro: 'receipt-outline',
};

type Props = {
  expenses: readonly Expense[];
  names: Record<string, string>;
  myId: string | null;
  /** Mientras dura el viaje, cada uno puede quitar los suyos. */
  onRemove?: (id: string) => Promise<void>;
};

/** Gastos del viaje (#26): gasolina y extras, quién los pagó y la foto del ticket. */
export function ExpenseList({ expenses, names, myId, onRemove }: Props) {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  const openTicket = (path: string) => {
    setError(null);
    ticketUrl(path)
      .then((url) => Linking.openURL(url))
      .catch((err: unknown) => setError(errorMessage(err, 'No se ha podido abrir el ticket.')));
  };

  if (expenses.length === 0) {
    return (
      <AppText color={colors.textSecondary}>
        Aún no hay peajes ni parking. Si alguien paga uno, que lo añada aquí con la foto del ticket.
      </AppText>
    );
  }

  return (
    <View style={styles.list}>
      {error ? <Notice message={error} /> : null}
      {expenses.map((expense) => {
        const who = expense.paid_by === myId ? 'Tú' : (names[expense.paid_by] ?? 'Alguien');
        const title = expense.description ? `${kindLabel(expense.kind)} · ${expense.description}` : kindLabel(expense.kind);
        return (
          <View key={expense.id} style={[styles.row, { backgroundColor: colors.surface }]} accessible accessibilityLabel={`${title}, ${formatEuros(expense.amount_cents)}, pagó ${who}`}>
            <Ionicons name={ICONS[expense.kind] ?? 'receipt-outline'} size={22} color={colors.primary} />
            <View style={styles.text}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {title}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {formatEuros(expense.amount_cents)} · pagó {who}
              </AppText>
            </View>
            {expense.receipt_path ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Ver el ticket" hitSlop={8} onPress={() => openTicket(expense.receipt_path ?? '')}>
                <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            {onRemove && expense.paid_by === myId && expense.kind !== 'combustible' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${title}`}
                hitSlop={8}
                onPress={() => void onRemove(expense.id).catch((err: unknown) => setError(errorMessage(err)))}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  text: { flex: 1, gap: 2 },
});
