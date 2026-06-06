import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { UrgencyBadge } from '@/components/StatusBadges';
import { Button, Card, CardContent, Input, Text, useToast } from '@/components/ui';
import { triageTicket } from '@/lib/ai';
import { useStore } from '@/lib/store';

const schema = z.object({
  title: z.string().min(4, 'Give a short title (min 4 chars)'),
  description: z.string().min(10, 'Describe the issue (min 10 chars)'),
});
type FormValues = z.infer<typeof schema>;

export default function NewTicketScreen() {
  const addTicket = useStore((s) => s.addTicket);
  const { toast } = useToast();
  const [preview, setPreview] = useState<ReturnType<typeof triageTicket> | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '' },
  });

  const title = watch('title');
  const description = watch('description');

  const runTriage = () => {
    if ((title + description).trim().length < 5) {
      toast({ title: 'Add a bit more detail first', variant: 'destructive' });
      return;
    }
    setPreview(triageTicket(`${title} ${description}`));
  };

  const onSubmit = (values: FormValues) => {
    addTicket(values);
    toast({ title: 'Ticket created & logged to timeline', variant: 'success' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled">
        <Text size="sm" variant="muted">
          Describe the problem. AI will categorize urgency and suggest legal timelines.
        </Text>

        <View className="mt-5 gap-4">
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Title"
                placeholder="e.g. Heating stopped working"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.title?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Description"
                placeholder="What happened, when, and where in the home?"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={4}
                style={{ minHeight: 96, textAlignVertical: 'top' }}
                error={errors.description?.message}
              />
            )}
          />
        </View>

        <Button variant="outline" className="mt-4" onPress={runTriage}>
          <View className="flex-row items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <Text weight="semibold">Run AI triage</Text>
          </View>
        </Button>

        {preview ? (
          <Animated.View entering={FadeIn}>
            <Card className="mt-4 border-primary/30 bg-primary/5">
              <CardContent className="gap-3 py-4">
                <View className="flex-row items-center justify-between">
                  <Text weight="semibold" size="sm">
                    AI assessment
                  </Text>
                  <UrgencyBadge urgency={preview.urgency} />
                </View>
                <View className="flex-row items-center gap-2">
                  <Text size="sm" variant="muted">
                    Category:
                  </Text>
                  <Text size="sm" weight="semibold">
                    {preview.category}
                  </Text>
                </View>
                <View className="gap-1 rounded-md bg-background p-3">
                  <Text size="xs" weight="semibold" className="text-primary">
                    SUGGESTED LEGAL TIMELINE
                  </Text>
                  <Text size="sm">{preview.legalNote}</Text>
                </View>
              </CardContent>
            </Card>
          </Animated.View>
        ) : null}

        <Button className="mt-6" size="lg" onPress={handleSubmit(onSubmit)}>
          <Text weight="semibold" className="text-primary-foreground">
            Submit ticket
          </Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
