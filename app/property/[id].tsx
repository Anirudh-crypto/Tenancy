import { format, formatDistanceToNow } from 'date-fns';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarClock,
  Bath,
  Mail,
  MapPin,
  Phone,
  Ruler,
  User as UserIcon,
  Wallet,
} from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, AvatarFallback, Badge, Card, CardContent, Separator, Text } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { PropertyTenant } from '@/lib/types';

function SafeDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(value?: string): string {
  const d = SafeDate(value);
  return d ? format(d, 'd MMM yyyy') : '—';
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex-1">
      <CardContent className="gap-1 py-4">
        <View className="flex-row items-center gap-1.5">
          {icon}
          <Text size="xs" variant="muted" weight="medium">
            {label}
          </Text>
        </View>
        <Text size="lg" weight="bold">
          {value}
        </Text>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text size="sm" variant="muted">
        {label}
      </Text>
      <Text size="sm" weight="medium" className="max-w-[60%] text-right">
        {value}
      </Text>
    </View>
  );
}

function TenantCard({ tenant }: { tenant: PropertyTenant }) {
  const initials = tenant.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <Card>
      <CardContent className="gap-3 py-4">
        <View className="flex-row items-center gap-3">
          <Avatar size="lg" className="bg-primary">
            <AvatarFallback className="bg-primary">
              <Text weight="bold" className="text-primary-foreground">
                {initials || '?'}
              </Text>
            </AvatarFallback>
          </Avatar>
          <View className="flex-1">
            <Text weight="semibold">{tenant.name}</Text>
            <Text size="xs" variant="muted">
              Moved in {fmtDate(tenant.moveInDate)}
            </Text>
          </View>
        </View>
        {tenant.email || tenant.phone || tenant.leaseEndDate ? <Separator /> : null}
        {tenant.email ? (
          <View className="flex-row items-center gap-2">
            <Mail size={15} className="text-muted-foreground" />
            <Text size="sm">{tenant.email}</Text>
          </View>
        ) : null}
        {tenant.phone ? (
          <View className="flex-row items-center gap-2">
            <Phone size={15} className="text-muted-foreground" />
            <Text size="sm">{tenant.phone}</Text>
          </View>
        ) : null}
        {tenant.leaseEndDate ? (
          <View className="flex-row items-center gap-2">
            <CalendarClock size={15} className="text-muted-foreground" />
            <Text size="sm">Lease ends {fmtDate(tenant.leaseEndDate)}</Text>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = useStore((s) => s.getProperty(id));

  if (!property) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ title: 'Property' }} />
        <Text variant="muted">Property not found.</Text>
      </SafeAreaView>
    );
  }

  const moveIn = SafeDate(property.moveInDate);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: property.name,
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Go back"
              hitSlop={12}
              className="min-h-[44px] min-w-[44px] justify-center"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/(tabs)')
              }>
              <ArrowLeft size={22} className="text-foreground" />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="px-5 pb-12 pt-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 size={28} className="text-primary" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text size="xl" weight="bold" className="flex-1" numberOfLines={1}>
                  {property.name}
                </Text>
                <Badge variant={property.status === 'occupied' ? 'default' : 'secondary'}>
                  <Text size="xs" weight="semibold">
                    {property.status === 'occupied' ? 'Occupied' : 'Vacant'}
                  </Text>
                </Badge>
              </View>
              <View className="mt-1 flex-row items-center gap-1">
                <MapPin size={14} className="text-muted-foreground" />
                <Text size="sm" variant="muted" className="flex-1" numberOfLines={2}>
                  {property.address}, {property.city}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Financials */}
        <View className="mt-5 flex-row gap-3">
          <StatTile
            icon={<Wallet size={14} className="text-primary" />}
            label="Monthly rent"
            value={`€${property.rent.toLocaleString()}`}
          />
          <StatTile
            icon={<Wallet size={14} className="text-primary" />}
            label="Deposit held"
            value={`€${property.deposit.toLocaleString()}`}
          />
        </View>
        <View className="mt-3 flex-row gap-3">
          <StatTile
            icon={<BedDouble size={14} className="text-primary" />}
            label="Bedrooms"
            value={`${property.bedrooms}`}
          />
          <StatTile
            icon={<Bath size={14} className="text-primary" />}
            label="Bathrooms"
            value={`${property.bathrooms}`}
          />
          <StatTile
            icon={<Ruler size={14} className="text-primary" />}
            label="Size"
            value={`${property.sizeSqm} m²`}
          />
        </View>

        {/* Property info */}
        <Text size="sm" weight="semibold" variant="muted" className="mb-2 mt-6">
          PROPERTY DETAILS
        </Text>
        <Card>
          <CardContent className="py-2">
            <InfoRow label="Type" value={property.propertyType} />
            <Separator />
            {property.floor ? (
              <>
                <InfoRow label="Floor" value={property.floor} />
                <Separator />
              </>
            ) : null}
            <InfoRow label="Landlord" value={property.landlordName} />
            <Separator />
            <InfoRow
              label="Move-in date"
              value={
                moveIn
                  ? `${fmtDate(property.moveInDate)} · ${formatDistanceToNow(moveIn, {
                      addSuffix: true,
                    })}`
                  : '—'
              }
            />
          </CardContent>
        </Card>

        {/* Notes */}
        {property.notes ? (
          <Card className="mt-4">
            <CardContent className="py-4">
              <Text size="xs" weight="semibold" variant="muted" className="mb-1">
                NOTES
              </Text>
              <Text size="sm">{property.notes}</Text>
            </CardContent>
          </Card>
        ) : null}

        {/* Tenants */}
        <View className="mb-2 mt-6 flex-row items-center justify-between">
          <Text size="sm" weight="semibold" variant="muted">
            TENANTS
          </Text>
          <Text size="xs" variant="muted">
            {property.tenants.length} {property.tenants.length === 1 ? 'person' : 'people'}
          </Text>
        </View>
        {property.tenants.length > 0 ? (
          <View className="gap-3">
            {property.tenants.map((t) => (
              <TenantCard key={t.id} tenant={t} />
            ))}
          </View>
        ) : (
          <Card>
            <CardContent className="items-center gap-2 py-8">
              <UserIcon size={28} className="text-muted-foreground" />
              <Text weight="semibold">No current tenant</Text>
              <Text size="sm" variant="muted" className="text-center">
                This property is vacant and ready for new occupants.
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
