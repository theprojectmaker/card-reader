import { Platform } from 'react-native';

export const C = {
  bg: '#0B0D12',
  card: '#151922',
  line: '#232A36',
  text: '#F2F4F8',
  dim: '#9AA4B5',
  faint: '#5E6878',
  accent: '#5AC8FA',
  gold: '#D9B45A',
  danger: '#FF6B6B',
};

export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' });
