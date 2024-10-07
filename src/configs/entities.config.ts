const Entities = {
  binarySensor: {
    contact: {
      mainDoorDeadbolt: 'binary_sensor.maindoordeadboltsensor_contact',
    },
    motion: {
      kitchen: 'binary_sensor.kitchenmotionsensor_occupancy',
    },
    waterLeak: {
      washingMachine: 'binary_sensor.washingmachineleaksensor_water_leak',
      waterFilter: 'binary_sensor.waterfilterleaksensor_water_leak',
    },
  },
  inputBoolean: {
    automations: {
      balconyAutoLights: 'input_boolean.balconylightautoswitch',
      printerAutoOff: 'input_boolean.printerautooff',
    },
    kitchenLights: {
      autoLights: 'input_boolean.kitchenautolights',
      ignoreSunPosition: 'input_boolean.kitchenignoresunposition',
      leftLightOn: 'input_boolean.kitchenleftlighton',
      rightLightOn: 'input_boolean.kitchenrightlighton',
    },
    notifications: {
      dndAtNight: 'input_boolean.alertdndatnight',
      soundOn: 'input_boolean.alertsounds',
      tabletLight: 'input_boolean.alerttabletlights',
    },
    security: {
      deadboltMonitoring: 'input_boolean.alertdeadbolt',
      waterLeakMonitoring: 'input_boolean.alertwaterleak',
    },
    system: {
      alertBatteryLevel: 'input_boolean.alertbatterylevel',
      alertSelfDiagnostic: 'input_boolean.alertselfdiagnostic',
    },
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
    dashNode: {
      tabletLight: 'light.dash_node_tablet_notification_lights',
    },
    kitchen: {
      leftSide: 'light.kitchenleftlight',
      rightSide: 'light.kitchenrightlight',
    },
    livingRoom: {
      cabinet: 'light.cabinetlight',
      ceilingBackSection: 'light.livingroombacklight',
      ceilingFrontSection: 'light.livingroomfrontlight',
      table: 'light.tablelight',
      tv: 'light.tvlight',
    },
  },
  sensor: {
    bambuLabPrinter: {
      printStatus: 'sensor.p1s_01p00a453001011_print_status',
      nozzleTemperature: 'sensor.p1s_01p00a453001011_nozzle_temperature',
    },
    light: {
      kitchen: 'sensor.kitchenmotionsensor_illuminance_lux',
    },
    power: {
      airconditioner: {
        power: 'sensor.airconditionerbreaker_power',
        energy: 'sensor.airconditionerbreaker_energy',
      },
      bambuLabPrinter: {
        power: 'sensor.bambulabprinterplug_power',
        energy: 'sensor.bambulabprinterplug_energy',
      },
      washingMachine: {
        power: 'sensor.washingmachineplug_power',
        energy: 'sensor.washingmachineplug_energy',
      },
    },
    remote: {
      danielBed: 'sensor.danielbedremote_action',
      kitchen: 'sensor.kitchenremote_action',
      livingRoom: 'sensor.livingroomremote_action',
    },
  },
  switch: {
    plug: {
      balconyLights: 'switch.balconylight',
      bambuLabPrinter: 'switch.bambulabprinterplug',
    },
  },
}

export default Entities
