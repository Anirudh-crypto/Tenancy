import { Droplets, Gavel, ShieldAlert, Wrench } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RiskBadge } from '@/components/StatusBadges';
import { Card, CardContent, Text } from '@/components/ui';
import { useActiveProperty } from '@/hooks/useActiveProperty';
import { useStore } from '@/lib/store';
import type { RiskSignal } from '@/lib/types';

const CAT_ICON = {
  moisture: Droplets,
  deposit: ShieldAlert,
  maintenance: Wrench,
  legal: Gavel,
} as const;

function RiskCard({ risk, index }: { risk: RiskSignal; index: number }) {
  const Icon = CAT_ICON[risk.category];
  const borderTone =
    risk.level === 'high'
      ? 'border-l-destructive'
      : risk.level === 'medium'
        ? 'border-l-accent'
        : 'border-l-emerald-500';
  return (
    <Animated.View entering={FadeInDown.delay(index * 80)}>
      <Card className={`border-l-4 ${borderTone}`}>
        <CardContent className="gap-2.5 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon size={18} className="text-foreground" />
              <Text size="xs" weight="semibold" variant="muted" className="uppercase">
                {risk.category}
              </Text>
            </View>
            <RiskBadge level={risk.level} />
          </View>
          <Text weight="semibold">{risk.title}</Text>
          <View className="gap-1">
            <Text size="xs" weight="semibold" variant="muted">
              WHY
            </Text>
            <Text size="sm" variant="muted">
              {risk.rationale}
            </Text>
          </View>
          <View className="gap-1 rounded-md bg-primary/5 p-3">
            <Text size="xs" weight="semibold" className="text-primary">
              RECOMMENDED ACTION
            </Text>
            <Text size="sm">{risk.recommendation}</Text>
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

export default function RisksScreen() {
  useActiveProperty();
  const risks = useStore((s) => s.risks);
  const high = risks.filter((r) => r.level === 'high').length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <Text size="2xl" weight="bold">
          Risk prediction
        </Text>
        <Text size="sm" variant="muted">
          AI spots problems before they cost money
        </Text>

        <Card className="mt-4 bg-primary">
          <CardContent className="flex-row items-center gap-3 py-4">
            <ShieldAlert size={28} color="#fff" />
            <View className="flex-1">
              <Text weight="bold" className="text-primary-foreground">
                {high} high-risk signal{high === 1 ? '' : 's'} active
              </Text>
              <Text size="xs" className="text-primary-foreground/80">
                Based on maintenance patterns & similar tenancies
              </Text>
            </View>
          </CardContent>
        </Card>

        <View className="mt-4 gap-3">
          {risks.map((r, i) => (
            <RiskCard key={r.id} risk={r} index={i} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
