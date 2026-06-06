import { router, useLocalSearchParams } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, CardContent, Input, Text } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { useStore } from '@/lib/store';

export default function VerifyScreen() {
  const params = useLocalSearchParams();
  const emailParam = params.email;
  const email = Array.isArray(emailParam) ? emailParam[0] ?? '' : emailParam ?? '';
  const verifySignup = useStore((s) => s.verifySignup);
  const resendSignupCode = useStore((s) => s.resendSignupCode);
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setSubmitting(true);
    const result = await verifySignup(email, code);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast({ title: 'Email verified', variant: 'success' });
    router.replace('/(tabs)');
  };

  const onResend = async () => {
    setError(null);
    setResending(true);
    const result = await resendSignupCode(email);
    setResending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast({ title: 'New code sent', variant: 'success' });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View className="mb-8 items-center gap-3">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MailCheck size={30} className="text-primary" />
              </View>
              <Text size="2xl" weight="bold">
                Verify your email
              </Text>
              <Text variant="muted" size="sm" className="text-center">
                We sent a 6-digit code to{'\n'}
                <Text size="sm" weight="semibold">
                  {email || 'your email'}
                </Text>
              </Text>
            </View>

            <Card>
              <CardContent className="gap-4 py-6">
                <View className="gap-1.5">
                  <Text size="sm" weight="medium">
                    Verification code
                  </Text>
                  <Input
                    className="text-center text-lg tracking-[8px]"
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                  />
                </View>

                {error ? (
                  <Text size="sm" className="text-destructive">
                    {error}
                  </Text>
                ) : null}

                <Button onPress={() => void onSubmit()} disabled={submitting} className="mt-1 h-12">
                  <Text weight="semibold" className="text-primary-foreground">
                    {submitting ? 'Verifying…' : 'Verify'}
                  </Text>
                </Button>

                <View className="flex-row items-center justify-center gap-1">
                  <Text size="sm" variant="muted">
                    Didn’t get it?
                  </Text>
                  <Text
                    size="sm"
                    weight="semibold"
                    className="text-primary"
                    onPress={() => {
                      if (!resending) void onResend();
                    }}>
                    {resending ? 'Sending…' : 'Resend code'}
                  </Text>
                </View>
              </CardContent>
            </Card>

            <View className="mt-6 items-center">
              <Text
                size="sm"
                variant="muted"
                onPress={() => router.replace('/login')}>
                Back to sign in
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
