import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { Screen } from './Screen';
import { ScreenHeader } from './ScreenHeader';
import type { IconName } from './TabIcon';

type Props = {
  title: string;
  /** Qué habrá en esta pantalla, en una frase. */
  description: string;
  icon: IconName;
  /** Lo que se verá aquí, como título del estado vacío. */
  emptyTitle: string;
  /** Sprint en el que se implementa, por ejemplo 2. */
  sprint?: number;
  back?: boolean;
};

/** Pantalla provisional mientras se implementa la issue correspondiente. */
export function PlaceholderScreen({ title, description, icon, emptyTitle, sprint, back = false }: Props) {
  return (
    <Screen>
      <ScreenHeader title={title} back={back} />
      <EmptyState icon={icon} title={emptyTitle} description={description} />
      {sprint !== undefined ? (
        <View style={styles.badge}>
          <Badge label={`Llega en el Sprint ${sprint}`} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', marginTop: spacing.xs },
});
