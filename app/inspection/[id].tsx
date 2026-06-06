import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileSignature,
  Loader2,
  Lock,
  ScanSearch,
  Wallet,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeverityBadge } from '@/components/StatusBadges';
import { Button, Card, CardContent, Separator, Text, useToast } from '@/components/ui';
import {
  ROOMS,
  analyzePhoto,
  computeDepositRecommendation,
  roomLabel,
} from '@/lib/ai';
import { useStore } from '@/lib/store';
import type { DetectedDamage, RoomKey } from '@/lib/types';

function Scanner() {
  const rot = useSharedValue(0);
  rot.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Loader2 size={18} className="text-primary" />
    </Animated.View>
  );
}

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inspection = useStore((s) => s.inspections.find((i) => i.id === id));
  const property = useStore((s) => {
    const active = s.activePropertyId ? s.getProperty(s.activePropertyId) : undefined;
    return active ?? s.property;
  });
  const role = useStore((s) => s.role);
  const addPhoto = useStore((s) => s.addInspectionPhoto);
  const sign = useStore((s) => s.signInspection);
  const { toast } = useToast();
  const [scanningRoom, setScanningRoom] = useState<RoomKey | null>(null);

  const allDamages = useMemo<DetectedDamage[]>(
    () => inspection?.photos.flatMap((p) => p.damages) ?? [],
    [inspection]
  );

  if (!inspection) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text variant="muted">Inspection not found.</Text>
      </SafeAreaView>
    );
  }

  const isMoveOut = inspection.kind === 'move_out';
  const capturedRooms = new Set(inspection.photos.map((p) => p.room));
  // Move-in documentation is the tenant's responsibility (so they can prove
  // pre-existing damage). Landlords get a read-only view of move-in reports.
  const canCapture = !(inspection.kind === 'move_in' && role === 'landlord');

  const capture = (room: RoomKey) => {
    if (scanningRoom || !canCapture) return;
    setScanningRoom(room);
    // Simulate camera + on-device AI vision pass
    setTimeout(() => {
      const damages = analyzePhoto(room);
      // Placeholder image — real implementation would use expo-image-picker / expo-camera.
      // TODO: wire expo-camera capture; using a deterministic placeholder URI for the demo.
      const uri = `https://picsum.photos/seed/${room}-${Date.now()}/600/400`;
      void addPhoto(inspection.id, room, uri, damages);
      setScanningRoom(null);
      toast({
        title: `${roomLabel(room)} analyzed · ${damages.length} finding(s)`,
        variant: 'success',
      });
    }, 1100);
  };

  const deposit = computeDepositRecommendation(allDamages, property.deposit);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: isMoveOut ? 'Move-out report' : 'Move-in report',
          headerLeft: () => (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/inspect'))}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="min-h-[44px] min-w-[44px] flex-row items-center justify-center pr-2">
              <ArrowLeft size={22} className="text-foreground" />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>
        <Text size="xl" weight="bold">
          {isMoveOut ? 'Move-out report' : 'Move-in report'}
        </Text>
        <Text size="sm" variant="muted">
          {property.name} · {property.address}
        </Text>

        {!canCapture ? (
          <View className="mt-4 flex-row items-start gap-2.5 rounded-md border border-border bg-muted/50 p-3.5">
            <Lock size={18} className="text-muted-foreground" />
            <View className="flex-1">
              <Text size="sm" weight="semibold">
                Read-only view
              </Text>
              <Text size="xs" variant="muted">
                Move-in documentation is captured by the tenant so pre-existing damage is recorded
                from their side. You can review findings and the signed report here.
              </Text>
            </View>
          </View>
        ) : null}

        <Text size="sm" weight="semibold" variant="muted" className="mb-2 mt-5">
          {canCapture ? 'CAPTURE EACH ROOM' : 'ROOMS'}
        </Text>
        <View className="gap-2.5">
          {ROOMS.map((r) => {
            const done = capturedRooms.has(r.key);
            const scanning = scanningRoom === r.key;
            return (
              <Card key={r.key}>
                <View className="flex-row items-center gap-3 p-3.5">
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-full ${
                      done ? 'bg-emerald-500/15' : 'bg-secondary'
                    }`}>
                    {done ? (
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    ) : (
                      <Camera size={20} className="text-muted-foreground" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text weight="semibold">{r.label}</Text>
                    <Text size="xs" variant="muted">
                      {done
                        ? `${inspection.photos.filter((p) => p.room === r.key).length} photo(s) analyzed`
                        : canCapture
                          ? 'Not captured'
                          : 'Awaiting tenant capture'}
                    </Text>
                  </View>
                  {canCapture ? (
                    <Button
                      size="sm"
                      variant={done ? 'outline' : 'default'}
                      disabled={scanning}
                      onPress={() => capture(r.key)}>
                      {scanning ? (
                        <View className="flex-row items-center gap-1.5">
                          <Scanner />
                          <Text size="xs" weight="semibold">
                            Scanning
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-1.5">
                          <ScanSearch
                            size={14}
                            color={done ? undefined : '#fff'}
                            className={done ? 'text-foreground' : undefined}
                          />
                          <Text
                            size="xs"
                            weight="semibold"
                            className={done ? 'text-foreground' : 'text-primary-foreground'}>
                            {done ? 'Re-scan' : 'Capture'}
                          </Text>
                        </View>
                      )}
                    </Button>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>

        {allDamages.length > 0 ? (
          <Animated.View entering={FadeIn} className="mt-6">
            <Text size="sm" weight="semibold" variant="muted" className="mb-2">
              AI DAMAGE DETECTION ({allDamages.length})
            </Text>
            <View className="gap-2">
              {allDamages.map((d, i) => (
                <Animated.View key={d.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
                  <Card>
                    <CardContent className="gap-1.5 py-3">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text weight="semibold" className="flex-1">
                          {d.label}
                        </Text>
                        <SeverityBadge severity={d.severity} />
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text size="xs" variant="muted">
                          {roomLabel(d.room)} · {Math.round(d.confidence * 100)}% confidence
                        </Text>
                        <Text
                          size="xs"
                          weight="semibold"
                          className={d.estimatedCost > 0 ? 'text-destructive' : 'text-emerald-600'}>
                          {d.estimatedCost > 0 ? `€${d.estimatedCost}` : 'No charge'}
                        </Text>
                      </View>
                      {d.note ? (
                        <Text size="xs" variant="muted">
                          {d.note}
                        </Text>
                      ) : null}
                    </CardContent>
                  </Card>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* Deposit recommendation for move-out */}
        {isMoveOut && allDamages.length > 0 ? (
          <Card className="mt-6 border-primary/30 bg-primary/5">
            <CardContent className="gap-3 py-4">
              <View className="flex-row items-center gap-2">
                <Wallet size={18} className="text-primary" />
                <Text weight="semibold" className="text-primary">
                  AI deposit recommendation
                </Text>
              </View>
              <Row label="Deposit held" value={`€${property.deposit}`} />
              <Row label="Normal wear (not deductible)" value={`€${deposit.wearTotal}`} muted />
              <Row label="Tenant-attributable damage" value={`€${deposit.damageTotal}`} />
              <Separator />
              <Row label="Recommended deduction" value={`€${deposit.recommendedDeduction}`} />
              <View className="flex-row items-center justify-between">
                <Text weight="bold">Recommended return to tenant</Text>
                <Text weight="bold" size="lg" className="text-emerald-600">
                  €{deposit.recommendedReturn}
                </Text>
              </View>
              <Text size="xs" variant="muted">
                {deposit.summary}
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {/* Sign / status */}
        {inspection.signedAt ? (
          <View className="mt-6 flex-row items-center justify-center gap-2 rounded-md bg-emerald-500/10 py-3">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <Text weight="semibold" className="text-emerald-600">
              Signed by {inspection.signedBy}
            </Text>
          </View>
        ) : canCapture ? (
          <Button
            className="mt-6"
            size="lg"
            disabled={inspection.photos.length === 0}
            onPress={() => {
              sign(inspection.id, role === 'tenant' ? property.tenantName : property.landlordName);
              toast({ title: 'Report signed & logged to timeline', variant: 'success' });
            }}>
            <View className="flex-row items-center gap-2">
              <FileSignature size={18} color="#fff" />
              <Text weight="semibold" className="text-primary-foreground">
                Sign {isMoveOut ? 'move-out' : 'move-in'} report
              </Text>
            </View>
          </Button>
        ) : (
          <View className="mt-6 flex-row items-center justify-center gap-2 rounded-md bg-muted py-3">
            <Lock size={16} className="text-muted-foreground" />
            <Text size="sm" variant="muted">
              Awaiting tenant signature
            </Text>
          </View>
        )}
        {canCapture && inspection.photos.length === 0 ? (
          <Text size="xs" variant="muted" className="mt-2 text-center">
            Capture at least one room to sign.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text size="sm" variant={muted ? 'muted' : 'default'}>
        {label}
      </Text>
      <Text size="sm" weight="semibold" variant={muted ? 'muted' : 'default'}>
        {value}
      </Text>
    </View>
  );
}
