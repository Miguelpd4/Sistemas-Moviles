import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Screen } from './Screen';

type Props = {
  title: string;
  description: string;
};

/** Pantalla provisional mientras se implementa la issue correspondiente. */
export function PlaceholderScreen({ title, description }: Props) {
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.card}>
        <AppText color={colors.textSecondary}>{description}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
