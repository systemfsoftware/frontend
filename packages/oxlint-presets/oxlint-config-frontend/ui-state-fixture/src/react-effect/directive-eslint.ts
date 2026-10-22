import { useEffect } from 'react'

export const useTicker = (tick: () => void): void => {
  // eslint-disable-next-line @systemfsoftware/ui-state/no-react-effect
  useEffect(tick, [tick])
}
