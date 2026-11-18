import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import type { QueueRow } from '@/services/supabase/queue';
import { radius, spacing, useTheme } from '@/theme';
import type { SessionMember } from '@/types/session';

import { AlbumArt } from './AlbumArt';

type Props = {
  items: QueueRow[];
  members: SessionMember[];
  myId: string | null;
  onRemove: (id: string) => void;
};

/** Las siguientes canciones, con quién las puso. Las propias se pueden quitar. */
function QueueListBase({ items, members, myId, onRemove }: Props) {
  const { colors } = useTheme();
  const byId = new Map(members.map((member) => [member.user_id, member]));

  return (
    <View style={styles.list}>
      {items.map((item, index) => {
        const who = byId.get(item.added_by);
        const mine = item.added_by === myId;
        return (
          <View key={item.id} style={[styles.row, { backgroundColor: colors.surface }]}>
            <AppText variant="heading" color={colors.textTertiary} style={styles.position}>
              {index + 1}
            </AppText>
            <AlbumArt url={item.album_art_url} size={48} radius={8} />
            <View style={styles.text}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {item.title}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {item.artist}
              </AppText>
            </View>
            {who ? (
              <View accessible accessibilityLabel={mine ? 'La has puesto tú' : `La ha puesto ${who.display_name}`}>
                <Avatar kind={who.avatar_kind} value={who.avatar_value} size={30} />
              </View>
            ) : null}
            {mine ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${item.title} de la cola`}
                onPress={() => onRemove(item.id)}
                hitSlop={8}
                style={({ pressed }) => [styles.remove, { backgroundColor: pressed ? colors.dangerSoft : 'transparent' }]}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm, borderRadius: radius.md },
  position: { width: 22, textAlign: 'center' },
  text: { flex: 1, gap: 1 },
  remove: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});

export const QueueList = memo(QueueListBase);
