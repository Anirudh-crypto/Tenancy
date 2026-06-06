import { Link } from 'expo-router';
import { Home, KeyRound, Lock, Mail, Ticket as TicketIcon, User } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, CardContent, Input, Text } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { previewInvite, type InvitePreview } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type Mode = 'tenant' | 'landlord';

const MODE_OPTIONS: { mode: Mode; title: string; sub: string; icon: typeof Home }[] = [
  { mode: 'tenant', title: 'Tenant', sub: 'I have an invite code', icon: KeyRound },
  { mode: 'landlord', title: 'Landlord', sub: 'I manage properties', icon: Home },
];

export default function SignUpScreen() {
  const signUp = useStore((s) => s.signUp);
  const signUpTenantWithInvite = useStore((s) => s.signUpTenantWithInvite);
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('tenant');

  // Landlord fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Tenant fields
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onCheckCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setError(null);
    setCheckingCode(true);
    const result = await previewInvite(trimmed);
    setCheckingCode(false);
    if (!result) {
      setPreview(null);
      setError('That invite code is invalid or has already been used.');
      return;
    }
    setPreview(result);
  };

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const result =
      mode === 'tenant'
        ? await signUpTenantWithInvite({ username, password, code })
        : await signUp({ name, email, password, role: 'landlord' });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast({ title: 'Account created', variant: 'success' });
    // Auth guard in app/_layout.tsx handles navigation once `user` is set.
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
              {MODE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = mode === opt.mode;
                return (
                  <Pressable
                    key={opt.mode}
                    onPress={() => {
                      setMode(opt.mode);
                      setError(null);
                    }}
                    className={cn(
                      'flex-1 rounded-xl border p-4',
                      active ? 'border-primary bg-primary/10' : 'border-border bg-card'
                    )}>
                    <Icon size={22} className={active ? 'text-primary' : 'text-muted-foreground'} />
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
                {mode === 'tenant' ? (
                  <>
                    <Input
                      label="Invite code"
                      leftIcon={<TicketIcon size={18} className="text-muted-foreground" />}
                      placeholder="e.g. BERL-7K2Q"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      value={code}
                      onChangeText={(t) => {
                        setCode(t);
                        setPreview(null);
                      }}
                      onBlur={() => void onCheckCode()}
                    />

                    {preview ? (
                      <View className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <Text size="xs" variant="muted">
                          You&apos;ll be added to
                        </Text>
                        <Text weight="semibold">{preview.propertyName}</Text>
                        <Text size="sm" variant="muted">
                          {preview.propertyAddress}, {preview.city}
                        </Text>
                      </View>
                    ) : (
                      <Text size="xs" variant="muted">
                        {checkingCode
                          ? 'Checking code…'
                          : 'Enter the code your landlord shared with you.'}
                      </Text>
                    )}

                    <Input
                      label="Username"
                      leftIcon={<User size={18} className="text-muted-foreground" />}
                      placeholder="Choose a username"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={username}
                      onChangeText={setUsername}
                    />
                  </>
                ) : (
                  <>
                    <Input
                      label="Full name"
                      leftIcon={<User size={18} className="text-muted-foreground" />}
                      placeholder="Your name"
                      value={name}
                      onChangeText={setName}
                    />

                    <Input
                      label="Email"
                      leftIcon={<Mail size={18} className="text-muted-foreground" />}
                      placeholder="you@example.com"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </>
                )}

                <Input
                  label="Password"
                  leftIcon={<Lock size={18} className="text-muted-foreground" />}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

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
