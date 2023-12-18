import LightEntity from '../../entities/LightEntity'
import { NotificationLight, SoundType } from './types'
import { serviceCall } from '../../events/events'

export const switchNotificationLight = (
  light: LightEntity,
  type?: NotificationLight,
) => {
  switch (type) {
    case 'red':
      light.setColor(255, 5, 25)
      break
    case 'yellow':
      light.setColor(255, 182, 0)
      break
    case 'green':
      light.setColor(25, 255, 0)
      break
    case 'blue':
      light.setColor(0, 65, 255)
      break
    case 'purple':
      light.setColor(165, 0, 255)
      break
    case 'redFlashing':
      light.setEffect('Fast red strobe')
      break
    case 'blueFlashing':
      light.setEffect('Slow blue strobe')
      break
    default:
      light.turnOff()
  }
}

export const playSoundAlert = (type?: SoundType) => {
  let soundPayload: string | null
  switch (type) {
    case 'scaleUp':
      soundPayload = 'scale_up:d=32,o=5,b=100:c,c#,d#,e,f#,g#,a#,b'
      break
    case 'doubleBeep':
      soundPayload = 'two_short:d=4,o=5,b=100:16e6,16e6'
      break
    case 'alarm':
      soundPayload = 'siren:d=8,o=5,b=100:d,e,d,e,d,e,d,e'
      break
    default:
      soundPayload = null
  }
  if (soundPayload) {
    serviceCall.emit({
      domain: 'esphome',
      service: 'dash_node_play_rtttl',
      data: {
        song_str: soundPayload,
      },
    })
  }
}
