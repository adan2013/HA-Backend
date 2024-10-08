import Service from '../Service'
import Entity from '../../entities/Entity'
import StateMachine from '../../helpers/StateMachine'
import DoubleThresholdToggle from '../../helpers/DoubleThresholdToggle'
import { notifications } from '../../events/events'
import Entities from '../../configs/entities.config'

type KitchenLightsState =
  | 'off'
  | 'disabled'
  | 'manual'
  | 'auto-on'
  | 'auto-dimming'

class KitchenController extends Service {
  private readonly NIGHT_LUX_THRESHOLD = 10
  private readonly DAY_LUX_THRESHOLD = 70
  private readonly DISABLED_STATE_DURATION = 6000
  private readonly DIMMING_STATE_DURATION = 10000
  private readonly DIMMING_BRIGHTNESS = 130
  private readonly AUTO_BRIGHTNESS = 255
  private readonly MANUAL_BRIGHTNESS = 255
  private remote = Entity.aqaraOppleRemote(Entities.sensor.remote.kitchen)
  private lightSensor = Entity.general(Entities.sensor.light.kitchen)
  private motionSensor = Entity.general(Entities.binarySensor.motion.kitchen)
  private leftLight = Entity.monoLight(Entities.light.kitchen.leftSide)
  private rightLight = Entity.monoLight(Entities.light.kitchen.rightSide)
  private autoLightsToggle = Entity.toggle(
    Entities.inputBoolean.kitchenLights.autoLights,
  )
  private ignoreSunToggle = Entity.toggle(
    Entities.inputBoolean.kitchenLights.ignoreSunPosition,
  )
  private leftLightToggle = Entity.toggle(
    Entities.inputBoolean.kitchenLights.leftLightOn,
  )
  private rightLightToggle = Entity.toggle(
    Entities.inputBoolean.kitchenLights.rightLightOn,
  )
  public state: StateMachine<KitchenLightsState>
  public dayNightToggle: DoubleThresholdToggle
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
        notifications.emit({
          id: 'manualKitchenLights',
          enabled: newState === 'manual',
        })
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
    this.dayNightToggle = new DoubleThresholdToggle({
      name: 'dayNightToggle',
      upperThreshold: this.DAY_LUX_THRESHOLD,
      lowerThreshold: this.NIGHT_LUX_THRESHOLD,
      onChange: (newState) => {
        if (newState === 'above') {
          this.isDark = false
          this.switchState()
        } else if (newState === 'below') {
          this.isDark = true
          this.switchState()
        }
      },
    })
    this.registerHelper(this.dayNightToggle)
    this.remote.onAnyShortPressCount(1, () => this.rightLightToggle.toggle())
    this.remote.onAnyShortPressCount(2, () => this.leftLightToggle.toggle())
    this.remote.onAnyShortPressCount(3, () => {
      this.state.setState('disabled')
      this.turnOffAllManualToggles()
    })
    this.remote.onAnyShortPressCount(4, () => this.ignoreSunToggle.toggle())
    this.remote.onHoldPress(4, () => this.autoLightsToggle.toggle())
    this.lightSensor.onAnyStateUpdate((state) =>
      this.dayNightToggle.inputValue(Number(state.state) || 0),
    )
    this.motionSensor.onAnyStateUpdate(() => this.switchState())
    this.autoLightsToggle.onAnyStateUpdate(() => this.switchState())
    this.ignoreSunToggle.onAnyStateUpdate(() => this.switchState())
    this.leftLightToggle.onAnyStateUpdate(() => this.switchState())
    this.rightLightToggle.onAnyStateUpdate(() => this.switchState())
    this.switchState()
  }

  private switchAllLights(brightnessLvl: number) {
    if (this.isDisabled) return
    this.leftLight.setBrightness(brightnessLvl, [this.rightLight.entityId])
  }

  private switchManualLights() {
    if (this.isDisabled) return
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
    if (this.isDisabled) return
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
          if (
            this.motionSensor.isOn &&
            (this.ignoreSunToggle.isOn || this.isDark)
          ) {
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
