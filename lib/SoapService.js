"use strict";
var utils_1 = require('./utils');
var soap = require('soap');
var fs = require('fs');
var utils = utils_1.Utils.utils;

var logger = require("../lib/winston.js");
var requestIp = require('request-ip');
const { prototype } = require('winston-daily-rotate-file');

var NOT_IMPLEMENTED = {
    Fault: {
        attributes: {
            'xmlns:ter': 'http://www.onvif.org/ver10/error',
        },
        Code: {
            Value: "soap:Sender",
            Subcode: {
                Value: "ter:NotAuthorized",
            },
        },
        Reason: {
            Text: {
                attributes: {
                    'xml:lang': 'en',
                },
                $value: 'Sender not Authorized',
            }
        }
    }
};
var ip;
var SoapService = (function () {
    function SoapService(config, server) {
        this.webserver = server;
        this.config = config;
        this.serviceInstance = null;
        this.startedCallbacks = [];
        this.isStarted = false;
        this.serviceOptions = {
            path: '',
            services: null,
            xml: null,
            wsdlPath: '',
            onReady: function () {}
        };
    }
    SoapService.prototype.starting = function () {};
    SoapService.prototype.started = function () {};
    SoapService.prototype.start = function () {
        var _this = this;
        this.starting();
        utils.log.info("Binding %s to http://%s:%s%s", this.constructor.name, utils.getIpAddress(), this.config.ServicePort, this.serviceOptions.path);
        var onReady = this.serviceOptions.onReady;
        this.serviceOptions.onReady = function () {
            _this._started();
            onReady();
        };
        this.serviceInstance = soap.listen(this.webserver, this.serviceOptions);
        this.serviceInstance.authenticate = function(security) {
            
            var password_ok_tmp = new Array();
            var users_tmp = JSON.parse(fs.readFileSync('userInfos.json', 'utf-8'));
            var users = users_tmp.userInfos;
            users.forEach(function (item, index, object) {
                var token = security.UsernameToken;
                var user = token.Username;
                var password = (token.Password.$value || token.Password);
                var nonce = (token.Nonce.$value || token.Nonce);
                var created = token.Created;
                var crypto = require('crypto');
                var pwHash = crypto.createHash('sha1');
                var rawNonce = new Buffer(nonce || '', 'base64');
                var onvif_username = item.Username;
                var onvif_password = item.Password;
                var combined_data = Buffer.concat([rawNonce,
                    Buffer.from(created, 'ascii'), Buffer.from(onvif_password, 'ascii')
                ]);
                pwHash.update(combined_data);
                var generated_password = pwHash.digest('base64');
                password_ok_tmp.push(user === onvif_username && password === generated_password);
                // console.log(password_ok_tmp);
            });
            // console.log(password_ok_tmp);
            for(var i=0; i<password_ok_tmp.length; i++){
                if(password_ok_tmp[i] === true)
                    var password_ok = true;
            }
            // console.log(password_ok);
            return password_ok;
        };
        this.serviceInstance.on("request", function (request, methodName) {
            utils.log.debug('%s received request %s', _this.constructor.name, methodName);
            logger.info('SOAP / ' + ip + ' / ' + _this.constructor.name + ' / '+ methodName);
        });
        this.serviceInstance.log = function (type, data) {
            if (_this.config.logSoapCalls)
                utils.log.debug('%s - Calltype : %s, Data : %s', _this.constructor.name, type, data);
        };
    };
    SoapService.prototype.onStarted = function (callback) {
        if (this.isStarted)
            callback();
        else
            this.startedCallbacks.push(callback);
    };
    SoapService.prototype._started = function () {
        this.isStarted = true;
        for (var _i = 0, _a = this.startedCallbacks; _i < _a.length; _i++) {
            var callback = _a[_i];
            callback();
        }
        this.startedCallbacks = [];
        this.started();
    };
    return SoapService;
}());
module.exports = SoapService;

//# sourceMappingURL=SoapService.js.map