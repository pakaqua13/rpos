///<reference path="../rpos.d.ts" />

import fs = require("fs");
import util = require("util");
import os = require('os');
import SoapService = require('../lib/SoapService');
import { Utils }  from '../lib/utils';
import { Server } from 'http';
import ip = require('ip');
var utils = Utils.utils;

class DeviceIOService extends SoapService {
  device_service: any;
  callback: any;

  constructor(config: rposConfig, server: Server, callback) {
    super(config, server);

    this.device_service = require('./stubs/deviceio_service.js').DeviceIOService;
    this.callback = callback;

    this.serviceOptions = {
      path: '/onvif/deviceio_service',
      services: this.device_service,
      xml: fs.readFileSync('./wsdl/deviceio_service.wsdl', 'utf8'),
      wsdlPath: 'wsdl/deviceio_service.wsdl',
      onReady: () => console.log('deviceio_service started')
    };

    this.extendService();
  }

  extendService() {
    var port = this.device_service.DeviceIOService.DeviceIOPort;

  }
}
export = DeviceIOService;

