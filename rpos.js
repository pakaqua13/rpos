"use strict";
require("./lib/extension");


var http = require("http");
var https = require("https");
var fs = require('fs');
var express = require("express");
var utils_1 = require("./lib/utils");
var Camera = require("./lib/camera");
var PTZDriver = require("./lib/PTZDriver");
var DeviceService = require("./services/device_service");
var MediaService = require("./services/media_service");
var PTZService = require("./services/ptz_service");
var ImagingService = require("./services/imaging_service");
var DiscoveryService = require("./services/discovery_service");
var EventsService = require("./services/events_service");
var utils = utils_1.Utils.utils;
var pjson = require("./package.json");
var config = require("./rposConfig.json");
var logger = require("./lib/winston.js");
const winston = require('winston')
const { Server } = require("socket.io");



utils.log.level = config.logLevel;

if (utils.isPi()) {
    var model = require('rpi-version')();
    config.DeviceInformation.Manufacturer = 'i3system';
    config.DeviceInformation.Model = "Onvif Camera";
}

if (utils.isMac()) {
    var os = require('os');
    var macosRelease = require('macos-release');
    config.DeviceInformation.Manufacturer = 'RPOS AppleMac';
    config.DeviceInformation.Model = macosRelease()['name'] + ' ' + macosRelease()['version'];
}

config.DeviceInformation.SerialNumber = utils.getSerial();
config.DeviceInformation.FirmwareVersion = pjson.version;
utils.setConfig(config);
utils.testIpAddress();

for (var i in config.DeviceInformation) {
    utils.log.info("%s : %s", i, config.DeviceInformation[i]);
}


/**
 * 
 */
var webserver = express();
var httpserver = http.createServer(webserver);
const io = new Server(httpserver);
httpserver.listen(config.ServicePort, () => winston.info(`Listening on port ${config.ServicePort}...`));
const sslOptions = {
	key: fs.readFileSync('./keys/private.pem'),
	cert: fs.readFileSync('./keys/public.pem')
};
var httpsServer = https.createServer(sslOptions, webserver);
httpsServer.listen(config.httpsPort);


/**
 * ptz 드라이버
 * @typedef {Object}
 * @property {string} config
 */
var ptz_driver = new PTZDriver(config);
var camera = new Camera(config, webserver, io);
var device_service = new DeviceService(config, httpserver, ptz_driver.process_ptz_command);
var ptz_service = new PTZService(config, httpserver, ptz_driver.process_ptz_command, ptz_driver);
var imaging_service = new ImagingService(config, httpserver, ptz_driver.process_ptz_command);
var media_service = new MediaService(config, httpserver, camera, ptz_service);
var discovery_service = new DiscoveryService(config);
var events_service = new EventsService(config, httpserver, camera, ptz_service);
device_service.start();
events_service.start();
media_service.start();
ptz_service.start();
imaging_service.start();
discovery_service.start();


//# sourceMappingURL=rpos.js.map
