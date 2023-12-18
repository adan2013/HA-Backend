const WS_CMD = {
  incoming: {
    SYNC_DATA: 'syncData',
    GET_STATUS: 'getStatus',
    SWITCH_SERVICE: 'switchService',
    TRIGGER_NOTIFICATION: 'triggerNotification',
    DISMISS_NOTIFICATION: 'dismissNotification',
  },
  outgoing: {
    WELCOME: 'welcome',
    DATA_UPDATE: 'dataUpdate',
    STATUS_UPDATE: 'statusUpdate',
  },
}

export default WS_CMD
