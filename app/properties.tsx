import { router, Stack } from 'expo-router';
import {
  ArrowRight,
  Building2,
  LogOut,
  MapPin,
  Plus,
} from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Separator,
  Skeleton,
  Text,
} from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Property } from '@/lib/types';

function PropertyCard({ property }: { property: Property }) {
  const setActiveProperty = useStore((s) => s.setActiveProperty);
  const tenantSummary =
    property.tenants.length > 0
      ? property.tenants.map((t) => t.name).join(', ')
      : 'No current tenant';

  const open = () => {
    void setActiveProperty(property.id);
    router.push('/(tabs)');
  };

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${property.name}`}
        className="active:opacity-70"
        onPress={open}>
        <CardContent className="gap-3 py-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Building2 size={22} className="text-primary" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text weight="semibold" className="flex-1" numberOfLines={1}>
                  {property.name}
                </Text>
                <Badge variant={property.status === 'occupied' ? 'default' : 'secondary'}>
                  <Text size="xs" weight="semibold">
                    {property.status === 'occupied' ? 'Occupied' : 'Vacant'}
                  </Text>
                </Badge>
              </View>
              <View className="mt-0.5 flex-row items-center gap-1">
                <MapPin size={13} className="text-muted-foreground" />
                <Text size="xs" variant="muted" numberOfLines={1} className="flex-1">
                  {property.address}, {property.city}
                </Text>
              </View>
            </View>
            <ArrowRight size={18} className="text-muted-foreground" />
          </View>
          <Separator />
          <View className="flex-row items-center justify-between">
            <View>
              <Text size="xs" variant="muted">
                Rent
              </Text>
              <Text weight="semibold">€{property.rent.toLocaleString()}</Text>
            </View>
            <View>
              <Text size="xs" variant="muted">
                {property.bedrooms} bd · {property.bathrooms} ba
              </Text>
              <Text size="sm">{property.sizeSqm} m²</Text>
            </View>
            <View className="max-w-[45%] items-end">
              <Text size="xs" variant="muted">
                Tenant
              </Text>
              <Text size="sm" numberOfLines={1}>
                {tenantSummary}
              </Text>
            </View>
          </View>
        </CardContent>
      </Pressable>
    </Card>
  );
}

export default function PropertiesScreen() {
  const properties = useStore((s) => s.properties);
  const propertiesLoading = useStore((s) => s.propertiesLoading);
  const user = useStore((s) => s.user);
  const signOut = useStore((s) => s.signOut);

  const displayName = user?.name ?? 'Landlord';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View className="flex-row items-center gap-3 py-2">
          <Avatar size="lg" className="bg-primary">
            <AvatarFallback className="bg-primary">
              <Text weight="bold" className="text-primary-foreground">
                {initials || '?'}
              </Text>
            </AvatarFallback>
          </Avatar>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text weight="bold" size="lg">
                {displayName}
              </Text>
              <Badge variant="default">
                <Text size="xs" weight="semibold">
                  Landlord
                </Text>
              </Badge>
            </View>
            <Text size="sm" variant="muted">
              {user?.email ?? 'Manage your portfolio'}
            </Text>
          </View>
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel="Sign out"
            onPress={() => {
              void signOut();
              router.replace('/login');
            }}>
            <LogOut size={20} className="text-muted-foreground" />
          </Button>
        </View>

        <Animated.View entering={FadeInDown.delay(80)}>
          <View className="mb-2 mt-6 flex-row items-center justify-between">
            <Text size="sm" weight="semibold" variant="muted">
              MY PROPERTIES
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add property"
              hitSlop={8}
              className="min-h-[36px] flex-row items-center gap-1 rounded-md bg-primary px-3 py-1.5 active:opacity-80"
              onPress={() => router.push('/property/new')}>
              <Plus size={15} className="text-primary-foreground" />
              <Text size="xs" weight="semibold" className="text-primary-foreground">
                Add
              </Text>
            </Pressable>
          </View>

          {propertiesLoading && properties.length === 0 ? (
            <View className="gap-3">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </View>
          ) : properties.length > 0 ? (
            <View className="gap-3">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </View>
          ) : (
            <Card>
              <CardContent className="items-center gap-3 py-8">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Building2 size={26} className="text-primary" />
                </View>
                <Text weight="semibold">No properties yet</Text>
                <Text size="sm" variant="muted" className="text-center">
                  Add your first property to start tracking rent, deposits, tenants, tickets, and
                  risks.
                </Text>
                <Button size="sm" className="mt-1" onPress={() => router.push('/property/new')}>
                  <View className="flex-row items-center gap-1.5">
                    <Plus size={15} className="text-primary-foreground" />
                    <Text size="sm" weight="semibold" className="text-primary-foreground">
                      Add property
                    </Text>
                  </View>
                </Button>
              </CardContent>
            </Card>
          )}
        </Animated.View>

        <Text size="xs" variant="muted" className="mt-8 text-center">
          Open a property to manage its tickets, timeline, inspections, and risks.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
