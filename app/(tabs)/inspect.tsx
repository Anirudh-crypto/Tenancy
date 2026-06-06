import { format } from 'date-fns';
import { router } from 'expo-router';
import { ClipboardCheck, FileCheck2, Home, Lock, LogOut } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, CardContent, Text } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { InspectionKind } from '@/lib/types';

export default function InspectScreen() {
  const inspections = useStore((s) => s.inspections);
  const createInspection = useStore((s) => s.createInspection);
  const role = useStore((s) => s.role);

  const start = (kind: InspectionKind) => {
    const id = createInspection(kind);
    router.push(`/inspection/${id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <Text size="2xl" weight="bold">
          Inspections
        </Text>
        <Text size="sm" variant="muted">
          Photo-based reports with AI damage detection
        </Text>

        <View className="mt-5 gap-3">
          {role === 'landlord' ? (
            <Card>
              <View className="flex-row items-center gap-3 p-4 opacity-60">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
                  <Lock size={20} className="text-muted-foreground" />
                </View>
                <View className="flex-1">
                  <Text weight="semibold">Move-in report (tenant-led)</Text>
                  <Text size="xs" variant="muted">
                    Tenants capture move-in photos. You can review their signed reports below.
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card pressable onPress={() => start('move_in')}>
              <View className="flex-row items-center gap-3 p-4">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <Home size={22} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text weight="semibold">New move-in report</Text>
                  <Text size="xs" variant="muted">
                    Document existing damage before you move in
                  </Text>
                </View>
              </View>
            </Card>
          )}
          <Card pressable onPress={() => start('move_out')}>
            <View className="flex-row items-center gap-3 p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-accent/15">
                <LogOut size={22} className="text-accent" />
              </View>
              <View className="flex-1">
                <Text weight="semibold">New move-out report</Text>
                <Text size="xs" variant="muted">
                  AI compares vs move-in & recommends deposit return
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <Text size="sm" weight="semibold" variant="muted" className="mb-2 mt-6">
          PAST INSPECTIONS
        </Text>
        {inspections.length === 0 ? (
          <Card>
            <CardContent className="items-center gap-2 py-8">
              <ClipboardCheck size={28} className="text-muted-foreground" />
              <Text variant="muted" size="sm">
                No inspections yet
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-3">
            {inspections.map((insp) => (
              <Card key={insp.id} pressable onPress={() => router.push(`/inspection/${insp.id}`)}>
                <View className="flex-row items-center gap-3 p-4">
                  <FileCheck2
                    size={20}
                    className={insp.signedAt ? 'text-emerald-500' : 'text-muted-foreground'}
                  />
                  <View className="flex-1">
                    <Text weight="semibold">
                      {insp.kind === 'move_in' ? 'Move-in report' : 'Move-out report'}
                    </Text>
                    <Text size="xs" variant="muted">
                      {insp.photos.length} rooms · {format(new Date(insp.createdAt), 'd MMM yyyy')}
                    </Text>
                  </View>
                  <Text
                    size="xs"
                    weight="semibold"
                    className={insp.signedAt ? 'text-emerald-500' : 'text-accent'}>
                    {insp.signedAt ? 'Signed' : 'Draft'}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Button variant="outline" className="mt-6" onPress={() => router.push('/(tabs)/timeline')}>
          <Text weight="semibold">View tenancy timeline</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
