import Service from '../Service'
import Entity from '../../entities/Entity'
import StateMachine from '../../helpers/StateMachine'

type KitchenLightsState =
  | 'off'
  | 'disabled'
  | 'manual'
  | 'auto-on'
  | 'auto-dimming'

class KitchenController extends Service {
  private readonly LUX_DARK_THRESHOLD = 40
  private readonly DISABLED_STATE_DURATION = 6000
  private readonly DIMMING_STATE_DURATION = 10000
  private readonly DIMMING_BRIGHTNESS = 130
  private readonly AUTO_BRIGHTNESS = 255
  private readonly MANUAL_BRIGHTNESS = 255
  private remote = Entity.aqaraOpple('sensor.kitchenremote_action')
  private lightSensor = Entity.general(
    'sensor.kitchenmotionsensor_illuminance_lux',
  )
  private motionSensor = Entity.general(
    'binary_sensor.kitchenmotionsensor_occupancy',
  )
  private leftLight = Entity.monoLight('light.kitchenleftlight')
  private rightLight = Entity.monoLight('light.kitchenrightlight')
  private autoLightsToggle = Entity.toggle('input_boolean.kitchenautolights')
  private ignoreSunToggle = Entity.toggle(
    'input_boolean.kitchenignoresunposition',
  )
  private leftLightToggle = Entity.toggle('input_boolean.kitchenleftlighton')
  private rightLightToggle = Entity.toggle('input_boolean.kitchenrightlighton')
  public state: StateMachine<KitchenLightsState>
  private isDark = false

  constructor() {
    super('kitchenController')
    this.state = new StateMachine<KitchenLightsState>({
      name: 'state',
      defaultState: 'off',
      autoStateResetRules: [
        { from: 'disabled', to: 'off', delay: this.DISABLED_STATE_DURATION },
        { from: 'auto-dimming', to: 'off', delay: this.DIMMING_STATE_DURATION },
      ],
      onStateChange: (newState) => {
        switch (newState) {
          case 'off':
          case 'disabled':
            this.switchAllLights(0)
            break
          case 'manual':
            this.switchManualLights()
            break
          case 'auto-on':
            this.switchAllLights(this.AUTO_BRIGHTNESS)
            break
          case 'auto-dimming':
            this.switchAllLights(this.DIMMING_BRIGHTNESS)
            break
        }
      },
    })
    this.registerHelper(this.state)
    this.remote.onAnyShortPressCount(1, () => this.rightLightToggle.toggle())
    this.remote.onAnyShortPressCount(2, () => this.leftLightToggle.toggle())
    this.remote.onAnyShortPressCount(3, () => {
      this.state.setState('disabled')
      this.turnOffAllManualToggles()
    })
    this.remote.onAnyShortPressCount(4, () => this.ignoreSunToggle.toggle())
    this.remote.onHoldPress(4, () => this.autoLightsToggle.toggle())
    this.lightSensor.onAnyStateUpdate((state) => {
      const nowIsDark = Number(state.state) < this.LUX_DARK_THRESHOLD
      if (!this.isDark && nowIsDark) {
        this.switchState()
      }
      this.isDark = nowIsDark
    })
    this.motionSensor.onAnyStateUpdate(() => this.switchState())
    this.autoLightsToggle.onAnyStateUpdate(() => this.switchState())
    this.ignoreSunToggle.onAnyStateUpdate(() => this.switchState())
    this.leftLightToggle.onAnyStateUpdate(() => this.switchState())
    this.rightLightToggle.onAnyStateUpdate(() => this.switchState())
    this.switchState()
  }

  private switchAllLights(brightnessLvl: number) {
    this.leftLight.setBrightness(brightnessLvl, [this.rightLight.entityId])
  }

  private switchManualLights() {
    this.leftLight.setBrightness(
      this.leftLightToggle.isOn ? this.MANUAL_BRIGHTNESS : 0,
    )
    this.rightLight.setBrightness(
      this.rightLightToggle.isOn ? this.MANUAL_BRIGHTNESS : 0,
    )
  }

  private anyLightIsManuallyToggledOn() {
    return this.leftLightToggle.isOn || this.rightLightToggle.isOn
  }

  private turnOffAllManualToggles() {
    this.leftLightToggle.turnOff()
    this.rightLightToggle.turnOff()
  }

  private switchState() {
    if (this.state.currentState === 'disabled') {
      return
    }
    if (this.anyLightIsManuallyToggledOn()) {
      this.state.setState('manual')
    } else {
      if (this.autoLightsToggle.isOn) {
        if (this.motionSensor.isOff && this.state.currentState === 'auto-on') {
          this.state.setState('auto-dimming')
        } else {
          let isDark = false
          if (!this.lightSensor.isUnavailable) {
            isDark =
              Number(this.lightSensor.state?.state) < this.LUX_DARK_THRESHOLD
          }
          if (this.motionSensor.isOn && (this.ignoreSunToggle.isOn || isDark)) {
            this.state.setState('auto-on')
          } else {
            if (this.state.currentState !== 'auto-dimming') {
              this.state.setState('off')
            }
          }
        }
      } else {
        this.state.setState('off')
      }
    }
  }
}

export default KitchenController
