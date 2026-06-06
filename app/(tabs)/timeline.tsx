import { FlashList } from '@shopify/flash-list';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ClipboardCheck,
  FileSignature,
  Handshake,
  HomeIcon,
  LogOut,
  MessageSquare,
  TrendingUp,
  Wrench,
} from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useActiveProperty } from '@/hooks/useActiveProperty';
import { useStore } from '@/lib/store';
import type { TimelineEvent, TimelineType } from '@/lib/types';

const ICONS: Record<TimelineType, React.ComponentType<{ size?: number; className?: string }>> = {
  rent_increase: TrendingUp,
  maintenance: Wrench,
  repair: Wrench,
  inspection: ClipboardCheck,
  agreement: Handshake,
  move_in: HomeIcon,
  move_out: LogOut,
  message: MessageSquare,
};

function Row({ event, index, isLast }: { event: TimelineEvent; index: number; isLast: boolean }) {
  const Icon = ICONS[event.type] ?? FileSignature;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50)}>
      <View className="flex-row gap-3 px-5">
        {/* rail */}
        <View className="items-center">
          <View className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card">
            <Icon size={16} className="text-primary" />
          </View>
          {!isLast ? <View className="my-1 w-0.5 flex-1 bg-border" /> : null}
        </View>
        <View className="flex-1 pb-6">
          <View className="flex-row items-center justify-between">
            <Text weight="semibold" className="flex-1" numberOfLines={1}>
              {event.title}
            </Text>
            <Text size="xs" variant="muted">
              {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
            </Text>
          </View>
          <Text size="sm" variant="muted" className="mt-0.5">
            {event.detail}
          </Text>
          <Text size="xs" variant="muted" className="mt-1 capitalize">
            {format(new Date(event.at), 'd MMM yyyy')} · {event.actor}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function TimelineScreen() {
  useActiveProperty();
  const timeline = useStore((s) => s.timeline);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pb-3 pt-2">
        <Text size="2xl" weight="bold">
          Tenancy timeline
        </Text>
        <Text size="sm" variant="muted">
          GitHub-style history · the single source of truth
        </Text>
      </View>
      <FlashList
        data={timeline}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
        renderItem={({ item, index }) => (
          <Row event={item} index={index} isLast={index === timeline.length - 1} />
        )}
      />
    </SafeAreaView>
  );
}
