import { Link, router } from 'expo-router';
import { Building2, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, CardContent, Input, Separator, Text } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { useStore } from '@/lib/store';

export default function LoginScreen() {
  const signIn = useStore((s) => s.signIn);
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = () => {
    setError(null);
    setSubmitting(true);
    const result = signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast({ title: 'Welcome back', variant: 'success' });
    router.replace('/(tabs)');
  };

  const fillDemo = (role: 'tenant' | 'landlord') => {
    setError(null);
    if (role === 'tenant') {
      setEmail('lena@tenant.de');
      setPassword('password');
    } else {
      setEmail('becker@landlord.de');
      setPassword('password');
    }
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
                <Building2 size={30} className="text-primary" />
              </View>
              <Text size="2xl" weight="bold">
                TenancyOS
              </Text>
              <Text variant="muted" size="sm" className="text-center">
                The shared source of truth for your tenancy
              </Text>
            </View>

            <Card>
              <CardContent className="gap-4 py-6">
                <Text size="lg" weight="bold">
                  Sign in
                </Text>

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

                <View className="gap-1.5">
                  <Text size="sm" weight="medium">
                    Password
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-md border border-input bg-background px-3">
                    <Lock size={18} className="text-muted-foreground" />
                    <Input
                      className="flex-1 border-0 px-0"
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="password"
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>
                </View>

                {error ? (
                  <Text size="sm" className="text-destructive">
                    {error}
                  </Text>
                ) : null}

                <Button onPress={onSubmit} disabled={submitting} className="mt-1 h-12">
                  <Text weight="semibold" className="text-primary-foreground">
                    Sign in
                  </Text>
                </Button>

                <View className="flex-row items-center justify-center gap-1">
                  <Text size="sm" variant="muted">
                    No account yet?
                  </Text>
                  <Link href="/signup">
                    <Text size="sm" weight="semibold" className="text-primary">
                      Create one
                    </Text>
                  </Link>
                </View>
              </CardContent>
            </Card>

            <View className="mt-6">
              <View className="flex-row items-center gap-3">
                <Separator className="flex-1" />
                <Text size="xs" variant="muted">
                  DEMO ACCOUNTS
                </Text>
                <Separator className="flex-1" />
              </View>
              <View className="mt-3 flex-row gap-3">
                <Button variant="outline" className="flex-1" onPress={() => fillDemo('tenant')}>
                  <Text size="sm" weight="semibold">
                    Tenant
                  </Text>
                </Button>
                <Button variant="outline" className="flex-1" onPress={() => fillDemo('landlord')}>
                  <Text size="sm" weight="semibold">
                    Landlord
                  </Text>
                </Button>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
