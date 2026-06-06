import * as Clipboard from 'expo-clipboard';
import { Copy, Plus, Share2, Ticket as TicketIcon, XCircle } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, Share, View } from 'react-native';

import { Badge, Button, Card, CardContent, Separator, Text } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { useStore } from '@/lib/store';
import type { Property } from '@/lib/types';

/**
 * Landlord-only section: generate a single-use invite ID for a property and
 * share it with a tenant. The tenant redeems the ID during signup.
 */
export function InviteTenantSection({ property }: { property: Property }) {
  const invites = useStore((s) => s.invites);
  const invitesLoading = useStore((s) => s.invitesLoading);
  const loadInvites = useStore((s) => s.loadInvites);
  const generateInvite = useStore((s) => s.generateInvite);
  const revokeInvite = useStore((s) => s.revokeInvite);
  const { toast } = useToast();

  useEffect(() => {
    void loadInvites(property.id);
  }, [loadInvites, property.id]);

  const activeInvites = invites.filter((i) => i.status === 'active');
  const usedInvites = invites.filter((i) => i.status !== 'active');

  const onGenerate = async () => {
    const result = await generateInvite(property.id);
    if (!result.ok) {
      toast({
        title: 'Could not create invite ID',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Invite ID created', variant: 'success' });
  };

  const onCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    toast({ title: 'Invite ID copied', variant: 'success' });
  };

  const onShare = async (code: string) => {
    try {
      await Share.share({
        message: `You've been invited to ${property.name} on TenancyOS.\n\nYour invite ID: ${code}\n\nDownload the app, choose "Tenant", and enter this ID to set up your account.`,
      });
    } catch {
      // user dismissed the share sheet — no-op
    }
  };

  return (
    <View className="mt-6">
      <View className="mb-2 flex-row items-center justify-between">
        <Text size="sm" weight="semibold" variant="muted">
          INVITE A TENANT
        </Text>
        {activeInvites.length > 0 ? (
          <Text size="xs" variant="muted">
            {activeInvites.length} active
          </Text>
        ) : null}
      </View>

      <Card>
        <CardContent className="gap-3 py-4">
          <View className="flex-row items-center gap-2">
            <TicketIcon size={16} className="text-primary" />
            <Text size="sm" variant="muted" className="flex-1">
              Generate a single-use invite ID and share it with your tenant. They redeem it when they
              create their account.
            </Text>
          </View>

          <Button onPress={() => void onGenerate()} className="h-11">
            <View className="flex-row items-center gap-2">
              <Plus size={18} className="text-primary-foreground" />
              <Text weight="semibold" className="text-primary-foreground">
                Generate invite ID
              </Text>
            </View>
          </Button>

          {invitesLoading && invites.length === 0 ? (
            <Text size="sm" variant="muted">
              Loading invite IDs…
            </Text>
          ) : null}

          {activeInvites.map((invite) => (
            <View key={invite.id} className="rounded-lg border border-border bg-muted/40 p-3">
              <View className="flex-row items-center justify-between">
                <Text size="lg" weight="bold" className="tracking-widest">
                  {invite.code}
                </Text>
                <Badge variant="secondary">
                  <Text size="xs" weight="semibold">
                    Active
                  </Text>
                </Badge>
              </View>
              <View className="mt-3 flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => void onShare(invite.code)}>
                  <View className="flex-row items-center gap-1.5">
                    <Share2 size={15} className="text-foreground" />
                    <Text size="sm" weight="medium">
                      Share
                    </Text>
                  </View>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => void onCopy(invite.code)}>
                  <View className="flex-row items-center gap-1.5">
                    <Copy size={15} className="text-foreground" />
                    <Text size="sm" weight="medium">
                      Copy
                    </Text>
                  </View>
                </Button>
                <Pressable
                  accessibilityLabel="Revoke invite ID"
                  hitSlop={8}
                  onPress={() => void revokeInvite(invite.id)}
                  className="min-h-[44px] min-w-[44px] items-center justify-center">
                  <XCircle size={20} className="text-destructive" />
                </Pressable>
              </View>
            </View>
          ))}

          {usedInvites.length > 0 ? (
            <>
              <Separator />
              <Text size="xs" weight="semibold" variant="muted">
                PAST INVITES
              </Text>
              {usedInvites.map((invite) => (
                <View
                  key={invite.id}
                  className="flex-row items-center justify-between py-1 opacity-70">
                  <Text size="sm" className="tracking-widest line-through">
                    {invite.code}
                  </Text>
                  <Badge variant="outline">
                    <Text size="xs">{invite.status === 'redeemed' ? 'Redeemed' : 'Revoked'}</Text>
                  </Badge>
                </View>
              ))}
            </>
          ) : null}
        </CardContent>
      </Card>
    </View>
  );
}
