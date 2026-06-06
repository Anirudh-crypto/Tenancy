import { View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { SEVERITY_META, URGENCY_META } from '@/lib/ai';
import type { DamageSeverity, RiskLevel, Urgency } from '@/lib/types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';

function toneToVariant(tone: string): BadgeVariant {
  switch (tone) {
    case 'destructive':
      return 'destructive';
    case 'success':
      return 'success';
    case 'warning':
      return 'default';
    case 'primary':
      return 'default';
    default:
      return 'secondary';
  }
}

export function UrgencyBadge({ urgency, pulse }: { urgency: Urgency; pulse?: boolean }) {
  const meta = URGENCY_META[urgency];
  const variant = meta.tone === 'warning' ? 'outline' : toneToVariant(meta.tone);
  return (
    <Badge
      variant={variant}
      pulse={pulse && urgency === 'emergency'}
      className={meta.tone === 'warning' ? 'border-accent' : undefined}
      textClassName={meta.tone === 'warning' ? 'text-accent' : undefined}>
      {meta.label}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: DamageSeverity }) {
  const meta = SEVERITY_META[severity];
  return <Badge variant={toneToVariant(meta.tone)}>{meta.label}</Badge>;
}

const RISK_VARIANT: Record<RiskLevel, BadgeVariant> = {
  high: 'destructive',
  medium: 'outline',
  low: 'success',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <Badge
      variant={RISK_VARIANT[level]}
      className={level === 'medium' ? 'border-accent' : undefined}
      textClassName={level === 'medium' ? 'text-accent' : undefined}>
      {level.toUpperCase()}
    </Badge>
  );
}

export function StatusPill({ status }: { status: string }) {
  const label = status.replace('_', ' ');
  return (
    <View className="rounded-full bg-secondary px-2.5 py-0.5">
      <Text size="xs" weight="semibold" className="capitalize text-secondary-foreground">
        {label}
      </Text>
    </View>
  );
}
