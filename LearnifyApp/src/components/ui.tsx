import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, ViewStyle, TextStyle, TextInputProps,
} from 'react-native';
import { Colors, FontSize, BorderRadius, Spacing, Shadow } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

// --- Button ---
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  icon, loading, disabled, style, fullWidth,
}: ButtonProps) {
  const btnStyles = buttonVariants[variant];
  const sizeStyles = buttonSizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button, sizeStyles.container, btnStyles.container,
        fullWidth && { width: '100%' },
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={btnStyles.textColor} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon && (
            <Ionicons name={icon} size={sizeStyles.iconSize} color={btnStyles.textColor} style={{ marginRight: 6 }} />
          )}
          <Text style={[styles.buttonText, sizeStyles.text, { color: btnStyles.textColor }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const buttonVariants: Record<string, { container: ViewStyle; textColor: string }> = {
  primary: { container: { backgroundColor: Colors.primary }, textColor: '#FFF' },
  secondary: { container: { backgroundColor: Colors.secondary }, textColor: '#FFF' },
  outline: { container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary }, textColor: Colors.primary },
  ghost: { container: { backgroundColor: 'transparent' }, textColor: Colors.primary },
  danger: { container: { backgroundColor: Colors.error }, textColor: '#FFF' },
};

const buttonSizes: Record<string, { container: ViewStyle; text: TextStyle; iconSize: number }> = {
  sm: { container: { paddingVertical: 8, paddingHorizontal: 14 }, text: { fontSize: FontSize.sm }, iconSize: 16 },
  md: { container: { paddingVertical: 12, paddingHorizontal: 20 }, text: { fontSize: FontSize.md }, iconSize: 18 },
  lg: { container: { paddingVertical: 16, paddingHorizontal: 28 }, text: { fontSize: FontSize.lg }, iconSize: 22 },
};

// --- Input ---
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, icon, containerStyle, style, ...props }: InputProps) {
  return (
    <View style={[{ marginBottom: Spacing.lg }, containerStyle]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {icon && (
          <Ionicons name={icon} size={20} color={Colors.textTertiary} style={{ marginRight: 10 }} />
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textTertiary}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// --- Card ---
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  padding?: number;
}

export function Card({ children, style, onPress, padding = Spacing.lg }: CardProps) {
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
  const content = (
    <View style={[styles.card, { padding }, flatStyle]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// --- Badge ---
interface BadgeProps {
  text: string;
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md';
}

export function Badge({ text, color = Colors.primaryLight, textColor = '#FFF', size = 'sm' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }, size === 'md' && { paddingVertical: 5, paddingHorizontal: 12 }]}>
      <Text style={[styles.badgeText, { color: color }, size === 'md' && { fontSize: FontSize.sm }]}>{text}</Text>
    </View>
  );
}

// --- Progress Bar ---
interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({ progress, color = Colors.primary, height = 6, showLabel, style }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  return (
    <View style={style}>
      {showLabel && (
        <Text style={styles.progressLabel}>{Math.round(clampedProgress)}%</Text>
      )}
      <View style={[styles.progressTrack, { height }]}>
        <View style={[styles.progressFill, { width: `${clampedProgress}%`, backgroundColor: color, height }]} />
      </View>
    </View>
  );
}

// --- Stat Card ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  style?: ViewStyle | ViewStyle[];
}

export function StatCard({ title, value, icon, color, style }: StatCardProps) {
  return (
    <Card style={[styles.statCard, ...(Array.isArray(style) ? style : style ? [style] : [])] as any}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Card>
  );
}

// --- Empty State ---
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  action?: { title: string; onPress: () => void };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={64} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action && <Button title={action.title} onPress={action.onPress} style={{ marginTop: Spacing.lg }} />}
    </View>
  );
}

// --- Section Header ---
export function SectionHeader({ title, action }: { title: string; action?: { text: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.text}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- Loading Screen ---
export function LoadingScreen({ message }: { message?: string }) {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: 14,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  progressTrack: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: BorderRadius.full,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 4,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    minWidth: 140,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  statTitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptyMessage: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionAction: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
});
