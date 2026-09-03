const WS_CMD = {
  incoming: {
    AUTH: 'auth',
    SUBSCRIBE_ENTITY: 'subscribeEntity',
    UNSUBSCRIBE_ENTITY: 'unsubscribeEntity',
    CALL_SERVICE: 'callService',
    GET_ENTITY_HISTORY: 'getEntityHistory',
    GET_ENTITIES: 'getEntities',
    SYNC_DATA: 'syncData',
    GET_STATUS: 'getStatus',
    SWITCH_SERVICE: 'switchService',
    TRIGGER_NOTIFICATION: 'triggerNotification',
    DISMISS_NOTIFICATION: 'dismissNotification',
    REMOTE_CONTROL: 'remoteControl',
  },
  outgoing: {
    AUTH_REQUIRED: 'auth_required',
    AUTH_OK: 'auth_ok',
    AUTH_INVALID: 'auth_invalid',
    ENTITY_STATE: 'entityState',
    ENTITY_CHANGED: 'entityChanged',
    SUBSCRIPTION_ERROR: 'subscriptionError',
    COMMAND_RESULT: 'commandResult',
    ENTITY_HISTORY_RESULT: 'entityHistoryResult',
    ENTITIES_RESULT: 'entitiesResult',
    HA_STATUS: 'homeAssistantStatus',
    WELCOME: 'welcome',
    DATA_UPDATE: 'dataUpdate',
    STATUS_UPDATE: 'statusUpdate',
  },
}

export default WS_CMD
