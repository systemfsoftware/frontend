import { useEffect } from 'react'

export const useTicker = (tick: () => void): void => {
  // oxlint-disable-next-line @systemfsoftware/ui-state/no-react-effect -- the ticker needs a timer
  useEffect(tick, [tick])
}
