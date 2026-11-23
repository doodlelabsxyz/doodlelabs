import type { ComponentType } from 'react'

import { CalendarCharacter } from './CalendarCharacter'
import { CelebrateCharacter } from './CelebrateCharacter'
import { EmptyBoxCharacter } from './EmptyBoxCharacter'
import { SleepyCharacter } from './SleepyCharacter'
import { WavingCharacter } from './WavingCharacter'
import type { IllustrationProps } from './types'

export { CalendarCharacter, CelebrateCharacter, EmptyBoxCharacter, SleepyCharacter, WavingCharacter }
export type { IllustrationProps }

export type IllustrationName = 'waving' | 'emptyBox' | 'celebrate' | 'calendar' | 'sleepy'

export const ILLUSTRATIONS: Record<IllustrationName, ComponentType<IllustrationProps>> = {
  waving: WavingCharacter,
  emptyBox: EmptyBoxCharacter,
  celebrate: CelebrateCharacter,
  calendar: CalendarCharacter,
  sleepy: SleepyCharacter,
}

export function Illustration({ name, ...props }: IllustrationProps & { name: IllustrationName }) {
  const Cmp = ILLUSTRATIONS[name]
  return <Cmp {...props} />
}
