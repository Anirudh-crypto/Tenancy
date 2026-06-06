import { Link, router } from 'expo-router';
import { Home, KeyRound, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, CardContent, Input, Text } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';

const ROLE_OPTIONS: { role: Role; title: string; sub: string; icon: typeof Home }[] = [
  { role: 'tenant', title: 'Tenant', sub: 'I rent a home', icon: KeyRound },
  { role: 'landlord', title: 'Landlord', sub: 'I manage a property', icon: Home },
];

export default function SignUpScreen() {
  const signUp = useStore((s) => s.signUp);
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('tenant');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const result = await signUp({ name, email, password, role });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.needsVerification) {
      toast({ title: 'Check your email for a code', variant: 'success' });
      router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
      return;
    }
    toast({ title: 'Account created', variant: 'success' });
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
            <View className="mb-6">
              <Text size="2xl" weight="bold">
                Create your account
              </Text>
              <Text variant="muted" size="sm" className="mt-1">
                Join the workspace for your tenancy
              </Text>
            </View>

            <View className="mb-4 flex-row gap-3">
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = role === opt.role;
                return (
                  <Pressable
                    key={opt.role}
                    onPress={() => setRole(opt.role)}
                    className={cn(
                      'flex-1 rounded-xl border p-4',
                      active ? 'border-primary bg-primary/10' : 'border-border bg-card'
                    )}>
                    <Icon
                      size={22}
                      className={active ? 'text-primary' : 'text-muted-foreground'}
                    />
                    <Text weight="semibold" className="mt-2">
                      {opt.title}
                    </Text>
                    <Text size="xs" variant="muted">
                      {opt.sub}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Card>
              <CardContent className="gap-4 py-6">
                <View className="gap-1.5">
                  <Text size="sm" weight="medium">
                    Full name
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-md border border-input bg-background px-3">
                    <User size={18} className="text-muted-foreground" />
                    <Input
                      className="flex-1 border-0 px-0"
                      placeholder="Your name"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

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
                      placeholder="At least 6 characters"
                      secureTextEntry
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

                <Button onPress={() => void onSubmit()} disabled={submitting} className="mt-1 h-12">
                  <Text weight="semibold" className="text-primary-foreground">
                    {submitting ? 'Creating…' : 'Create account'}
                  </Text>
                </Button>

                <View className="flex-row items-center justify-center gap-1">
                  <Text size="sm" variant="muted">
                    Already have an account?
                  </Text>
                  <Link href="/login">
                    <Text size="sm" weight="semibold" className="text-primary">
                      Sign in
                    </Text>
                  </Link>
                </View>
              </CardContent>
            </Card>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
