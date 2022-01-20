"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};

var fs = require("fs");
var config = require('../rposConfig.json');
var SoapService = require('../lib/SoapService');
var utils_1 = require('../lib/utils');
var utils = utils_1.Utils.utils;

var EventsService = (function (_super) {
    __extends(EventsService, _super);
    function EventsService(config, server, camera, ptz_service) {
        _super.call(this, config, server);
        this.events_service = require('./stubs/events_service.js').EventsService;
        // this.callback = callback;
        this.camera = camera;
        this.ptz_service = ptz_service;
        this.serviceOptions = {
            path: '/onvif/events_service',
            services: this.events_service,
            xml: fs.readFileSync('./wsdl/events_service.wsdl', 'utf8'),
            wsdlPath: 'wsdl/events_service.wsdl',
            onReady: function () { return console.log('events_service started'); }
        };
        this.extendService();
    }
    EventsService.prototype.extendService = function () {
        var _this = this;
        var port = this.events_service.EventsService.Events;
        
        port.GetEventProperties = function(args /*, cb, headers*/) {
            // throw NOT_IMPLEMENTED;
            var GetEventPropertiesResponse = { 
              TopicNamespaceLocation : ["http://docs.oasis-open.org/wsn/t-1/TopicExpression/Concrete"],
              MessageContentFilterDialect : ["http://www.onvif.org/ver10/tev/messageContentFilter/ItemFilter"],
              MessageContentSchemaLocation : ["http://www.onvif.org/ver10/tev/messageContentFilter/ItemFilter"]
            
            };
            return GetEventPropertiesResponse;
        };
        
    };
    return EventsService;
}(SoapService));
module.exports = EventsService;

