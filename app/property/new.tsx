import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button, Card, CardContent, Input, Separator, Switch, Text, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';

const numericString = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || !Number.isNaN(Number(v)), `${label} must be a number`);

const schema = z.object({
  name: z.string().trim().min(2, 'Give the property a name'),
  address: z.string().trim().min(3, 'Enter the street address'),
  city: z.string().trim().min(2, 'Enter the city'),
  rent: numericString('Rent'),
  deposit: numericString('Deposit'),
  bedrooms: numericString('Bedrooms'),
  bathrooms: numericString('Bathrooms'),
  sizeSqm: numericString('Size'),
  propertyType: z.string().trim().optional(),
  floor: z.string().trim().optional(),
  landlordName: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

function toNum(v: string): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

export default function NewPropertyScreen() {
  const addProperty = useStore((s) => s.addProperty);
  const user = useStore((s) => s.user);
  const { toast } = useToast();
  const [occupied, setOccupied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      rent: '',
      deposit: '',
      bedrooms: '',
      bathrooms: '',
      sizeSqm: '',
      propertyType: '',
      floor: '',
      landlordName: user?.name ?? '',
      notes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const result = await addProperty({
      name: values.name.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      rent: toNum(values.rent),
      deposit: toNum(values.deposit),
      bedrooms: toNum(values.bedrooms),
      bathrooms: toNum(values.bathrooms),
      sizeSqm: toNum(values.sizeSqm),
      propertyType: values.propertyType?.trim() || 'Apartment',
      floor: values.floor?.trim() || undefined,
      landlordName: values.landlordName?.trim() || user?.name || '',
      notes: values.notes?.trim() || undefined,
      status: occupied ? 'occupied' : 'vacant',
      moveInDate: new Date().toISOString(),
      tenants: [],
    });
    setSubmitting(false);

    if (!result.ok) {
      toast({ title: 'Could not save property', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Property added', variant: 'success' });
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Add property',
          headerLeft: () => (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="min-h-[44px] min-w-[44px] flex-row items-center justify-center pr-2">
              <X size={22} className="text-foreground" />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled">
        <Text size="sm" variant="muted">
          Add a property to your portfolio. It will be saved to your account and shown on your dashboard.
        </Text>

        <Text size="sm" weight="semibold" variant="muted" className="mb-2 mt-6">
          BASICS
        </Text>
        <View className="gap-4">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Property name"
                placeholder="e.g. Altbau · 3 Zimmer"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Address"
                placeholder="Street and number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.address?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="City"
                placeholder="e.g. Berlin"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.city?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="propertyType"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Type"
                placeholder="e.g. Apartment · Altbau"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.propertyType?.message}
              />
            )}
          />
        </View>

        <Text size="sm" weight="semibold" variant="muted" className="mb-2 mt-6">
          FINANCIALS
        </Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="rent"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Monthly rent (€)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.rent?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="deposit"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Deposit (€)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.deposit?.message}
                />
              )}
            />
          </View>
        </View>

        <Text size="sm" weight="semibold" variant="muted" className="mb-2 mt-6">
          LAYOUT
        </Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="bedrooms"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Bedrooms"
                  placeholder="0"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.bedrooms?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="bathrooms"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Bathrooms"
                  placeholder="0"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.bathrooms?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="sizeSqm"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Size (m²)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.sizeSqm?.message}
                />
              )}
            />
          </View>
        </View>
        <View className="mt-4">
          <Controller
            control={control}
            name="floor"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Floor (optional)"
                placeholder="e.g. 3rd floor"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.floor?.message}
              />
            )}
          />
        </View>

        <Text size="sm" weight="semibold" variant="muted" className="mb-2 mt-6">
          STATUS & NOTES
        </Text>
        <Card>
          <CardContent className="gap-3 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text weight="semibold">Currently occupied</Text>
                <Text size="xs" variant="muted">
                  Mark vacant if it's available for new tenants.
                </Text>
              </View>
              <Switch checked={occupied} onCheckedChange={setOccupied} />
            </View>
            <Separator />
            <Controller
              control={control}
              name="landlordName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Landlord name"
                  placeholder="Shown on the property"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.landlordName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Notes (optional)"
                  placeholder="Anything worth remembering about this unit"
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.notes?.message}
                />
              )}
            />
          </CardContent>
        </Card>

        <Button className="mt-6" size="lg" disabled={submitting} onPress={handleSubmit(onSubmit)}>
          <Text weight="semibold" className="text-primary-foreground">
            {submitting ? 'Saving…' : 'Save property'}
          </Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
