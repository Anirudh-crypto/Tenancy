import { router } from 'expo-router';
import { KeyRound, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, CardContent, Input, Text } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { useStore } from '@/lib/store';

type Step = 'request' | 'verify';

export default function ResetPasswordScreen() {
  const requestPasswordReset = useStore((s) => s.requestPasswordReset);
  const verifyPasswordReset = useStore((s) => s.verifyPasswordReset);
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onRequest = async () => {
    setError(null);
    setSubmitting(true);
    const result = await requestPasswordReset(email);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast({ title: 'Code sent', variant: 'success' });
    setStep('verify');
  };

  const onVerify = async () => {
    setError(null);
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const result = await verifyPasswordReset(email, code, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast({ title: 'Password updated', variant: 'success' });
    router.replace('/(tabs)');
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
                <KeyRound size={30} className="text-primary" />
              </View>
              <Text size="2xl" weight="bold">
                Reset password
              </Text>
              <Text variant="muted" size="sm" className="text-center">
                {step === 'request'
                  ? 'Enter your email and we’ll send you a 6-digit code'
                  : 'Enter the code and choose a new password'}
              </Text>
            </View>

            <Card>
              <CardContent className="gap-4 py-6">
                {step === 'request' ? (
                  <View className="gap-1.5">
                    <Text size="sm" weight="medium">
                      Email
                    </Text>
                    <View className="flex-row items-center gap-2 rounded-md border border-input bg-background px-3">
                      <Mail size={18} className="text-muted-foreground" />
                      <Input
                        className="flex-1 border-0 px-0"
                        placeholder="you@example.com"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>
                ) : (
                  <>
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
                    <View className="gap-1.5">
                      <Text size="sm" weight="medium">
                        New password
                      </Text>
                      <View className="flex-row items-center gap-2 rounded-md border border-input bg-background px-3">
                        <Lock size={18} className="text-muted-foreground" />
                        <Input
                          className="flex-1 border-0 px-0"
                          placeholder="••••••••"
                          secureTextEntry
                          value={password}
                          onChangeText={setPassword}
                        />
                      </View>
                    </View>
                  </>
                )}

                {error ? (
                  <Text size="sm" className="text-destructive">
                    {error}
                  </Text>
                ) : null}

                {step === 'request' ? (
                  <Button
                    onPress={() => void onRequest()}
                    disabled={submitting}
                    className="mt-1 h-12">
                    <Text weight="semibold" className="text-primary-foreground">
                      {submitting ? 'Sending…' : 'Send code'}
                    </Text>
                  </Button>
                ) : (
                  <>
                    <Button
                      onPress={() => void onVerify()}
                      disabled={submitting}
                      className="mt-1 h-12">
                      <Text weight="semibold" className="text-primary-foreground">
                        {submitting ? 'Updating…' : 'Update password'}
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
                          if (!submitting) void onRequest();
                        }}>
                        Resend code
                      </Text>
                    </View>
                  </>
                )}
              </CardContent>
            </Card>

            <View className="mt-6 items-center">
              <Text size="sm" variant="muted" onPress={() => router.replace('/login')}>
                Back to sign in
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
