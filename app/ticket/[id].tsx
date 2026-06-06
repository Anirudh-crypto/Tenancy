import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Stack, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ArrowLeft, CheckCircle2, Gavel, Send } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusPill, UrgencyBadge } from '@/components/StatusBadges';
import { Button, Card, CardContent, Input, Separator, Text, useToast } from '@/components/ui';
import { goBackTo } from '@/lib/navigation';
import { useStore } from '@/lib/store';
import type { TicketStatus } from '@/lib/types';

const NEXT_STATUS: Record<TicketStatus, { label: string; status: TicketStatus } | null> = {
  open: { label: 'Acknowledge', status: 'acknowledged' },
  acknowledged: { label: 'Start work', status: 'in_progress' },
  in_progress: { label: 'Mark resolved', status: 'resolved' },
  resolved: null,
};

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticket = useStore((s) => s.tickets.find((t) => t.id === id));
  const role = useStore((s) => s.role);
  const respond = useStore((s) => s.respondToTicket);
  const setStatus = useStore((s) => s.setTicketStatus);
  const { toast } = useToast();
  const [reply, setReply] = useState('');

  if (!ticket) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text variant="muted">Ticket not found.</Text>
      </SafeAreaView>
    );
  }

  const overdue =
    ticket.legalDeadline && ticket.status !== 'resolved' && isPast(new Date(ticket.legalDeadline));
  const next = NEXT_STATUS[ticket.status];

  const sendReply = () => {
    if (reply.trim().length < 2) return;
    void respond(ticket.id, reply.trim());
    setReply('');
    toast({ title: 'Reply added', variant: 'success' });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Ticket',
          headerLeft: () => (
            <Pressable
              onPress={() => goBackTo('/(tabs)/tickets')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="min-h-[44px] min-w-[44px] flex-row items-center justify-center pr-2">
              <ArrowLeft size={22} className="text-foreground" />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="px-5 pb-6 pt-4">
          <View className="flex-row items-start justify-between gap-2">
            <Text size="xl" weight="bold" className="flex-1">
              {ticket.title}
            </Text>
            <UrgencyBadge urgency={ticket.urgency} pulse />
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <StatusPill status={ticket.status} />
            <Text size="xs" variant="muted">
              {ticket.category} · reported by {ticket.reporter}
            </Text>
          </View>
          <Text size="xs" variant="muted" className="mt-1">
            {format(new Date(ticket.createdAt), 'd MMM yyyy, HH:mm')}
          </Text>

          <Card className="mt-4">
            <CardContent className="py-4">
              <Text>{ticket.description}</Text>
            </CardContent>
          </Card>

          {ticket.legalNote ? (
            <Card className="mt-3 border-primary/30 bg-primary/5">
              <CardContent className="gap-2 py-4">
                <View className="flex-row items-center gap-2">
                  <Gavel size={16} className="text-primary" />
                  <Text size="sm" weight="semibold" className="text-primary">
                    AI legal guidance
                  </Text>
                </View>
                <Text size="sm">{ticket.legalNote}</Text>
                {ticket.legalDeadline ? (
                  <View
                    className={`mt-1 flex-row items-center gap-1.5 rounded-md px-2 py-1.5 ${
                      overdue ? 'bg-destructive/10' : 'bg-secondary'
                    }`}>
                    {overdue ? (
                      <AlertTriangle size={14} className="text-destructive" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    )}
                    <Text
                      size="xs"
                      weight="medium"
                      className={overdue ? 'text-destructive' : 'text-secondary-foreground'}>
                      Landlord response due{' '}
                      {formatDistanceToNow(new Date(ticket.legalDeadline), { addSuffix: true })}
                    </Text>
                  </View>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {next ? (
            <Button className="mt-4" onPress={() => setStatus(ticket.id, next.status)}>
              <Text weight="semibold" className="text-primary-foreground">
                {next.label}
              </Text>
            </Button>
          ) : (
            <View className="mt-4 flex-row items-center justify-center gap-2 rounded-md bg-emerald-500/10 py-3">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <Text weight="semibold" className="text-emerald-600">
                Resolved
              </Text>
            </View>
          )}

          <Separator className="my-5" />
          <Text size="sm" weight="semibold" variant="muted" className="mb-3">
            CONVERSATION ({ticket.responses.length})
          </Text>
          {ticket.responses.length === 0 ? (
            <Text size="sm" variant="muted">
              No replies yet.
            </Text>
          ) : (
            <View className="gap-3">
              {ticket.responses.map((r) => (
                <View
                  key={r.id}
                  className={`max-w-[85%] rounded-xl p-3 ${
                    r.author === role ? 'self-end bg-primary' : 'self-start bg-secondary'
                  }`}>
                  <Text
                    size="xs"
                    weight="semibold"
                    className={
                      r.author === role
                        ? 'text-primary-foreground/80'
                        : 'text-secondary-foreground/70'
                    }>
                    {r.author}
                  </Text>
                  <Text
                    size="sm"
                    className={r.author === role ? 'text-primary-foreground' : 'text-foreground'}>
                    {r.text}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View className="flex-row items-end gap-2 border-t border-border bg-card px-4 py-3">
          <View className="flex-1">
            <Input
              placeholder={`Reply as ${role}…`}
              value={reply}
              onChangeText={setReply}
              multiline
            />
          </View>
          <Button size="icon" onPress={sendReply} accessibilityLabel="Send reply">
            <Send size={18} color="#fff" />
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
