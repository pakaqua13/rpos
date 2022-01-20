"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var config = require('../rposConfig.json');
// var userInfos = require('../userInfos.json');
var updateJsonFile = require('update-json-file')
var defaultGateway = require('default-gateway');
var dns = require('dns');
var fs = require("fs");
var os = require('os');
var SoapService = require('../lib/SoapService');
var utils_1 = require('../lib/utils');
var ip = require('ip');
const { execSync } = require('child_process');
var utils = utils_1.Utils.utils;


var UsernameAlreadyExists = {
    Fault: {
      Code: {
        Value: "env:Sender",
        Subcode: {
            Value: "ter:OperationProhibited",
            Subcode: {
                Value: "ter:UsernameClash"
            }
        }
      },
      Reason: {
        Text: "Username already exists."
      }
    }
};
var FixedUser = {
    Fault: {
      Code: {
        Value: "env:Sender",
        Subcode: {
            Value: "ter:InvalidArgVal",
            Subcode: {
                Value: "ter:FixedUser"
            }
        }
      },
      Reason: {
        Text: "Username may not be deleted"
      }
    }
};


var configPath = './rposConfig.json'
var getSubnetMaskString = (netmask) => {
    var mask = parseInt(netmask, 10);
    var maskArray = [];
    if (mask >= 0 && mask <= 32) {
        var sumMask = (i) => {
            let total = 0;
            let powTimes = 7;
            let doTimes = 8 - i;
            while (doTimes > 0) {
                total += 2 ** powTimes;
                powTimes -= 1;
                doTimes -= 1;
            }
            return total;
        };
        var index = 8 - (mask % 8);
        [0, 8, 16, 24].forEach((e) => {
            if (mask <= e) maskArray.push(0);
            else if (mask >= e + 8) maskArray.push(255);
            else maskArray.push(sumMask(index));
            // maskArray.push(mask <= e ? '0' : (mask >= e + 8) ? 255 : sumMask(index));
        });
    } else return null;
    return maskArray.join('.');
    // getSubnetMaskString('23')
};

// var userInfos = [
//     {
//         'Username': 'test1',
//         'Password': 'password',
//         'UserLevel': 'Administrator'
//     },
//     {
//         'Username': 'test2',
//         'Password': 'password',
//         'UserLevel': 'Operator'
//     },
//     {
//         'Username': 'test3',
//         'Password': 'password',
//         'UserLevel': 'User'
//     }
// ]l

var DeviceService = (function (_super) {
    __extends(DeviceService, _super);
    function DeviceService(config, server, callback) {
        _super.call(this, config, server);
        this.device_service = require('./stubs/device_service.js').DeviceService;
        this.callback = callback;
        this.serviceOptions = {
            path: '/onvif/device_service',
            services: this.device_service,
            xml: fs.readFileSync('./wsdl/device_service.wsdl', 'utf8'),
            wsdlPath: 'wsdl/device_service.wsdl',
            onReady: function () { return console.log('device_service started'); }
        };
        this.extendService();
    }
    DeviceService.prototype.extendService = function () {
        var _this = this;
        var port = this.device_service.DeviceService.Device;
        port.GetDeviceInformation = function (args) {
            var GetDeviceInformationResponse = {
                Manufacturer: _this.config.DeviceInformation.Manufacturer,
                Model: _this.config.DeviceInformation.Model,
                FirmwareVersion: _this.config.DeviceInformation.FirmwareVersion,
                SerialNumber: _this.config.DeviceInformation.SerialNumber,
                HardwareId: _this.config.DeviceInformation.HardwareId
            };
            return GetDeviceInformationResponse;
        };
        port.GetSystemDateAndTime = function (args) {
            // Ideally this code would compute a full POSIX TZ string with daylight saving
            // For now we will compute the current time zone as a UTC offset
            // Note that what we call UTC+ 1 in called UTC-1 in Posix TZ format
            var config_tmp = JSON.parse(fs.readFileSync('rposConfig.json', 'utf-8'));
            // var dnsfromdhcp = config_tmp.DateTimeType;

            if (config_tmp.DateTimeType == "NTP") {
                var now = new Date();
                var offset = now.getTimezoneOffset();
                var abs_offset = Math.abs(offset);
                console.log(offset);
                var hrs_offset = Math.floor(abs_offset / 60);
                var mins_offset = (abs_offset % 60);
                var tz = "UTC" + (offset < 0 ? '-' : '+') + hrs_offset + (mins_offset === 0 ? '' : ':' + mins_offset);
                var GetSystemDateAndTimeResponse = {
                    SystemDateAndTime: {
                        DateTimeType: "NTP",
                        DaylightSavings: now.dst(),
                        TimeZone: {
                            TZ: tz
                        },
                        UTCDateTime: {
                            Time: { Hour: now.getUTCHours(), Minute: now.getUTCMinutes(), Second: now.getUTCSeconds() },
                            Date: { Year: now.getUTCFullYear(), Month: now.getUTCMonth() + 1, Day: now.getUTCDate() }
                        },
                        LocalDateTime: {
                            Time: { Hour: now.getHours(), Minute: now.getMinutes(), Second: now.getSeconds() },
                            Date: { Year: now.getFullYear(), Month: now.getMonth() + 1, Day: now.getDate() }
                        },
                        Extension: {}
                    }
                };
            } else {
                var now = new Date();
                var offset = now.getTimezoneOffset();
                var abs_offset = Math.abs(offset);
                console.log(offset);
                var hrs_offset = Math.floor(abs_offset / 60);
                var mins_offset = (abs_offset % 60);
                var tz = "UTC" + (offset < 0 ? '-' : '+') + hrs_offset + (mins_offset === 0 ? '' : ':' + mins_offset);
                var GetSystemDateAndTimeResponse = {
                    SystemDateAndTime: {
                        DateTimeType: "Manual",
                        DaylightSavings: now.dst(),
                        TimeZone: {
                            TZ: tz
                        },
                        UTCDateTime: {
                            Time: { Hour: now.getUTCHours(), Minute: now.getUTCMinutes(), Second: now.getUTCSeconds() },
                            Date: { Year: now.getUTCFullYear(), Month: now.getUTCMonth() + 1, Day: now.getUTCDate() }
                        },
                        LocalDateTime: {
                            Time: { Hour: now.getHours(), Minute: now.getMinutes(), Second: now.getSeconds() },
                            Date: { Year: now.getFullYear(), Month: now.getMonth() + 1, Day: now.getDate() }
                        },
                        Extension: {}
                    }
                };
            }

            
            return GetSystemDateAndTimeResponse;
        };
        port.SetSystemDateAndTime = function (args) {
            console.log(args.DateTimeType);
            updateJsonFile(configPath, (config) => {
                config.DateTimeType = args.DateTimeType;
                
                return config;
            });
            if (args.DateTimeType == "NTP"){
                utils.execSync("sudo timedatectl set-ntp true");
            } else {
                utils.execSync("sudo timedatectl set-ntp false");
                utils.execSync(`sudo date -s '${args.UTCDateTime.Date.Year}-${args.UTCDateTime.Date.Month}-${args.UTCDateTime.Date.Day} ${args.UTCDateTime.Time.Hour}:${args.UTCDateTime.Time.Minute}:${args.UTCDateTime.Time.Second}'`);
            }

            var SetSystemDateAndTimeResponse = {};
            return SetSystemDateAndTimeResponse;
        };
        port.SetSystemFactoryDefault = function(args) {
            fs.readFile('./freset/data/Camera_Setting', function (err, data) {
                if (err) throw err;
                fs.writeFile('./data/Camera_Setting', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            fs.readFile('./freset/data/DDNS', function (err, data) {
                if (err) throw err;
                fs.writeFile('./data/DDNS', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            fs.readFile('./freset/data/FTP', function (err, data) {
                if (err) throw err;
                fs.writeFile('./data/FTP', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            fs.readFile('./freset/data/IP_Setting', function (err, data) {
                if (err) throw err;
                fs.writeFile('./data/IP_Setting', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            fs.readFile('./freset/data/NTP', function (err, data) {
                if (err) throw err;
                fs.writeFile('./data/NTP', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            fs.readFile('./freset/data/Port', function (err, data) {
                if (err) throw err;
                fs.writeFile('./data/Port', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            fs.readFile('./freset/data/SMTP', function (err, data) {
                if (err) throw err;
                fs.writeFile('./data/SMTP', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            fs.readFile('./freset/data/SMTP', function (err, data) {
                if (err) throw err;
                fs.writeFile('./data/SMTP', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            fs.readFile('./freset/rposConfig.json', function (err, data) {
                if (err) throw err;
                fs.writeFile('./rposConfig.json', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            fs.readFile('./freset/v4l2ctl.json', function (err, data) {
                if (err) throw err;
                fs.writeFile('./v4l2ctl.json', data.toString(), function (err) {
                    if (err) throw err;
                });
            });
            if (args.FactoryDefault === 'Hard'){
                fs.readFile('./freset/dhcpcd.conf', function (err, data) {
                    if (err) throw err;
                    fs.writeFile('../../../etc/dhcpcd.conf', data.toString(), function (err) {
                        // fs.writeFile('./dhcpcd.conf', dIP, function (err) {
                        if (err) throw err;
                    });
                });
            }
            utils.execSync("sudo shutdown -r -t 1")
            var SetSystemFactoryDefaultResponse = { };
            return SetSystemFactoryDefaultResponse;
          }
        port.SystemReboot = function (args) {
            utils.execSync("sudo shutdown -r -t 1")
            var SystemRebootResponse = {
                Message: "Rebooting in 1 minutes."
            };
            return SystemRebootResponse;
        };
        port.GetServices = function (args) {
            var GetServicesResponse = {
                Service: [
                    {
                        Namespace: "http://www.onvif.org/ver10/device/wsdl",
                        XAddr: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/onvif/device_service",
                        Version: {
                            Major: 2,
                            Minor: 5,
                        }
                    },
                    {
                        Namespace: "http://www.onvif.org/ver20/imaging/wsdl",
                        XAddr: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/onvif/imaging_service",
                        Version: {
                            Major: 2,
                            Minor: 5,
                        }
                    },
                    {
                        Namespace: "http://www.onvif.org/ver10/media/wsdl",
                        XAddr: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/onvif/media_service",
                        Version: {
                            Major: 2,
                            Minor: 5,
                        }
                    },
                    {
                        Namespace: "http://www.onvif.org/ver20/ptz/wsdl",
                        XAddr: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/onvif/ptz_service",
                        Version: {
                            Major: 2,
                            Minor: 5,
                        },
                    }]
            };
            return GetServicesResponse;
        };
        port.GetCapabilities = function (args) {
            var category = args.Category;
            var GetCapabilitiesResponse = {
                Capabilities: {}
            };
            if (category === undefined || category == "All" || category == "Device") {
                GetCapabilitiesResponse.Capabilities["Device"] = {
                    XAddr: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/onvif/device_service",
                    Network: {
                        IPFilter: false,
                        ZeroConfiguration: false,
                        IPVersion6: false,
                        DynDNS: false,
                        Extension: {
                            Dot11Configuration: false,
                            Extension: {}
                        }
                    },
                    System: {
                        DiscoveryResolve: false,
                        DiscoveryBye: false,
                        RemoteDiscovery: false,
                        SystemBackup: false,
                        SystemLogging: false,
                        FirmwareUpgrade: false,
                        SupportedVersions: {
                            Major: 2,
                            Minor: 5
                        },
                        Extension: {
                            HttpFirmwareUpgrade: false,
                            HttpSystemBackup: false,
                            HttpSystemLogging: false,
                            HttpSupportInformation: false,
                            Extension: {}
                        }
                    },
                    IO: {
                        InputConnectors: 0,
                        RelayOutputs: 1,
                        Extension: {
                            Auxiliary: false,
                            AuxiliaryCommands: "",
                            Extension: {}
                        }
                    },
                    Security: {
                        "TLS1.1": false,
                        "TLS1.2": false,
                        OnboardKeyGeneration: false,
                        AccessPolicyConfig: false,
                        "X.509Token": false,
                        SAMLToken: false,
                        KerberosToken: false,
                        RELToken: false,
                        Extension: {
                            "TLS1.0": false,
                            Extension: {
                                Dot1X: false,
                                RemoteUserHandling: false
                            }
                        }
                    },
                    Extension: {}
                };
            }
            if (category == undefined || category == "All" || category == "Events") {
                GetCapabilitiesResponse.Capabilities["Events"] = {
                    XAddr: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/onvif/events_service",
                    WSSubscriptionPolicySupport: false,
                    WSPullPointSupport: false,
                    WSPausableSubscriptionManagerInterfaceSupport: false
                };
            }
            if (category === undefined || category == "All" || category == "Imaging") {
                GetCapabilitiesResponse.Capabilities["Imaging"] = {
                    XAddr: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/onvif/imaging_service"
                };
            }
            if (category === undefined || category == "All" || category == "Media") {
                GetCapabilitiesResponse.Capabilities["Media"] = {
                    XAddr: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/onvif/media_service",
                    StreamingCapabilities: {
                        RTPMulticast: _this.config.MulticastEnabled,
                        RTP_TCP: true,
                        RTP_RTSP_TCP: true,
                        Extension: {}
                    },
                    Extension: {
                        ProfileCapabilities: {
                            MaximumNumberOfProfiles: 1
                        }
                    }
                };
            }
            if (category === undefined || category == "All" || category == "PTZ") {
                GetCapabilitiesResponse.Capabilities["PTZ"] = {
                    XAddr: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/onvif/ptz_service"
                };
            }
            return GetCapabilitiesResponse;
        };
        port.GetHostname = function (args) {
            if(os.hostname() === "raspberrypi"){
                var GetHostnameResponse = {   
                    HostnameInformation: {
                        FromDHCP: true,
                        Name: os.hostname(),
                        Extension: {}
                    }
                };        
            } else{
                var GetHostnameResponse = {   
                    HostnameInformation: {
                        FromDHCP: false,
                        Name: os.hostname(),
                        Extension: {}
                    }
                };
            }
            return GetHostnameResponse;
        };
        port.SetHostname = function (args) {
            // console.log(args.Name[0]);
            if(args.Name[0] === undefined){
                var hostName = "raspberrypi";
                var hosts = `127.0.0.1	localhost
::1		localhost ip6-localhost ip6-loopback
ff02::1		ip6-allnodes
ff02::2		ip6-allrouters

127.0.1.1   raspberrypi`;
            } else {
                var hostName = args.Name;
                var hosts = `127.0.0.1	localhost
::1		localhost ip6-localhost ip6-loopback
ff02::1		ip6-allnodes
ff02::2		ip6-allrouters

127.0.1.1	${args.Name}`;
            }
            fs.writeFile('../../../etc/hostname', hostName, function (err) {
                if (err) throw err;
                console.log('success');
            });
            fs.writeFile('../../../etc/hosts', hosts, function (err) {
                if (err) throw err;
                console.log('success');
            });

            var SetHostnameResponse = {};
            return SetHostnameResponse;
        };
        // port.SetHostnameFromDHCP = function (args) {

        //     var SetHostnameFromDHCPResponse = {
        //         RebootNeeded: false
        //     };
        //     return SetHostnameFromDHCPResponse;
        // };
        port.GetScopes = function (args) {
            var config_tmp = JSON.parse(fs.readFileSync('rposConfig.json', 'utf-8'));
            var GetScopesResponse = { Scopes: [] };
            GetScopesResponse.Scopes.push({
                ScopeDef: "Configurable",
                ScopeItem: ("onvif://www.onvif.org/location/" + config_tmp.DeviceInformation.Location)
            });
            GetScopesResponse.Scopes.push({
                ScopeDef: "Fixed",
                ScopeItem: ("onvif://www.onvif.org/hardware/" + config_tmp.DeviceInformation.Model)
            });
            GetScopesResponse.Scopes.push({
                ScopeDef: "Configurable",
                ScopeItem: ("onvif://www.onvif.org/name/" +config_tmp.DeviceInformation.Name)
            });
            return GetScopesResponse;
        };
        port.SetScopes = function(args /*, cb, headers*/) {
            console.log("1" + args);
            var scopes = args.Scopes
            console.log("2" + scopes);
            scopes.forEach(function (item, index, object) {
                if (item.startsWith('onvif://www.onvif.org/location/')){
                    var location = item;
                    console.log("3" + location);
                    updateJsonFile(configPath, (config) => {
                        config.DeviceInformation.Location = location;
                        return config;
                    });
                } else if (item.startsWith('onvif://www.onvif.org/name/')){
                    var name = item;
                    console.log("4" + name);
                    updateJsonFile(configPath, (config) => {
                        config.DeviceInformation.Name = name;
                        return config;
                    });
                }
            });
            var SetScopesResponse = { };
            return SetScopesResponse;
        }
        port.GetServiceCapabilities = function (args) {
            var GetServiceCapabilitiesResponse = {
                Capabilities: {
                    Network: {
                        attributes: {
                            IPFilter: false,
                            ZeroConfiguration: false,
                            IPVersion6: false,
                            DynDNS: false,
                            Dot11Configuration: false,
                            Dot1XConfigurations: 0,
                            HostnameFromDHCP: false,
                            NTP: 0,
                            DHCPv6: false
                        }
                    },
                    Security: {
                        attributes: {
                            "TLS1.0": false,
                            "TLS1.1": false,
                            "TLS1.2": false,
                            OnboardKeyGeneration: false,
                            AccessPolicyConfig: false,
                            DefaultAccessPolicy: false,
                            Dot1X: false,
                            RemoteUserHandling: false,
                            "X.509Token": false,
                            SAMLToken: false,
                            KerberosToken: false,
                            UsernameToken: false,
                            HttpDigest: false,
                            RELToken: false,
                            SupportedEAPMethods: 0,
                            MaxUsers: 1,
                            MaxUserNameLength: 10,
                            MaxPasswordLength: 256
                        }
                    },
                    System: {
                        attributes: {
                            DiscoveryResolve: false,
                            DiscoveryBye: false,
                            RemoteDiscovery: false,
                            SystemBackup: false,
                            SystemLogging: false,
                            FirmwareUpgrade: false,
                            HttpFirmwareUpgrade: false,
                            HttpSystemBackup: false,
                            HttpSystemLogging: false,
                            HttpSupportInformation: false,
                            StorageConfiguration: false
                        }
                    },
                }
            };
            return GetServiceCapabilitiesResponse;
        };
        port.GetNTP = function (args) {
            var GetNTPResponse = {};
            return GetNTPResponse;
        };
        port.SetNTP = function (args) {
            var SetNTPResponse = {};
            return SetNTPResponse;
        };
        port.GetNetworkInterfaces = function (args) {
            var GetNetworkInterfacesResponse = {
                NetworkInterfaces: []
            };
            var dhcp;
            if(config.dhcp === true){
                dhcp = true;
            }
            else{
                dhcp = false;
            }
            var nwifs = os.networkInterfaces();
            for (var nwif in nwifs) {
                for (var addr in nwifs[nwif]) {
                    if (nwifs[nwif][addr].family === 'IPv4' && nwif !== 'lo0' && nwif !== 'lo') {
                        var mac = (nwifs[nwif][addr].mac).replace(/:/g, '-');
                        var ipv4_addr = nwifs[nwif][addr].address;
                        var netmask = nwifs[nwif][addr].netmask;
                        var prefix_len = ip.subnet(ipv4_addr, netmask).subnetMaskLength;
                        GetNetworkInterfacesResponse.NetworkInterfaces.push({
                            attributes: {
                                token: nwif
                            },
                            Enabled: true,
                            Info: {
                                Name: nwif,
                                HwAddress: mac,
                                MTU: 1500
                            },
                            IPv4: {
                                Enabled: true,
                                Config: {
                                    Manual: {
                                        Address: ipv4_addr,
                                        PrefixLength: prefix_len
                                    },
                                    DHCP: dhcp
                                }
                            }
                        });
                    }
                }
            }
            return GetNetworkInterfacesResponse;
        };
        port.SetNetworkInterfaces = function(args) {
            // console.log(args);
            // console.log(args.NetworkInterface.IPv4.Manual[0].Address);
            // console.log(args.NetworkInterface.IPv4.Manual[0].PrefixLength);
            // console.log(args.NetworkInterface.IPv4.DHCP);
            
            if(args.NetworkInterface.IPv4.DHCP === true){
                var staticIpAddress = "";
                var staticSubnetMask = "";
                var setNetwork = `# A sample configuration for dhcpcd.
# See dhcpcd.conf(5) for details.

# Allow users of this group to interact with dhcpcd via the control socket.
#controlgroup wheel

# Inform the DHCP server of our hostname for DDNS.
hostname

# Use the hardware address of the interface for the Client ID.
clientid
# or
# Use the same DUID + IAID as set in DHCPv6 for DHCPv4 ClientID as per RFC4361.
# Some non-RFC compliant DHCP servers do not reply with this set.
# In this case, comment out duid and enable clientid above.
#duid

# Persist interface configuration when dhcpcd exits.
persistent

# Rapid commit support.
# Safe to enable by default because it requires the equivalent option set
# on the server to actually work.
option rapid_commit

# A list of options to request from the DHCP server.
option domain_name_servers, domain_name, domain_search, host_name
option classless_static_routes
# Respect the network MTU. This is applied to DHCP routes.
option interface_mtu

# Most distributions have NTP support.
#option ntp_servers

# A ServerID is required by RFC2131.
require dhcp_server_identifier

# Generate SLAAC address using the Hardware Address of the interface
#slaac hwaddr
# OR generate Stable Private IPv6 Addresses based from the DUID
slaac private

# Example static IP configuration:
#interface eth0
#static ip_address=192.168.0.10/24
#static ip6_address=fd51:42f8:caae:d92e::ff/64
#static routers=192.168.0.1
#static domain_name_servers=192.168.0.1 8.8.8.8 fd51:42f8:caae:d92e::1

# It is possible to fall back to a static IP if DHCP fails:
# define static profile
#profile static_eth0
#static ip_address=192.168.1.23/24
#static routers=192.168.1.1
#static domain_name_servers=192.168.1.1

# fallback to static profile on eth0
#interface eth0
#fallback static_eth0`;
            }
            else{
                var staticIpAddress = args.NetworkInterface.IPv4.Manual[0].Address;
                var staticSubnetMask = getSubnetMaskString(args.NetworkInterface.IPv4.Manual[0].PrefixLength);
                var setNetwork = `# A sample configuration for dhcpcd.
# See dhcpcd.conf(5) for details.

# Allow users of this group to interact with dhcpcd via the control socket.
#controlgroup wheel

# Inform the DHCP server of our hostname for DDNS.
hostname

# Use the hardware address of the interface for the Client ID.
clientid
# or
# Use the same DUID + IAID as set in DHCPv6 for DHCPv4 ClientID as per RFC4361.
# Some non-RFC compliant DHCP servers do not reply with this set.
# In this case, comment out duid and enable clientid above.
#duid

# Persist interface configuration when dhcpcd exits.
persistent

# Rapid commit support.
# Safe to enable by default because it requires the equivalent option set
# on the server to actually work.
option rapid_commit

# A list of options to request from the DHCP server.
option domain_name_servers, domain_name, domain_search, host_name
option classless_static_routes
# Respect the network MTU. This is applied to DHCP routes.
option interface_mtu

# Most distributions have NTP support.
#option ntp_servers

# A ServerID is required by RFC2131.
require dhcp_server_identifier

# Generate SLAAC address using the Hardware Address of the interface
#slaac hwaddr
# OR generate Stable Private IPv6 Addresses based from the DUID
slaac private

# Example static IP configuration:
interface eth0
static ip_address=${config.staticIpAddress}
#static ip6_address=fd51:42f8:caae:d92e::ff/64
static routers=${config.staticDefaultGateway}
static domain_name_servers=${config.staticDnsServer} ${config.staticSubDnsServer}
static netmask=${config.staticSubnetMask}

# It is possible to fall back to a static IP if DHCP fails:
# define static profile
#profile static_eth0
#static ip_address=192.168.1.23/24
#static routers=192.168.1.1
#static domain_name_servers=192.168.1.1

# fallback to static profile on eth0
#interface eth0
#fallback static_eth0`;
            }
            updateJsonFile(configPath, (config) => {
                config.dhcp = args.NetworkInterface.IPv4.DHCP;
                config.staticIpAddress = staticIpAddress;
                config.staticSubnetMask = staticSubnetMask;
                return config;
            });
            fs.writeFile('../../../etc/dhcpcd.conf', setNetwork, function (err) {
                if (err) throw err;
                console.log('success');
                // utils.execSync("sudo reboot")
            });
            
            var SetNetworkInterfacesResponse = { 
              RebootNeeded : true
            };
            return SetNetworkInterfacesResponse;
        };
        port.GetNetworkProtocols = function (args) {
            var GetNetworkProtocolsResponse = { NetworkProtocols: [ ] };
            if(_this.config.httpEnabled === true){
                GetNetworkProtocolsResponse.NetworkProtocols.push({
                    Name: "HTTP",
                    Enabled: true,
                    Port: _this.config.ServicePort
                });
            }
            if(_this.config.httpsEnabled === true){
                GetNetworkProtocolsResponse.NetworkProtocols.push({
                    Name: "HTTPS",
                    Enabled: true,
                    Port: _this.config.httpsPort
                });
            }
            if(_this.config.rtspEnabled === true){
                GetNetworkProtocolsResponse.NetworkProtocols.push({
                    Name: "RTSP",
                    Enabled: true,
                    Port: _this.config.RTSPPort
                });
            }
            return GetNetworkProtocolsResponse;
        };
        port.SetNetworkProtocols = function(args) {
            var SetNetworkProtocolsResponse = { };
            var httpPort = '';
            var httpsPort = '';
            var rtspPort = '';
            // console.log(args);
            // console.log(args.NetworkProtocols[0].Enabled);
            
            // console.log(args.NetworkProtocols[0].Port[0]);
            
            // console.log(args.NetworkProtocols[2]);
            if(args.NetworkProtocols[0].Enabled === true){
                httpPort = args.NetworkProtocols[0].Port[0];
            }
            if(args.NetworkProtocols[1].Enabled === true){
                httpsPort = args.NetworkProtocols[1].Port[0];
            }
            if(args.NetworkProtocols[2].Enabled === true){
                rtspPort = args.NetworkProtocols[2].Port[0];
            }
            updateJsonFile(configPath, (config) => {
                config.httpEnabled = args.NetworkProtocols[0].Enabled;
                config.httpsEnabled = args.NetworkProtocols[1].Enabled;
                config.rtspEnabled = args.NetworkProtocols[2].Enabled;
                config.ServicePort = httpPort;
                config.httpsPort = httpsPort;
                config.RTSPPort = rtspPort;
                return config;
            });
            return SetNetworkProtocolsResponse;
        };
        port.GetRelayOutputs = function (args) {
            var GetRelayOutputsResponse = {
                RelayOutputs: [{
                        attributes: {
                            token: "relay1"
                        },
                        Properties: {
                            Mode: "Bistable",
                            IdleState: "open"
                        }
                    }]
            };
            return GetRelayOutputsResponse;
        };
        port.SetRelayOutputState = function (args) {
            var SetRelayOutputStateResponse = {};
            if (_this.callback) {
                if (args.LogicalState === 'active')
                    _this.callback('relayactive', { name: args.RelayOutputToken });
                if (args.LogicalState === 'inactive')
                    _this.callback('relayinactive', { name: args.RelayOutputToken });
            }
            return SetRelayOutputStateResponse;
        };
        
        port.GetUsers = function (args) {
            var GetUsersResponse = {User: []};
            var users_tmp = JSON.parse(fs.readFileSync('userInfos.json', 'utf-8'));
            
            // console.log(users);
            var users = users_tmp.userInfos;
            // console.log(users);
            // var users = fs.readFileSync('userInfos.json', 'utf-8');
            users.forEach(function (item) {
                GetUsersResponse.User.push({
                    Username : item.Username,
                    UserLevel : item.UserLevel
                });
            });
            return GetUsersResponse;
        };
        port.CreateUsers = function(args) {
            // var faultUsernameAlreadyExists = true;
            // userInfos.forEach(function (item, index, object) {
            //     if (item.Username === args.Username[0]){
            //         object.splice(index,1);
            //         faultUsernameMissing = false;
            //     }
            // });
            // if (faultUsernameAlreadyExists==true){
            //     throw UsernameAlreadyExists

            // }
            var users_tmp = JSON.parse(fs.readFileSync('userInfos.json', 'utf-8'));

            var users = users_tmp.userInfos;
            users.push({
                'Username': args.User[0].Username,
                'Password': args.User[0].Password,
                'UserLevel': args.User[0].UserLevel
            })
            var jsonData = JSON.stringify({userInfos: users});
            fs.writeFile("userInfos.json", jsonData, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            // console.log(userInfos);
            var CreateUsersResponse = { };
            return CreateUsersResponse;
        };
        port.DeleteUsers = function(args) {
            // var argsUsername = 'test2';
            // console.log(args);
            // console.log(args.Username);
            // console.log(args.Username[0]);
            // var faultFixedUser = true;
            var users_tmp = JSON.parse(fs.readFileSync('userInfos.json', 'utf-8'));

            var users = users_tmp.userInfos;
            users.forEach(function (item, index, object) {
                if (item.Username === args.Username[0]){
                    if(index === 0){
                        throw FixedUser
                    }else{
                        object.splice(index,1);
                    }
                }
            });
            var jsonData = JSON.stringify({userInfos: users});
            fs.writeFile("userInfos.json", jsonData, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            var DeleteUsersResponse = { };
            return DeleteUsersResponse;
        };
        port.SetUser = function(args) {
            var users_tmp = JSON.parse(fs.readFileSync('userInfos.json', 'utf-8'));
            var users = users_tmp.userInfos;
            users.forEach(function (item, index, object) {
                if (item.Username === args.User[0].Username){
                    object[index] = {
                        'Username': args.User[0].Username,
                        'Password': args.User[0].Password,
                        'UserLevel': args.User[0].UserLevel
                    }
                }
            })
            var jsonData = JSON.stringify({userInfos: users});
            fs.writeFile("userInfos.json", jsonData, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            var SetUserResponse = { };
            return SetUserResponse;
        };
        port.GetWsdlUrl = function(args /*, cb, headers*/) {
            // throw NOT_IMPLEMENTED;
            var GetWsdlUrlResponse = { 
              WsdlUrl : "http://www.onvif.org/ver10/device/wsdl"
            };
            return GetWsdlUrlResponse;
        };
        port.GetDNS = function(args) {
            var dnsServer = dns.getServers();
            var config_tmp = JSON.parse(fs.readFileSync('rposConfig.json', 'utf-8'));
            var dnsfromdhcp = config_tmp.dnsfromdhcp;
            if(config.dnsfromdhcp === true){
                dnsfromdhcp = true;
            }
            else{
                dnsfromdhcp = false;
            }
            if(dnsfromdhcp === true){
                var GetDNSResponse = { 
                    DNSInformation : { 
                      FromDHCP : true,
                      DNSFromDHCP : [{ 
                        Type : "IPv4",
                        IPv4Address : dnsServer,
                      }],
                      Extension : { }
                    }
                  
                };
            }
            else if(dnsfromdhcp === false){
                var GetDNSResponse = { 
                    DNSInformation : { 
                      FromDHCP : false,
                      DNSManual : [{ 
                        Type : "IPv4",
                        IPv4Address : config.staticDnsServer
                      }],
                      Extension : { }
                    }
                  
                };
            } 
            return GetDNSResponse;
          };
          port.SetDNS = function(args) {
            //   console.log(args.FromDHCP);
            //   console.log(args.DNSManual[0].IPv4Address);
            var DNSManual = args.DNSManual;
            var SetDNSResponse = { };
            var dnssetting = '';
            var dnsaddress = '';
            var dnsserver = dns.getServers();

            if(args.FromDHCP === true){
                dnsaddress = '';
                dnssetting = `# Generated by resolvconf
nameserver ${dnsserver[0]}`
            }
            else if(args.FromDHCP === false){
                dnsaddress = DNSManual[0].IPv4Address;
                dnssetting = `# Generated by resolvconf
nameserver ${DNSManual[0].IPv4Address}`;
            }
            updateJsonFile(configPath, (config) => {
                config.dnsfromdhcp = args.FromDHCP;
                config.staticDnsServer = dnsaddress
                return config;
            });
            fs.writeFile('../../../etc/resolv.conf', dnssetting, function (err) {
                if (err) throw err;
                console.log('success');
                // utils.execSync("sudo ../../../etc/init.d/networking restart")
            });
            return SetDNSResponse;
          },
          port.GetNetworkDefaultGateway = function(args) {
            var dg = defaultGateway.v4.sync()
            var GetNetworkDefaultGatewayResponse = { 
                NetworkGateway : { 
                    IPv4Address : dg.gateway
                }
            };
            return GetNetworkDefaultGatewayResponse;
          };
          port.SetNetworkDefaultGateway = function(args) {
            updateJsonFile(configPath, (config) => {
                config.staticDefaultGateway = args.IPv4Address;
                return config;
            });
            if(config.dhcp === true){
                var setNetwork = `# A sample configuration for dhcpcd.
# See dhcpcd.conf(5) for details.

# Allow users of this group to interact with dhcpcd via the control socket.
#controlgroup wheel

# Inform the DHCP server of our hostname for DDNS.
hostname

# Use the hardware address of the interface for the Client ID.
clientid
# or
# Use the same DUID + IAID as set in DHCPv6 for DHCPv4 ClientID as per RFC4361.
# Some non-RFC compliant DHCP servers do not reply with this set.
# In this case, comment out duid and enable clientid above.
#duid

# Persist interface configuration when dhcpcd exits.
persistent

# Rapid commit support.
# Safe to enable by default because it requires the equivalent option set
# on the server to actually work.
option rapid_commit

# A list of options to request from the DHCP server.
option domain_name_servers, domain_name, domain_search, host_name
option classless_static_routes
# Respect the network MTU. This is applied to DHCP routes.
option interface_mtu

# Most distributions have NTP support.
#option ntp_servers

# A ServerID is required by RFC2131.
require dhcp_server_identifier

# Generate SLAAC address using the Hardware Address of the interface
#slaac hwaddr
# OR generate Stable Private IPv6 Addresses based from the DUID
slaac private

# Example static IP configuration:
#interface eth0
#static ip_address=192.168.0.10/24
#static ip6_address=fd51:42f8:caae:d92e::ff/64
#static routers=192.168.0.1
#static domain_name_servers=192.168.0.1 8.8.8.8 fd51:42f8:caae:d92e::1

# It is possible to fall back to a static IP if DHCP fails:
# define static profile
#profile static_eth0
#static ip_address=192.168.1.23/24
#static routers=192.168.1.1
#static domain_name_servers=192.168.1.1

# fallback to static profile on eth0
#interface eth0
#fallback static_eth0`;
            }
            else{
                var setNetwork = `# A sample configuration for dhcpcd.
# See dhcpcd.conf(5) for details.

# Allow users of this group to interact with dhcpcd via the control socket.
#controlgroup wheel

# Inform the DHCP server of our hostname for DDNS.
hostname

# Use the hardware address of the interface for the Client ID.
clientid
# or
# Use the same DUID + IAID as set in DHCPv6 for DHCPv4 ClientID as per RFC4361.
# Some non-RFC compliant DHCP servers do not reply with this set.
# In this case, comment out duid and enable clientid above.
#duid

# Persist interface configuration when dhcpcd exits.
persistent

# Rapid commit support.
# Safe to enable by default because it requires the equivalent option set
# on the server to actually work.
option rapid_commit

# A list of options to request from the DHCP server.
option domain_name_servers, domain_name, domain_search, host_name
option classless_static_routes
# Respect the network MTU. This is applied to DHCP routes.
option interface_mtu

# Most distributions have NTP support.
#option ntp_servers

# A ServerID is required by RFC2131.
require dhcp_server_identifier

# Generate SLAAC address using the Hardware Address of the interface
#slaac hwaddr
# OR generate Stable Private IPv6 Addresses based from the DUID
slaac private

# Example static IP configuration:
interface eth0
static ip_address=${config.staticIpAddress}
#static ip6_address=fd51:42f8:caae:d92e::ff/64
static routers=${config.staticDefaultGateway}
static domain_name_servers=${config.staticDnsServer} ${config.staticSubDnsServer}
static netmask=${config.staticSubnetMask}

# It is possible to fall back to a static IP if DHCP fails:
# define static profile
#profile static_eth0
#static ip_address=192.168.1.23/24
#static routers=192.168.1.1
#static domain_name_servers=192.168.1.1

# fallback to static profile on eth0
#interface eth0
#fallback static_eth0`;
            }
            fs.writeFile('../../../etc/dhcpcd.conf', setNetwork, function (err) {
                if (err) throw err;
                console.log('success');
                // utils.execSync("sudo reboot")
            });
            utils.execSync("sudo shutdown -r -t 1")
            var SetNetworkDefaultGatewayResponse = { };
            return SetNetworkDefaultGatewayResponse;
          };
          port.GetDiscoveryMode = function(args) {
            var GetDiscoveryModeResponse = { 
              DiscoveryMode : config.DiscoveryMode
            
            };
            return GetDiscoveryModeResponse;
          };
    };
    return DeviceService;
}(SoapService));
module.exports = DeviceService;

//# sourceMappingURL=device_service.js.map
