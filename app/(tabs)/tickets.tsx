import { FlashList } from '@shopify/flash-list';
import { formatDistanceToNow, isPast } from 'date-fns';
import { router } from 'expo-router';
import { AlertTriangle, ChevronRight, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusPill, UrgencyBadge } from '@/components/StatusBadges';
import { Button, Card, Text } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Ticket } from '@/lib/types';

function TicketRow({ ticket }: { ticket: Ticket }) {
  const overdue =
    ticket.legalDeadline && ticket.status !== 'resolved' && isPast(new Date(ticket.legalDeadline));
  return (
    <Card className="mb-3" pressable onPress={() => router.push(`/ticket/${ticket.id}`)}>
      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <Text weight="semibold" className="flex-1" numberOfLines={1}>
            {ticket.title}
          </Text>
          <UrgencyBadge urgency={ticket.urgency} pulse />
        </View>
        <Text size="sm" variant="muted" numberOfLines={2}>
          {ticket.description}
        </Text>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <StatusPill status={ticket.status} />
            <Text size="xs" variant="muted">
              {ticket.category}
            </Text>
          </View>
          <ChevronRight size={16} className="text-muted-foreground" />
        </View>
        {overdue ? (
          <View className="mt-1 flex-row items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5">
            <AlertTriangle size={14} className="text-destructive" />
            <Text size="xs" weight="medium" variant="destructive">
              Legal response window passed{' '}
              {formatDistanceToNow(new Date(ticket.legalDeadline!), { addSuffix: true })}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export default function TicketsScreen() {
  const tickets = useStore((s) => s.tickets);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <View>
          <Text size="2xl" weight="bold">
            Maintenance
          </Text>
          <Text size="sm" variant="muted">
            {tickets.filter((t) => t.status !== 'resolved').length} open ·{' '}
            {tickets.length} total
          </Text>
        </View>
        <Button size="sm" onPress={() => router.push('/ticket/new')}>
          <View className="flex-row items-center gap-1.5">
            <Plus size={16} color="#fff" />
            <Text size="sm" weight="semibold" className="text-primary-foreground">
              Report
            </Text>
          </View>
        </Button>
      </View>
      <FlashList
        data={tickets}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        renderItem={({ item }) => <TicketRow ticket={item} />}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text variant="muted">No tickets yet. Report an issue to get started.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
