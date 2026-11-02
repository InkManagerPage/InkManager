'use client';
import type { ComponentProps } from 'react';
import { PanelReminderOverrides } from '@/components/panel/PanelReminderOverrides';
import { useArtistPanel } from './ArtistPanelProvider';
export function ReminderOverrides(
  props: Omit<ComponentProps<typeof PanelReminderOverrides>, 'datos' | 'baseRuta'>,
) {
  return <PanelReminderOverrides {...props} datos={useArtistPanel().datos} baseRuta="/artista" />;
}
