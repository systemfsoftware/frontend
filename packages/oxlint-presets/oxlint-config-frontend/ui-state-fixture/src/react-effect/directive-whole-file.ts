/* oxlint-disable @systemfsoftware/ui-state/no-react-effect */
import { useEffect } from 'react'

export const useTicker = (tick: () => void): void => {
  useEffect(tick, [tick])
}
