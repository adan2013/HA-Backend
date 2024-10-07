const Entities = {
  binarySensor: {
    kitchen: {
      motionSensor: 'binary_sensor.kitchenmotionsensor_occupancy',
    },
    mainDoorDeadboltSensor: 'binary_sensor.maindoordeadboltsensor_contact',
    washingMachineLeakSensor:
      'binary_sensor.washingmachineleaksensor_water_leak',
    waterFilterLeakSensor: 'binary_sensor.waterfilterleaksensor_water_leak',
  },
  inputBoolean: {
    notifications: {
      dndAtNight: 'input_boolean.alertdndatnight',
      soundOn: 'input_boolean.alertsounds',
      tabletLight: 'input_boolean.alerttabletlights',
    },
    security: {
      deadboltMonitoring: 'input_boolean.alertdeadbolt',
      waterLeakMonitoring: 'input_boolean.alertwaterleak',
    },
    alertBatteryLevel: 'input_boolean.alertbatterylevel',
    alertSelfDiagnostic: 'input_boolean.alertselfdiagnostic',
    balconyLightAutoSwitch: 'input_boolean.balconylightautoswitch',
    kitchenAutoLights: 'input_boolean.kitchenautolights',
    kitchenIgnoreSunPosition: 'input_boolean.kitchenignoresunposition',
    kitchenLeftLightOn: 'input_boolean.kitchenleftlighton',
    kitchenRightLightOn: 'input_boolean.kitchenrightlighton',
    printerAutoOff: 'input_boolean.printerautooff',
  },
  inputDateTime: {
    carInsurance: 'input_datetime.carinsurance',
    carTechnicalInspection: 'input_datetime.cartechnicalinspection',
    coffeeMachineCleaning: 'input_datetime.coffeemachinecleaning',
    kitchenFilterService: 'input_datetime.kitchenfilterservice',
    kitchenFinalFilterService: 'input_datetime.kitchenfinalfilterservice',
    kitchenMembraneFilterService: 'input_datetime.kitchenmembranefilterservice',
  },
  light: {
    danielRoom: {
      bedLamp: 'light.danielbedlamp',
    },
    dashNodeTabletNotificationLights:
      'light.dash_node_tablet_notification_lights',
    kitchen: {
      leftSide: 'light.kitchenleftlight',
      rightSide: 'light.kitchenrightlight',
    },
    livingRoom: {
      backCeilingSection: 'light.livingroombacklight',
      cabinet: 'light.cabinetlight',
      frontCeilingSection: 'light.livingroomfrontlight',
      table: 'light.tablelight',
      tv: 'light.tvlight',
    },
  },
  sensor: {
    airConditionerBreaker: {
      power: 'sensor.airconditionerbreaker_power',
      energy: 'sensor.airconditionerbreaker_energy',
    },
    bambuLabPrinterPlug: {
      power: 'sensor.bambulabprinterplug_power',
      energy: 'sensor.bambulabprinterplug_energy',
    },
    danielRoom: {
      bedRemote: 'sensor.danielbedremote_action',
    },
    kitchen: {
      lightSensor: 'sensor.kitchenmotionsensor_illuminance_lux',
      remote: 'sensor.kitchenremote_action',
    },
    livingRoom: {
      remote: 'sensor.livingroomremote_action',
    },
    bambuLabPrinter: {
      printStatus: 'sensor.p1s_01p00a453001011_print_status',
      nozzleTemperature: 'sensor.p1s_01p00a453001011_nozzle_temperature',
    },
    washingMachinePlug: {
      power: 'sensor.washingmachineplug_power',
      energy: 'sensor.washingmachineplug_energy',
    },
  },
  switch: {
    balconyLightPlug: 'switch.balconylight',
    plug: {
      bambuLabPrinter: 'switch.bambulabprinterplug',
    },
  },
}

export default Entities
