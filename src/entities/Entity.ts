import HomeAssistantEntity, { EntityExtraOptions } from './HomeAssistantEntity'
import InputBooleanEntity from './InputBooleanEntity'
import InputDateTimeEntity from './InputDateTimeEntity'
import LightEntity from './LightEntity'
import InputSelectEntity from './InputSelectEntity'
import SwitchEntity from './SwitchEntity'
import AqaraOppleRemoteEntity from './AqaraOppleRemoteEntity'

class Entity {
  public static general(entityId: string, options?: EntityExtraOptions) {
    return new HomeAssistantEntity(entityId, options)
  }

  public static aqaraOpple(entityId: string) {
    return new AqaraOppleRemoteEntity(entityId)
  }

  public static toggle(entityId: string) {
    return new InputBooleanEntity(entityId)
  }

  public static dateTime(entityId: string) {
    return new InputDateTimeEntity(entityId)
  }

  public static select(entityId: string) {
    return new InputSelectEntity(entityId)
  }

  public static monoLight(entityId: string) {
    return new LightEntity(entityId, 'mono')
  }

  public static cctLight(entityId: string) {
    return new LightEntity(entityId, 'cct')
  }

  public static rgbLight(entityId: string) {
    return new LightEntity(entityId, 'rgb')
  }

  public static switch(entityId: string) {
    return new SwitchEntity(entityId)
  }
}

export default Entity
