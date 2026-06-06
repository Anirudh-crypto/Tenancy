import { formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  ChevronLeft,
  Info,
  ShieldAlert,
  Wrench,
} from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RiskBadge } from '@/components/StatusBadges';
import { Badge, Button, Card, CardContent, Separator, Text } from '@/components/ui';
import { useActiveProperty } from '@/hooks/useActiveProperty';
import { useStore } from '@/lib/store';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex-1">
      <CardContent className="gap-1 py-4">
        <Text size="xs" variant="muted" weight="medium">
          {label}
        </Text>
        <Text size="xl" weight="bold">
          {value}
        </Text>
        {sub ? (
          <Text size="xs" variant="muted">
            {sub}
          </Text>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionRow({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Card>
      <Button variant="ghost" className="h-auto px-4 py-4" onPress={onPress}>
        <View className="w-full flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            {icon}
          </View>
          <View className="flex-1">
            <Text weight="semibold">{title}</Text>
            <Text size="xs" variant="muted">
              {sub}
            </Text>
          </View>
          <ArrowRight size={18} className="text-muted-foreground" />
        </View>
      </Button>
    </Card>
  );
}

export default function HomeScreen() {
  const { activePropertyId } = useActiveProperty();
  const property = useStore((s) =>
    activePropertyId ? s.getProperty(activePropertyId) : undefined
  );
  const tickets = useStore((s) => s.tickets);
  const risks = useStore((s) => s.risks);
  const role = useStore((s) => s.role);
  const clearActiveProperty = useStore((s) => s.clearActiveProperty);

  if (!property) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['top']}>
        <Text variant="muted">Loading property…</Text>
      </SafeAreaView>
    );
  }

  const openTickets = tickets.filter((t) => t.status !== 'resolved');
  const topRisk = [...risks].toSorted((a, b) =>
    a.level === 'high' ? -1 : b.level === 'high' ? 1 : 0
  )[0];
  const moveInMonths = Math.round(
    (Date.now() - new Date(property.moveInDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {/* Switch property (landlords manage multiple) */}
        {role === 'landlord' ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-1 mt-1 self-start"
            onPress={() => {
              clearActiveProperty();
              router.replace('/properties');
            }}>
            <View className="flex-row items-center gap-1">
              <ChevronLeft size={16} className="text-muted-foreground" />
              <Text size="sm" variant="muted" weight="medium">
                All properties
              </Text>
            </View>
          </Button>
        ) : null}

        {/* Property header */}
        <View className="mt-1 flex-row items-start gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 size={26} className="text-primary" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text size="2xl" weight="bold" className="flex-1" numberOfLines={1}>
                {property.name}
              </Text>
              <Badge variant={property.status === 'occupied' ? 'default' : 'secondary'}>
                <Text size="xs" weight="semibold">
                  {property.status === 'occupied' ? 'Occupied' : 'Vacant'}
                </Text>
              </Badge>
            </View>
            <Text size="sm" variant="muted">
              {property.address}, {property.city}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View className="mt-4 flex-row gap-3">
          <StatCard label="Monthly rent" value={`€${property.rent.toLocaleString()}`} />
          <StatCard label="Deposit held" value={`€${property.deposit.toLocaleString()}`} />
        </View>
        <View className="mt-3 flex-row gap-3">
          <StatCard
            label="Open tickets"
            value={`${openTickets.length}`}
            sub={openTickets.length ? 'Needs attention' : 'All clear'}
          />
          <StatCard label="Tenancy age" value={`${moveInMonths} mo`} />
        </View>

        {/* Risk callout */}
        {topRisk ? (
          <Animated.View entering={FadeInDown.delay(80)}>
            <Card className="mt-5 border-l-4 border-l-destructive">
              <CardContent className="gap-2 py-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <ShieldAlert size={18} className="text-destructive" />
                    <Text weight="semibold" size="sm">
                      AI Risk Prediction
                    </Text>
                  </View>
                  <RiskBadge level={topRisk.level} />
                </View>
                <Text weight="semibold">{topRisk.title}</Text>
                <Text size="sm" variant="muted">
                  {topRisk.rationale}
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 self-start"
                  onPress={() => router.push('/(tabs)/risks')}>
                  <Text size="sm" weight="semibold">
                    View all risks
                  </Text>
                </Button>
              </CardContent>
            </Card>
          </Animated.View>
        ) : null}

        {/* Quick actions */}
        <Text size="sm" weight="semibold" variant="muted" className="mb-2 mt-6">
          QUICK ACTIONS
        </Text>
        <View className="gap-3">
          <ActionRow
            icon={<Info size={20} className="text-primary" />}
            title="Property details"
            sub="Rent, deposit, layout & tenants"
            onPress={() => router.push(`/property/${property.id}`)}
          />
          <ActionRow
            icon={<Wrench size={20} className="text-primary" />}
            title="Report an issue"
            sub="AI triages urgency & legal timelines"
            onPress={() => router.push('/ticket/new')}
          />
          <ActionRow
            icon={<CalendarClock size={20} className="text-primary" />}
            title="View tenancy timeline"
            sub="Single source of truth for every event"
            onPress={() => router.push('/(tabs)/timeline')}
          />
        </View>

        <Separator className="my-6" />
        <Text size="xs" variant="muted" className="text-center">
          Move-in {formatDistanceToNow(new Date(property.moveInDate), { addSuffix: true })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
