export const useTicker = (tick: () => void): void => useEffect(tick, [tick]) // oxlint-disable-line @systemfsoftware/ui-state/no-react-effect
import { useEffect } from 'react'
