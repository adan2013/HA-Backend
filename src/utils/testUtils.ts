import { EntityAttributeInterface, EntityState } from '../connectors/types'
import {
  anyEntityUpdate,
  entityStateRequest,
  entityUpdate,
} from '../events/events'

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
  const payload: EntityState = {
    id: entityId,
    state,
    lastChanged: '',
    lastUpdated: '',
    attributes: {
      friendly_name: `${entityId}_name`,
      ...attributes,
    },
  }
  entityUpdate(entityId).emit(payload)
  anyEntityUpdate.emit(payload)
}
