import { useColorScheme } from 'react-native';
import { dark, light, type ThemeColors } from './tokens';

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
