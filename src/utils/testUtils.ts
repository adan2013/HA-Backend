import { EntityAttributeInterface } from '../connectors/types'
import { entityStateRequest, entityUpdate } from '../events/events'

export const mockEntity = (
  entityId: string,
  state: string,
  attributes: Partial<EntityAttributeInterface> = {},
) => {
  entityStateRequest.on((payload) => {
    if (payload.entityId === entityId) {
      payload.callback({
        id: entityId,
        state,
        lastChanged: '',
        lastUpdated: '',
        attributes: {
          friendly_name: `${entityId}_name`,
          ...attributes,
        },
      })
    }
  })
}

export const emitStateUpdate = (
  entityId: string,
  state: string,
  attributes: Partial<EntityAttributeInterface> = {},
) => {
  entityUpdate(entityId).emit({
    id: entityId,
    state,
    lastChanged: '',
    lastUpdated: '',
    attributes: {
      friendly_name: `${entityId}_name`,
      ...attributes,
    },
  })
}
