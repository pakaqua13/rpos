"use strict";
var utils_1 = require('./utils');
var fs = require('fs');
var path = require('path');
var parser = require('body-parser');
var Sntp = require('@hapi/sntp');
var template = require('../lib/template.js');
var auth = require('../lib/auth.js');
var nodemailer = require('nodemailer');
var NoIP = require('no-ip')
var v4l2ctl_1 = require('./v4l2ctl');
var utils = utils_1.Utils.utils;
var updateJsonFile = require('update-json-file');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var Client = require('ftp');
var config = require('../rposConfig.json');
var configPath = './rposConfig.json';
var cp = require('child_process');
var logger = require("../lib/winston.js");
var requestIp = require('request-ip');
var SerialPort = require('serialport');
var ByteLength = require('@serialport/parser-byte-length');
var command = require('../lib/command.js');

var process = require('process');
var shm = require("shm-typed-array");

var Camera = (function () {
    function Camera(config, webserver, io) {
        var _this = this;
        this.options = {
            resolutions: [{
                    Width: 640,
                    Height: 480
                },
                {
                    Width: 800,
                    Height: 600
                },
                {
                    Width: 1024,
                    Height: 768
                },
                {
                    Width: 1280,
                    Height: 1024
                },
                {
                    Width: 1280,
                    Height: 720
                },
                {
                    Width: 1640,
                    Height: 1232
                },
                {
                    Width: 1920,
                    Height: 1080
                }
            ],
            framerates: [2, 5, 10, 15, 25, 30],
            bitrates: [
                250,
                500,
                1000,
                2500,
                5000,
                7500,
                10000,
                12500,
                15000,
                17500
            ]
        };
        this.settings = {
            forceGop: true,
            resolution: {
                Width: 1920,
                Height: 1080
            },
            framerate: 30,
        };
        this.config = config;
        this.rtspServer = null;
        this.rtspServer2 = null;
        // if (this.config.RTSPServer != 0) {
        //     if (this.config.CameraType == 'usbcam') {
        //         if (this.config.RTSPServer != 3) {
        //             console.log('Only GStreamer RTSP is supported now');
        //             process.exit(1);
        //         }
        //         if (!fs.existsSync(this.config.CameraDevice)) {
        //             console.log("USB Camera is not found at " + this.config.CameraDevice);
        //             process.exit(1);
        //         }
        //     } else {
        //         // if (!fs.existsSync("/dev/video0")) {
        //         //     if (utils.isPi()) {
        //         //         console.log('Use modprobe to load the Pi Camera V4L2 driver');
        //         //         console.log('e.g.   sudo modprobe bcm2835-v4l2');
        //         //         console.log('       or the uv4l driver');
        //         //         process.exit(1);
        //         //     }
        //         // }
        //     }
        // }
        this.webserver = webserver;
        this.io = io;
        this.setupWebserverStart();
        this.setupCamera();
        this.setupWebserver();
        v4l2ctl_1.v4l2ctl.ReadControls();
        utils.cleanup(function () {
            _this.stopRtsp();

            var stop = new Date().getTime() + 2000;
            while (new Date().getTime() < stop) {
                ;
            }
        });
        if (this.config.RTSPServer == 1)
            fs.chmodSync("./bin/rtspServer", "0755");
    }
    Camera.prototype.setupWebserver = function () {


        this.webserver.use(parser.urlencoded({
            extended: false
        }));

        this.webserver.get('*', function (req, res, next) {
            fs.readdir('./data', function (error, filelist) {
                req.list = filelist;
                next();
            })
        })


        this.webserver.use(session({
            secret: 'asdasd2sd!@#!@a',
            resave: false,
            savaUninitialized: true,
            store: new FileStore()
        }))

        this.webserver.get('/', (req, res) => {
            // fs.readdir('./data', function (error, filelist) {
            //     var title = 'Welcome';
            //     var description = 'Hello, I3SYSTEM';
            //     var list = template.list(filelist);
            //     var html = template.HTML(title, list,
            //         `<h2>${title}</h2>${description}`,
            //         auth.statusUI(req, res)
            //     );
            //     res.send(html);
            // });
            logger.info('GET / ' + requestIp.getClientIp(req));

            var title = 'Welcome';
            var description = 'Hello, i3system';
            var list = template.list(req.list);
            var html = template.HTML(title, list,
                `<h2>${title}</h2>${description}`,
                auth.statusUI(req, res)
            );
            res.send(html);

        });
        // socketio
        // this.io.on('connection', (socket) => {
        //     console.log('a user connected');
        //     var turjson = JSON.parse(fs.readFileSync('rposConfig.json', 'utf-8'));
        //     var tur = turjson.tur;
        //     socket.on('disconnect', () => {
        //         // socket.interval = null;
        //         clearInterval(socket.interval)
        //         console.log('user disconnected');
        //     });

        //     socket.interval = setInterval(() => {
        //         // 3초마다 클라이언트로 메시지 전송
                
        //         if (socket.readyState === socket.OPEN) {
        //             // fs.readFile('sample_image.png', function(err, data) {
        //             //     if (err) console.log(err); // Fail if the file can't be read.
        //             //         // tempData = data;
        //             //         // socket.emit('message', "data:image/png;base64,"+ data.toString("base64"));
        //             //         socket.emit('message', { image: true, buffer: data });
        //             //         console.log(data.length);
        //             //         // console.log(data);
        //             // })
        //             var image = shm.get(654321, shm.SHMBT_BUFFER);
        //             socket.emit('message', { image: true, buffer: image });
        //             // console.log(image);
        //         }
        //     }, 1000/tur);
        // });

        this.webserver.get('/page/:pageId', (req, res) => {
            if (!auth.isOwner(req, res)) {
                res.redirect('/');
                return false;
            }
            var filteredId = path.parse(req.params.pageId).base;
            fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
                var title = req.params.pageId;
                var list = template.list(req.list);

                var html = template.HTML(title, list,
                    `<h2>${title}</h2>${description}`,
                    auth.statusUI(req, res)
                );
                res.send(html);
            });
        });

        this.webserver.get('/auth/login', function (req, res) {
            var title = 'WEB - login';
            var list = template.list(req.list);
            var html = template.HTML(title, list, `
            <form action="/auth/login_process" method="post">
            <p><input type="text" name="ID" placeholder="ID" /></p>
            <p><input type="password" name="Password" placeholder="Password" /></p>
            <p>
                <input type="submit" value="login" />
            </p>
            </form>
        `, '');
            res.send(html);
        });

        this.webserver.post('/auth/login_process', function (req, res) {
            var post = req.body;
            var ID = post.ID;
            var Password = post.Password;

            var users_tmp = JSON.parse(fs.readFileSync('userInfos.json', 'utf-8'));

            // console.log(users);
            var users = users_tmp.userInfos;

            if (users[0].Username === ID && users[0].Password === Password) {
                req.session.is_logined = true;
                req.session.nickname = users[0].Username;
                req.session.save(function () {
                    res.redirect('/');
                });

            } else {
                res.send('Who?');
            }
        })

        this.webserver.get('/auth/logout', function (req, res) {
            req.session.destroy(function (err) {
                res.redirect('/');
            });
        });
        

        this.webserver.post('/ntp', (req, res) => {
            var title = 'NTP';
            var post = req.body;
            console.log(post);
            var timeMode = post.timeMode;
            var ntpServer = '';
            var address = ``;
            var port = ``;
            var manual = '';
            var description = `
            <script>
                function chooseForm(radioName) {
                    var radios = document.getElementsByName(radioName);
                    for (var i = 0, length = radios.length; i < length; i++) {
                        document.getElementById('form_' + radios[i].value).style.display = 'none';
                        if (radios[i].checked) {
                        document.getElementById('form_' + radios[i].value).style.display = 'block';
                        }
                    }
                }
            </script>
            `;

            var ntpAddress = `
#  This file is part of systemd.
#
#  systemd is free software; you can redistribute it and/or modify it
#  under the terms of the GNU Lesser General Public License as published by
#  the Free Software Foundation; either version 2.1 of the License, or
#  (at your option) any later version.
#
# Entries in this file show the compile time defaults.
# You can change settings by editing this file.
# Defaults can be restored by simply deleting this file.
#
# See timesyncd.conf(5) for details.

[Time]
#NTP=
FallbackNTP=0.${post.address} 1.debian.pool.ntp.org 2.debian.pool.ntp.org 3.debian.pool.ntp.org
#RootDistanceMaxSec=5
#PollIntervalMinSec=32
#PollIntervalMaxSec=2048
`
            fs.writeFile('../../../etc/systemd/timesyncd.conf', ntpAddress, function (err) {
                
                if (err) throw err;
                // utils.execSync("sudo reboot")
            });
            if (timeMode === 'NTP') {
                address = post.address;
                port = post.port;
                ntpOptions.host = address;
                ntpOptions.port = port;

                // exec();
                description = description + `
                <label><input type="radio" name="ntp" value="1" checked onclick="chooseForm(this.name)" />SNTP</label>
                <label><input type="radio" name="ntp" value="2" onclick="chooseForm(this.name)" />Manual</label>
                <div id="form_1">
                    <form action="/ntp" method="post">
                        <p>
                        <input type="hidden" name="timeMode" value="NTP" />
                        </p>
                        <p>
                        NTP Server: <select name="ntpServer">
                        <option value="hostname">hostname</option>
                        <option value="ip">ip</option>
                        </select>
                        </p>
                        <p>
                            Address: <input type="text" name="address" value="${address}" /> (default: debian.pool.ntp.org)
                        </p>
                        <p>
                            Port: <input type="text" name="port" value="${port}" /> (default: 123)
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                <div id="form_2" style="display: none">
                    <form action="/ntp" method="post">
                        <p>
                        <input type="hidden" name="timeMode" value="Manual" />
                        </p>
                        <p>
                        Manual: <input type="text" name="manual" value="${manual}" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>
            `
            } else {
                manual = post.manual;
                description = description + `
                <label><input type="radio" name="ntp" value="1" onclick="chooseForm(this.name)" />SNTP</label>
                <label><input type="radio" name="ntp" value="2" checked onclick="chooseForm(this.name)" />Manual</label>
                <div id="form_1" style="display: none">
                    <form action="/ntp" method="post">
                        <p>
                        <input type="hidden" name="timeMode" value="NTP" />
                        </p>
                        <p>
                        NTP Server: <select name="ntpServer">
                        <option value="hostname">hostname</option>
                        <option value="ip">ip</option>
                        </select>
                        </p>
                        <p>
                            Address: <input type="text" name="address" value="${address}" /> (default: debian.pool.ntp.org)
                        </p>
                        <p>
                            Port: <input type="text" name="port" value="${port}" /> (default: 123)
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                <div id="form_2">
                    <form action="/ntp" method="post">
                        <p>
                        <input type="hidden" name="timeMode" value="Manual" />
                        </p>
                        <p>
                        Manual: <input type="text" name="manual" value="${manual}" /> 
                        </p>
                        <input type="submit" />
                    </form>
                </div>
            `
            }
            

            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);
            })
        })

        this.webserver.post('/ipsetting', (req, res) => {
            var title = 'IP_Setting';
            var post = req.body;
            var ip = post.ip
            console.log(post);

            // dynamic IP

            // static IP
            var staticIpAddress = ``;
            var staticSubnetMask = ``;
            var staticDefaultGateway = ``;
            var staticDnsServer = ``;
            var staticSubDnsServer = ``;

            // PPPoE
            var pppoeID = ``;
            var pppoePassword = ``;

            var description = `
            <script>
                function chooseForm(radioName) {
                var radios = document.getElementsByName(radioName);
                for (var i = 0, length = radios.length; i < length; i++) {
                    document.getElementById('form_' + radios[i].value).style.display = 'none';
                    if (radios[i].checked) {
                    document.getElementById('form_' + radios[i].value).style.display = 'block';
                    }
                }
                }
            </script>`

            if (post.ip === 'dynamicIP') {
                updateJsonFile(configPath, (config) => {
                    config.dhcp = true;
                    return config;
                });
            } else if (post.ip === 'staticIP') {
                updateJsonFile(configPath, (config) => {
                    config.dhcp = false;
                    return config;
                });
            }

            if (post.ip === 'dynamicIP') {
                description = description + `
                <label><input type="radio" name="ipAllocation" value="1" checked onclick="chooseForm(this.name)" />동적 IP 방식</label>
                <label><input type="radio" name="ipAllocation" value="2" onclick="chooseForm(this.name)" />고정 IP 사용자</label>
                <label><input type="radio" name="ipAllocation" value="3" onclick="chooseForm(this.name)" />
                PPPoE 방식</label>
                <br />
            <div id="form_1">
                <form action="/ipsetting" method="post" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
                    <p>
                        <input type="hidden" name="ip" value="dynamicIP" />
                    </p>
                    <p>
                        IP 주소 : <input type="text" name="ipAddress" disabled />
                    </p>
                    <p>
                        서브넷 마스크 : <input type="text" name="subnetMask" disabled />
                    </p>
                    <p>
                        기본 게이트웨이 : <input type="text" name="defaultGateway" disabled />
                    </p>
                    <p>
                        기본 DNS 서버 : <input type="text" name="dnsServer" disabled />
                    </p>
                    <p>
                        보조 DNS 서버 : <input type="text" name="subDnsServer" disabled />
                    </p>
                    <input type="submit" />
                </form>
                </div>
                <div id="form_2" style="display: none">
                    <form action="/ipsetting" method="post" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
                        <p>
                            <input type="hidden" name="ip" value="staticIP" />
                        </p>
                        <p>
                            IP 주소 : <input type="text" name="ipAddress" />
                        </p>
                        <p>
                            서브넷 마스크 : <input type="text" name="subnetMask" />
                        </p>
                        <p>
                            기본 게이트웨이 : <input type="text" name="defaultGateway" />
                        </p>
                        <p>
                            기본 DNS 서버 : <input type="text" name="dnsServer" />
                        </p>
                        <p>
                            보조 DNS 서버 : <input type="text" name="subDnsServer" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                <div id="form_3" style="display: none">
                    <form action="/ipsetting" method="post" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
                        <p>
                            <input type="hidden" name="ip" value="PPPoE" />
                        </p>
                        <p>
                            ID : <input type="text" name="id" />
                        </p>
                        <p>
                            Password : <input type="password" name="password" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>`;
                var dIP = `# A sample configuration for dhcpcd.
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
                fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                    res.redirect(`/page/${title}`);
                })
                fs.writeFile('../../../etc/dhcpcd.conf', dIP, function (err) {
                    updateJsonFile(configPath, (config) => {
                        config.dhcp = true;
                        config.staticIpAddress = '';
                        config.staticSubnetMask = '';
                        config.staticDefaultGateway = '';
                        config.staticDnsServer = '';
                        config.staticSubDnsServer = '';
                        config.staticDnsServer = '';
                        return config;
                    });
                    if (err) throw err;
                    console.log('success');
                    // utils.execSync("sudo reboot")
                });

            } else if (post.ip === 'staticIP') {
                staticIpAddress = post.ipAddress;
                staticSubnetMask = post.subnetMask;
                staticDefaultGateway = post.defaultGateway;
                staticDnsServer = post.dnsServer;
                staticSubDnsServer = post.subDnsServer;

                description = description + `
                <label><input type="radio" name="ipAllocation" value="1" onclick="chooseForm(this.name)" />동적 IP 방식</label>
                <label><input type="radio" name="ipAllocation" value="2" checked onclick="chooseForm(this.name)" />고정 IP 사용자</label>
                <label><input type="radio" name="ipAllocation" value="3" onclick="chooseForm(this.name)" />
                PPPoE 방식</label>
                <br />
                <div id="form_1" style="display: none">
                    <form action="/ipsetting" method="post" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
                        <p>
                            <input type="hidden" name="ip" value="dynamicIP" />
                        </p>
                        <p>
                            IP 주소 : <input type="text" name="ipAddress" disabled />
                        </p>
                        <p>
                            서브넷 마스크 : <input type="text" name="subnetMask" disabled />
                        </p>
                        <p>
                            기본 게이트웨이 : <input type="text" name="defaultGateway" disabled />
                        </p>
                        <p>
                            기본 DNS 서버 : <input type="text" name="dnsServer" disabled />
                        </p>
                        <p>
                            보조 DNS 서버 : <input type="text" name="subDnsServer" disabled />
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                <div id="form_2">
                    <form action="/ipsetting" method="post" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
                        <p>
                            <input type="hidden" name="ip" value="staticIP" />
                        </p>
                        <p>
                            IP 주소 : <input type="text" name="ipAddress" value="${staticIpAddress}" />
                        </p>
                        <p>
                            서브넷 마스크 : <input type="text" name="subnetMask" value="${staticSubnetMask}" />
                        </p>
                        <p>
                            기본 게이트웨이 : <input type="text" name="defaultGateway" value="${staticDefaultGateway}" />
                        </p>
                        <p>
                            기본 DNS 서버 : <input type="text" name="dnsServer" value="${staticDnsServer}" />
                        </p>
                        <p>
                            보조 DNS 서버 : <input type="text" name="subDnsServer" value="${staticSubDnsServer}" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                <div id="form_3" style="display: none" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
                    <form action="/ipsetting" method="post">
                        <p>
                            <input type="hidden" name="ip" value="PPPoE" />
                        </p>
                        <p>
                            ID : <input type="text" name="id" />
                        </p>
                        <p>
                            Password : <input type="password" name="password" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>`;
                var sIP = `# A sample configuration for dhcpcd.
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
static ip_address=${staticIpAddress}
#static ip6_address=fd51:42f8:caae:d92e::ff/64
static routers=${staticDefaultGateway}
static domain_name_servers=${staticDnsServer} ${staticSubDnsServer}
static netmask=${staticSubnetMask}

# It is possible to fall back to a static IP if DHCP fails:
# define static profile
#profile static_eth0
#static ip_address=192.168.1.23/24
#static routers=192.168.1.1
#static domain_name_servers=192.168.1.1

# fallback to static profile on eth0
#interface eth0
#fallback static_eth0`;
                fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                    res.redirect(`/page/${title}`);
                })

                fs.writeFile('../../../etc/dhcpcd.conf', sIP, function (err) {
                    updateJsonFile(configPath, (config) => {
                        config.dhcp = false;
                        config.staticIpAddress = staticIpAddress;
                        config.staticSubnetMask = staticSubnetMask;
                        config.staticDefaultGateway = staticDefaultGateway;
                        config.staticDnsServer = staticDnsServer;
                        config.staticSubDnsServer = staticSubDnsServer;
                        return config;
                    });
                    if (err) throw err;
                    console.log('success');
                    // utils.execSync("sudo reboot")
                });

            } else {
                pppoeID = `post.id`;
                pppoePassword = `post.password`;
                description = description + `
                <label><input type="radio" name="ipAllocation" value="1"  onclick="chooseForm(this.name)" />동적 IP 방식</label>
                <label><input type="radio" name="ipAllocation" value="2" onclick="chooseForm(this.name)" />고정 IP 사용자</label>
                <label><input type="radio" name="ipAllocation" value="3" checked onclick="chooseForm(this.name)" />
                PPPoE 방식</label><br />
                <div id="form_1" style="display: none">
                    <form action="/ipsetting" method="post" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
                        <p>
                            <input type="hidden" name="ip" value="dynamicIP" />
                        </p>
                        <p>
                            IP 주소 : <input type="text" name="ipAddress" disabled />
                        </p>
                        <p>
                            서브넷 마스크 : <input type="text" name="subnetMask" disabled />
                        </p>
                        <p>
                            기본 게이트웨이 : <input type="text" name="defaultGateway" disabled />
                        </p>
                        <p>
                            기본 DNS 서버 : <input type="text" name="dnsServer" disabled />
                        </p>
                        <p>
                            보조 DNS 서버 : <input type="text" name="subDnsServer" disabled />
                        </p>
                        <input type="submit" />
                    </form>
                    </div>
                    <div id="form_2" style="display: none">
                        <form action="/ipsetting" method="post" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
                            <p>
                                <input type="hidden" name="ip" value="staticIP" />
                            </p>
                            <p>
                                IP 주소 : <input type="text" name="ipAddress" />
                            </p>
                            <p>
                                서브넷 마스크 : <input type="text" name="subnetMask" />
                            </p>
                            <p>
                                기본 게이트웨이 : <input type="text" name="defaultGateway" />
                            </p>
                            <p>
                            기본 DNS 서버 : <input type="text" name="dnsServer" />
                            </p>
                            <p>
                                보조 DNS 서버 : <input type="text" name="subDnsServer" />
                            </p>
                            <input type="submit" />
                        </form>
                    </div>
                    <div id="form_3">
                        <form action="/ipsetting" method="post" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
                            <p>
                                <input type="hidden" name="ip" value="PPPoE" />
                            </p>
                            <p>
                                ID : <input type="text" name="id" />
                            </p>
                            <p>
                                Password : <input type="password" name="password" />
                            </p>
                            <input type="submit" />
                        </form>
                    </div>`;
                fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                    res.redirect(`/page/${title}`);
                })
            }

        })

        this.webserver.post('/port', (req, res) => {
            var title = 'Port';
            var post = req.body;
            var httpPort = post.httpPort;
            var httpsPort = post.httpsPort;
            var rtspPort = post.rtspPort;
            var eventPort = post.eventPort;
            var description = '';

            updateJsonFile(configPath, (config) => {
                config.ServicePort = httpPort;
                config.httpsPort = httpsPort;
                config.RTSPPort = rtspPort;
                config.eventPort = eventPort;
                return config;
            })


            description = `
            <form action="/port" method="post" onsubmit="return confirm('시스템을 재부팅하면 적용됩니다');">
            <p>
            HTTP Port : <input type="text" name="httpPort" value="${httpPort}" /> [80, 1025 ~ 65535]
            </p>
            <p>
            HTTPS Port : <input type="text" name="httpsPort" value="${httpsPort}" /> [443, 1025 ~ 65535]
            </p>
            <p>
            RTSP Port : <input type="text" name="rtspPort" value="${rtspPort}" /> [554, 1025 ~ 65535]
            </p>
            <p>
            Event Port : <input type="text" name="eventPort" value="${eventPort}" /> [1025 ~ 65535]
            </p>
            <input type="submit" />
            </script>
            </form>`;


            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);
            });
        })

        this.webserver.post('/ddns', (req, res) => {
            var title = 'DDNS';
            var post = req.body;
            var ddns = post.ddns;
            var hostName = ``;
            var userName = '';
            var password = '';
            var updatePeriod = '';
            console.log(post);
            // DDNS s
            var noip = new NoIP({
                hostname: post.hostName,
                user: post.userName,
                pass: post.password
            })
            noip.on('error', function (err) {
                console.log(err)
            })
            noip.on('success', function (isChanged, ip) {
                console.log(isChanged, ip)
            })
            noip.update()

            var description = `
            <script>
                function chooseForm(radioName) {
                    var radios = document.getElementsByName(radioName);
                    for (var i = 0, length = radios.length; i < length; i++) {
                        document.getElementById('form_' + radios[i].value).style.display = 'none';
                        if (radios[i].checked) {
                        document.getElementById('form_' + radios[i].value).style.display = 'block';
                        }
                    }
                }
            </script>`;
            if (ddns === 'on') {
                hostName = post.hostName;
                userName = post.userName;
                password = post.password;
                updatePeriod = post.updatePeriod;

                description = description + `
                <label><input type="radio" name="ddns" value="1" checked onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="ddns" value="2" onclick="chooseForm(this.name)" />off</label>
                <div id="form_1">
                <form action="/ddns" method="post">
                        <p>
                        <input type="hidden" name="ddns" value="on" />
                        </p>
                        <p>
                            DDNS Services: <select name="ddnsServices">
                            <option value="freedns.afraid.org">freedns.afraid.org</option>
                            <option selected value="no_ip.com">no_ip.com</option>
                            </select>
                        </p>
                        <p>
                            Host Name: <input type="text" name="hostName" value="${hostName}" />
                        </p>
                        <p>
                            User Name: <input type="text" name="userName" value="${userName}" />
                        </p>
                        <p>
                            Password: <input type="password" name="password" value="${password}" />
                        </p>
                        <p>
                            Update Period: <input type="text" name="updatePeriod" value="${updatePeriod}" /> default: 3600000 [ms] (1 hour)
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                <div id="form_2" style="display: none">
                    <form action="/ddns" method="post">
                        <p>
                        <input type="hidden" name="ddns" value="off" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>`

            } else {
                description = description + `
                <label><input type="radio" name="ddns" value="1" onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="ddns" value="2" checked onclick="chooseForm(this.name)" />off</label>
                <div id="form_1" style="display: none">
                <form action="/ddns" method="post">
                        <p>
                        <input type="hidden" name="ddns" value="on" />
                        </p>
                        <p>
                            DDNS Services: <select name="ddnsServices">
                            <option value="freedns.afraid.org">freedns.afraid.org</option>
                            <option selected value="no_ip.com">no_ip.com</option>
                            </select>
                        </p>
                        <p>
                            Host Name: <input type="text" name="hostName" value="${hostName}" />
                        </p>
                        <p>
                            User Name: <input type="text" name="userName" value="${userName}" />
                        </p>
                        <p>
                            Password: <input type="password" name="password" value="${password}" />
                        </p>
                        <p>
                            Update Period: <input type="text" name="updatePeriod" value="${updatePeriod}" /> default: 3600000 [ms] (1 hour)
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                <div id="form_2">
                    <form action="/ddns" method="post">
                        <p>
                        <input type="hidden" name="ddns" value="off" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>`;
            }

            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);

            })
        })

        this.webserver.post('/smtp', (req, res) => {
            var title = 'SMTP';
            var post = req.body;
            var smtp = post.smtp;
            var address = '';
            var port = '';
            var userName = '';
            var password = '';
            var from = '';
            var to = '';
            var emailTitle = '';
            var text = '';

            var description = `
            <script>
                function chooseForm(radioName) {
                    var radios = document.getElementsByName(radioName);
                    for (var i = 0, length = radios.length; i < length; i++) {
                        document.getElementById('form_' + radios[i].value).style.display = 'none';
                        if (radios[i].checked) {
                        document.getElementById('form_' + radios[i].value).style.display = 'block';
                        }
                    }
                }
            </script>`;
            if (smtp === 'on') {
                address = post.address;
                port = post.port;
                userName = post.userName;
                password = post.password;
                from = post.from;
                to = post.to;
                emailTitle = post.emailTitle;
                text = post.text;
                smtpConfig.host = address;
                smtpConfig.port = port;
                smtpConfig.auth.user = userName;
                smtpConfig.auth.pass = password;
                mailOptions.from = from;
                mailOptions.to = to;
                mailOptions.subject = emailTitle;
                mailOptions.text = text;


                var smtpTransport = nodemailer.createTransport(smtpConfig);

                smtpTransport.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                    smtpTransport.close();
                });
                description = description + `
                <label><input type="radio" name="smtp" value="1" checked onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="smtp" value="2" onclick="chooseForm(this.name)" />off</label>
                <div id="form_1">
                    <form action="/smtp" method="post">
                        <p>
                        <input type="hidden" name="smtp" value="on" />
                        <p>
                            Mail Server Address: <input type="text" name="address" value="${address}" />
                        </p>
                        <p>
                            Port: <input type="text" name="port" value="${port}" /> [25, 125 ~ 65535]
                        </p>
                        <p>
                            User Name: <input type="text" name="userName" value="${userName}" />
                        </p>
                        <p>
                            Password: <input type="password" name="password" value="${password}" />
                        </p>
                        <p>
                            From: <input type="text" name="from" value="${from}" />
                        </p>
                        <p>
                            to: <input type="text" name="to" value="${to}" />
                        </p>
                        <p>
                            E-Mail Title: <input type="text" name="emailTitle" value="${emailTitle}" /> 
                        </p>
                        <p>
                            text: <input type="text" name="text" value="${text}" /> 
                        </p>
                        <input type="submit" />
                    </form>
                    
                </div>
                <div id="form_2" style="display: none">
                    <form action="/smtp" method="post">
                        <p>
                        <input type="hidden" name="smtp" value="off" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                `;
            } else {
                description = description + `
                <label><input type="radio" name="smtp" value="1" onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="smtp" value="2" checked onclick="chooseForm(this.name)" />off</label>
                <div id="form_1" style="display: none">
                    <form action="/smtp" method="post">
                        <p>
                        <input type="hidden" name="smtp" value="on" />
                        <p>
                            Mail Server Address: <input type="text" name="address" value="${address}" />
                        </p>
                        <p>
                            Port: <input type="text" name="port" value="${port}" /> [25, 125 ~ 65535]
                        </p>
                        <p>
                            User Name: <input type="text" name="userName" value="${userName}" />
                        </p>
                        <p>
                            Password: <input type="password" name="password" value="${password}" />
                        </p>
                        <p>
                            From: <input type="text" name="from" value="${from}" />
                        </p>
                        <p>
                            to: <input type="text" name="to" value="${to}" />
                        </p>
                        <p>
                            E-Mail Title: <input type="text" name="emailTitle" value="${emailTitle}" /> 
                        </p>
                        <p>
                            text: <input type="text" name="text" value="${text}" /> 
                        </p>
                        <input type="submit" />
                    </form>
                    
                </div>
                <div id="form_2">
                    <form action="/smtp" method="post">
                        <p>
                        <input type="hidden" name="smtp" value="off" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                `;
            }

            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);
            })
        })


        this.webserver.post('/ftp', (req, res) => {
            var title = 'FTP';
            var post = req.body;
            var ftp = post.ftp;
            var address = "";
            var port = "";
            var userName = "";
            var password = "";

            var description = `
            <script>
                function chooseForm(radioName) {
                    var radios = document.getElementsByName(radioName);
                    for (var i = 0, length = radios.length; i < length; i++) {
                        document.getElementById('form_' + radios[i].value).style.display = 'none';
                        if (radios[i].checked) {
                        document.getElementById('form_' + radios[i].value).style.display = 'block';
                        }
                    }
                }
            </script>`;
            if (ftp === 'on') {
                address = post.address;
                port = post.port;
                userName = post.userName;
                password = post.password;
                description = description + `
                <label><input type="radio" name="ftp" value="1" checked onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="ftp" value="2" onclick="chooseForm(this.name)" />off</label>
                <div id="form_1">
                <form action="/ftp" method="post">
                        <p>
                        <input type="hidden" name="ftp" value="on" />
                        </p>
                        <p>
                            FTP Server Address: <input type="text" name="address" value="${address}"  />
                        </p>
                        <p>
                            Port: <input type="text" name="port" value="${port}" /> [21, 125 ~ 65535]
                        </p>
                        <p>
                            User Name: <input type="text" name="userName" value="${userName}" />
                        </p>
                        <p>
                            Password: <input type="password" name="password" value="${password}" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                <div id="form_2" style="display: none">
                    <form action="/ftp" method="post">
                        <p>
                        <input type="hidden" name="ftp" value="off" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>`;
                var connectionProperties = {
                    host: address,
                    port: port,
                    user: userName,
                    password: password,
                };
                c.on('ready', function () {
                    c.put('./log.txt', './log-copy.txt', function (err) {
                        if (err) throw err;
                        c.end();
                    });
                });
                c.connect(connectionProperties);
            } else {
                description = description + `
                <label><input type="radio" name="ftp" value="1" onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="ftp" value="2" checked onclick="chooseForm(this.name)" />off</label>
                <div id="form_1" style="display: none">
                <form action="/ftp" method="post">
                        <p>
                        <input type="hidden" name="ftp" value="on" />
                        </p>
                        <p>
                            FTP Server Address: <input type="text" name="address" value="${address}"  />
                        </p>
                        <p>
                            Port: <input type="text" name="port" value="${port}" /> [21, 125 ~ 65535]
                        </p>
                        <p>
                            User Name: <input type="text" name="userName" value="${userName}" />
                        </p>
                        <p>
                            Password: <input type="password" name="password" value="${password}" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>
                <div id="form_2">
                    <form action="/ftp" method="post">
                        <p>
                        <input type="hidden" name="ftp" value="off" />
                        </p>
                        <input type="submit" />
                    </form>
                </div>`;
                c.end();
            }

            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);

            })


        })

        this.webserver.post('/ipfilter', (req, res) => {
            var title = 'IP_Filter';
            var post = req.body;
            var select = post.select;
            var startIP = post.startIP;
            var endIP = post.endIP;
            var ips = [startIP, endIP];
            var description = ``;
            console.log(post);
            if (select === 'allow') {
                description = `<form action="/ipfilter" method="post">
                <p>
                    Select: <select name="select">
                    <option selected value="allow">allow</option>
                    <option value="block">block</option>
                    </select>
                </p>
                <p>
                    Start IP: <input type="text" name="startIP" value="${startIP}">
                </p>
                <p>
                    End IP: <input type="text" name="endIP" value="${endIP}">
                </p>
                <input type="submit" />
                </form>`;

                utils.execSync(`iptables -A INPUT -m iprange --src-range ${startIP}-${endIP} -j ACCEPT`);
            } else if (select === 'block') {
                description = `<form action="/ipfilter" method="post">
                <p>
                    Select: <select name="select">
                    <option value="allow">allow</option>
                    <option selected value="block">block</option>
                    </select>
                </p>
                <p>
                    Start IP: <input type="text" name="startIP" value="${startIP}">
                </p>
                <p>
                    End IP: <input type="text" name="endIP" value="${endIP}">
                </p>
                <input type="submit" />
                </form>`;

                utils.execSync(`iptables -A INPUT -m iprange --src-range ${startIP}-${endIP} -j REJECT`);
            }


            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);

            })
        })
        this.webserver.post('/roi', (req, res) => {
            var title = 'ROI';
            var roi = req.body;

            // if ([mask.StartX].length === 1){
            //     mask.StartX = [mask.StartX];           
            //     mask.EndX = [mask.EndX];               
            //     mask.StartY = [mask.StartY];            
            //     mask.EndY = [mask.EndY];
            // }
            

            console.log(roi);

            var description = `
            <script>
                function chooseForm(radioName) {
                    var radios = document.getElementsByName(radioName);
                    for (var i = 0, length = radios.length; i < length; i++) {
                        document.getElementById('form_' + radios[i].value).style.display = 'none';
                        if (radios[i].checked) {
                        document.getElementById('form_' + radios[i].value).style.display = 'block';
                        }
                    }
                }
            </script>`;
            cppCode_roi = ``;
            var cppCode_roi_1 = ``;
            
            var cppCode_roi_2 = `
        cv::cvtColor ( frame, frame, cv::COLOR_GRAY2BGR );`;
            cppCode_text= ``;
            cppCode_cap = `
int main ( int argc, char **argv ) {
    cv::VideoCapture cap;
    struct v4l2_format vid_format;
    size_t framesize = WIDTH * HEIGHT * 3;
    int fd = 0;

    if( cap.open ( VIDEO_IN ) ) {
        cap.set ( cv::CAP_PROP_FRAME_WIDTH , WIDTH  );
        cap.set ( cv::CAP_PROP_FRAME_HEIGHT, HEIGHT );
    } else {
        std::cout << "Unable to open video input!" << std::endl;
    }

    if ( (fd = open ( VIDEO_OUT, O_RDWR )) == -1 )
        printf ("Unable to open video output!");

    memset ( &vid_format, 0, sizeof(vid_format) );
    vid_format.type = V4L2_BUF_TYPE_VIDEO_OUTPUT;

    if ( ioctl ( fd, VIDIOC_G_FMT, &vid_format ) == -1 )
        printf ( "Unable to get video format data. Errro: %d\\n", errno );

    vid_format.fmt.pix.width       = cap.get ( CV_CAP_PROP_FRAME_WIDTH  );
    vid_format.fmt.pix.height      = cap.get ( CV_CAP_PROP_FRAME_HEIGHT );
    vid_format.fmt.pix.pixelformat = V4L2_PIX_FMT_RGB24;
    vid_format.fmt.pix.sizeimage   = framesize;
    vid_format.fmt.pix.field       = V4L2_FIELD_NONE;

    if ( ioctl ( fd, VIDIOC_S_FMT, &vid_format ) == -1 )
        printf ( "Unable to set video format! Errno: %d\\n", errno );

    cv::Mat frame ( cap.get(CV_CAP_PROP_FRAME_HEIGHT), 
    cap.get(CV_CAP_PROP_FRAME_WIDTH), CV_8UC3 );`;
            var roiData =``;
            if (roi.roi == 'on') {
                for (var i = 0; i < roi.StartX.length; i++) {
                    roiData = roiData + `<tr>
                            <th><input type="text" name="StartX[]" id="StartX" value="${roi.StartX[i]}" readonly></th>
                            <th><input type="text" name="EndX[]" id="EndX" value="${roi.EndX[i]}" readonly></th>
                            <th><input type="text" name="StartY[]" id="StartY" value="${roi.StartY[i]}" readonly></th>
                            <th><input type="text" name="EndY[]" id="EndY" value="${roi.EndY[i]}" readonly></th>
                            <th><input type="text" name="Temprature[]" id="Temprature" value="${roi.Temprature[i]}" readonly></th>
                            <th><input type="text" name="Color[]" id="Color" value="${roi.Color[i]}" readonly></th>
                            <th><a onClick="onEdit(this)">Edit</a> <a onClick="onDelete(this)">Delete</a></th>
                        </tr>`;
                        // fs.writeFileSync("ImageProcessing.cpp", cppCode)
                    cppCode_cap = cppCode_cap + `
    cv::Mat frameROI_${i};
    `;
                    cppCode_text = cppCode_text + `
                    
        cv::putText(frame, //target image
            "max${i}: " + maxstr_${i}, //text
            cv::Point(10, frame.rows / 6), //top-left position
            cv::FONT_HERSHEY_SIMPLEX,
            1.0,
            CV_RGB(0, 255, 0), //font color
            2);

`;
                    
                    cppCode_roi_1= cppCode_roi_1 + `
        
        frameROI_${i} = frame.clone();
        cv::cvtColor ( frameROI_${i}, frameROI_${i}, cv::COLOR_GRAY2RGB );
        cv::Rect roi_${i}(cv::Point(${roi.StartX[i]}, ${roi.StartY[i]}),cv::Point(${roi.EndX[i]}, ${roi.EndY[i]}));
        for (int y = 0; y < frame(roi_${i}).rows; y++) { 
            for (int x = 0; x < frame(roi_${i}).cols; x++) { 
                if (frame(roi_${i}).at<uchar>(y, x) > ${roi.Temprature[i]}) { 
                    frameROI_${i}(roi_${i}).at<cv::Vec3b>(y, x)[0] = 0;
                    frameROI_${i}(roi_${i}).at<cv::Vec3b>(y, x)[1] = 0;
                    frameROI_${i}(roi_${i}).at<cv::Vec3b>(y, x)[2] = frame(roi_${i}).at<uchar>(y, x); 
                } 
            }
        }
        
        double minVal_${i}; 
        double maxVal_${i}; 
        cv::Point minLoc_${i}; 
        cv::Point maxLoc_${i}; 

        minMaxLoc( frame(roi_${i}), &minVal_${i}, &maxVal_${i}, &minLoc_${i}, &maxLoc_${i} );
        auto minstr_${i} = std::to_string(minVal_${i}); 
        auto maxstr_${i} = std::to_string(maxVal_${i});
        std::cout << maxstr_${i} << std::endl;
                            `;
                    cppCode_roi_2 = cppCode_roi_2 + `
        frameROI_${i}(roi_${i}).copyTo(frame(roi_${i}));
        cv::rectangle(frame, cv::Point(${roi.StartX[i]}, ${roi.StartY[i]}), cv::Point(${roi.EndX[i]}, ${roi.EndY[i]}), cv::Scalar(0, 255, 0), 3);
                    `
                }
        
                cppCode_cap= cppCode_cap + `
    printf ( "Please open the virtual video device (/dev/video<x>) e.g. with VLC\\n" );
    std::cout << "sample starts" << VIDEO_IN << std::endl;

    while (1) {
        cap >> frame;
        cv::cvtColor ( frame, frame, cv::COLOR_BGR2GRAY ); 
        `;

            cppCode_text = cppCode_text + `
        cv::cvtColor ( frame, frame, cv::COLOR_BGR2RGB );
`;
                cppCode_roi = cppCode_roi_1 + cppCode_roi_2;
                cppCode = cppCode_header + cppCode_resolution + cppCode_cap + cppCode_roi + cppCode_pm + cppCode_text + cppCode_write;
                fs.writeFileSync("opencv/cap", cppCode_cap);
                fs.writeFileSync("opencv/roi", cppCode_roi);
                fs.writeFileSync("opencv/text", cppCode_text);
                fs.writeFileSync("ImageProcessing.cpp", cppCode);






                description = description + `
                <label><input type="radio" name="roi" value="1" checked onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="roi" value="2" onclick="chooseForm(this.name)" />off</label>
                <div id="form_1">
                    <table>
                    <tr>
                        <td>
                            <form onsubmit="event.preventDefault();onFormSubmit();" autocomplete="off">
                                <div>
                                    <label>StartX</label>
                                    <input type="text" name="StartX" id="StartX">
                                </div>
                                <div>
                                    <label>EndX </label>
                                    <input type="text" name="EndX" id="EndX">
                                </div>
                                <div>
                                    <label>StartY</label>
                                    <input type="text" name="StartY" id="StartY">
                                </div>
                                <div>
                                    <label>EndY</label>
                                    <input type="text" name="EndY" id="EndY">
                                </div>
                                <div>
                                    <label>Temprature</label>
                                    <input type="text" name="Temprature" id="Temprature">
                                </div>
                                <div>
                                    <label>Color</label>
                                    <input type="text" name="Color" id="Color">
                                </div>
                                <div class="form-action-buttons">
                                    <input type="submit" />
                                </div>
                            </form>
                        </td>
                    </tr>
                </table>
                <form action="/roi" method="post">
                    <input type="hidden" name="roi" value="on" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>StartX</th>
                                <th>EndX</th>
                                <th>StartY</th>
                                <th>EndY</th>
                                <th>Temprature</th>
                                <th>Color</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                ${roiData}
                            </tr>
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
                </div>
                <div id="form_2" style="display: none">
                <table>
                <tr>
                    <td>
                        
                    </td>
                </tr>
            </table>
            <form action="/roi" method="post">
            <input type="hidden" name="roi" value="off" />
            <table class="list" id="employeeList">
                <thead>
                    <tr>
                        <th>StartX</th>
                        <th>EndX Address</th>
                        <th>StartY</th>
                        <th>endY</th>
                        <th>Temprature</th>
                        <th>Color</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    
                </tbody>
            </table>
            <input type="submit" />
        </form>
        </div>`;
            } else {
                description = description + `
            <label><input type="radio" name="roi" value="1" onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="roi" value="2" checked onclick="chooseForm(this.name)" />off</label>
                <div id="form_1" style="display: none">
                    <table>
                    <tr>
                        <td>
                            <form onsubmit="event.preventDefault();onFormSubmit();" autocomplete="off">
                                <div>
                                    <label>StartX</label>
                                    <input type="text" name="StartX" id="StartX">
                                </div>
                                <div>
                                    <label>EndX </label>
                                    <input type="text" name="EndX" id="EndX">
                                </div>
                                <div>
                                    <label>StartY</label>
                                    <input type="text" name="StartY" id="StartY">
                                </div>
                                <div>
                                    <label>EndY</label>
                                    <input type="text" name="EndY" id="EndY">
                                </div>
                                <div>
                                    <label>Temprature</label>
                                    <input type="text" name="Temprature" id="Temprature">
                                </div>
                                <div>
                                    <label>Color</label>
                                    <input type="text" name="Color" id="Color">
                                </div>
                                <div class="form-action-buttons">
                                    <input type="submit" />
                                </div>
                            </form>
                        </td>
                    </tr>
                </table>
                <form action="/roi" method="post">
                    <input type="hidden" name="roi" value="on" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>StartX</th>
                                <th>EndX</th>
                                <th>StartY</th>
                                <th>EndY</th>
                                <th>Temprature</th>
                                <th>Color</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                
                            </tr>
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
                </div>
                <div id="form_2">
                <table>
                <tr>
                    <td>
                        
                    </td>
                </tr>
            </table>
            <form action="/roi" method="post">
            <input type="hidden" name="roi" value="off" />
            <table class="list" id="employeeList">
                <thead>
                    <tr>
                        <th>StartX</th>
                        <th>EndX Address</th>
                        <th>StartY</th>
                        <th>endY</th>
                        <th>Temprature</th>
                        <th>Color</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    
                </tbody>
            </table>
            <input type="submit" />
        </form>
        </div>`;
            }
            

            description = description + `
        <script>
            var selectedRow = null
        
            function onFormSubmit() {
                var formData = readFormData();
                if (selectedRow == null)
                    insertNewRecord(formData);
                else
                    updateRecord(formData);
                resetForm();
            }
        
            function readFormData() {
                var formData = {};
                formData["StartX"] = document.getElementById("StartX").value;
                formData["EndX"] = document.getElementById("EndX").value;
                formData["StartY"] = document.getElementById("StartY").value;
                formData["EndY"] = document.getElementById("EndY").value;
                formData["Temprature"] = document.getElementById("Temprature").value;
                formData["Color"] = document.getElementById("Color").value;
                return formData;
            }
        
            function insertNewRecord(data) {
                var table = document.getElementById("employeeList").getElementsByTagName('tbody')[0];
                var newRow = table.insertRow(table.length);
                cell1 = newRow.insertCell(0);
                cell1.innerHTML = \`<tr><th><input type="text" name="StartX[]" id="StartX" value="\${data.StartX}" readonly></th>\`;
                // cell1.innerHTML = data.StartX;
                cell2 = newRow.insertCell(1);
                cell2.innerHTML = \`<th><input type="text" name="EndX[]" id="EndX" value="\${data.EndX}" readonly></th>\`;
                // cell2.innerHTML = data.EndX;
                cell3 = newRow.insertCell(2);
                cell3.innerHTML = \`<th><input type="text" name="StartY[]" id="StartY" value="\${data.StartY}" readonly></th>\`;
                // cell3.innerHTML = data.StartY;
                cell4 = newRow.insertCell(3);
                cell4.innerHTML = \`<th><input type="text" name="EndY[]" id="EndY" value="\${data.EndY}" readonly></th>\`;
                // cell4.innerHTML = data.EndY;
                cell5 = newRow.insertCell(4);
                cell5.innerHTML = \`<th><input type="text" name="Temprature[]" id="Temprature" value="\${data.Temprature}" readonly></th>\`;
                // cell3.innerHTML = data.Temprature;
                cell6 = newRow.insertCell(5);
                cell6.innerHTML = \`<th><input type="text" name="Color[]" id="Color" value="\${data.Color}" readonly></th>\`;
                // cell4.innerHTML = data.Color;
                cell6 = newRow.insertCell(6);
                cell6.innerHTML = \`<th><a onClick="onEdit(this)">Edit</a> <a onClick="onDelete(this)">Delete</a></th></tr>\`;
            }
        
            function resetForm() {
                document.getElementById("StartX").value = "";
                document.getElementById("EndX").value = "";
                document.getElementById("StartY").value = "";
                document.getElementById("EndY").value = "";
                document.getElementById("Temprature").value = "";
                document.getElementById("Color").value = "";
                selectedRow = null;
            }
        
            function onEdit(td) {
                selectedRow = td.parentElement.parentElement;
                document.getElementById("StartX").value = selectedRow.cells[0].innerHTML;
                document.getElementById("EndX").value = selectedRow.cells[1].innerHTML;
                document.getElementById("StartY").value = selectedRow.cells[2].innerHTML;
                document.getElementById("EndY").value = selectedRow.cells[3].innerHTML;
                document.getElementById("Temprature").value = selectedRow.cells[4].innerHTML;
                document.getElementById("Color").value = selectedRow.cells[5].innerHTML;
            }
        
            function updateRecord(formData) {
                selectedRow.cells[0].innerHTML = \`<tr><th><input type="text" name="StartX[]" id="StartX" value="\${formData.StartX}" readonly></th>\`;
                selectedRow.cells[1].innerHTML = \`<tr><th><input type="text" name="EndX[]" id="EndX" value="\${formData.EndX}" readonly></th>\`;
                selectedRow.cells[2].innerHTML = \`<tr><th><input type="text" name="StartY[]" id="StartY" value="\${formData.StartY}" readonly></th>\`;
                selectedRow.cells[3].innerHTML = \`<tr><th><input type="text" name="EndY[]" id="EndY" value="\${formData.EndY}" readonly></th></tr>\`;
                selectedRow.cells[2].innerHTML = \`<tr><th><input type="text" name="Temprature[]" id="Temprature" value="\${formData.Temprature}" readonly></th>\`;
                selectedRow.cells[3].innerHTML = \`<tr><th><input type="text" name="Color[]" id="Color" value="\${formData.Color}" readonly></th></tr>\`;
            }
        
            function onDelete(td) {
                if (confirm('Are you sure to delete this IP Address?')) {
                    row = td.parentElement.parentElement;
                    document.getElementById("employeeList").deleteRow(row.rowIndex);
                    resetForm();
                }
            }
        </script>`;
           
            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);
            })

        })

        this.webserver.post('/ipfilter2', (req, res) => {
            var title = 'IP_Filter2';
            var filter = req.body.filter;
            var ipfilter = [];
            ipfilter = req.body;
            console.log(ipfilter);
            var jsonData = JSON.stringify({
                ipfilter
            });
            // fs.writeFileSync("ipfilter.json", jsonData)
            fs.writeFile("ipfilter.json", jsonData, function (err) {
                if (err) {
                    console.log(err);
                }
            });

            utils.execSync(`iptables -F INPUT`);
            var ipFilterTable = ``;


            // start
            var description = `
            <script>
                function chooseForm(radioName) {
                    var radios = document.getElementsByName(radioName);
                    for (var i = 0, length = radios.length; i < length; i++) {
                        document.getElementById('form_' + radios[i].value).style.display = 'none';
                        if (radios[i].checked) {
                        document.getElementById('form_' + radios[i].value).style.display = 'block';
                        }
                    }
                }
            </script>`;
            if (filter === 'on') {
                if (ipfilter.permission === 'allow') {
                    ipFilterTable = ipFilterTable + `<tr>
                                <th><input type="text" name="permission" id="permission" value="${ipfilter.permission}" readonly></th>
                                <th><input type="text" name="startIP" id="startIP" value="${ipfilter.startIP}" readonly></th>
                                <th><input type="text" name="endIP" id="endIP" value="${ipfilter.endIP}" readonly></th>
                                <th><input type="text" name="etc" id="etc" value="${ipfilter.etc}" readonly></th>
                                <th><a onClick="onEdit(this)">Edit</a> <a onClick="onDelete(this)">Delete</a></th>
                            </tr>`;
                    if (ipfilter.permission === 'allow') {
                        utils.execSync(`iptables -A INPUT -m iprange --src-range ${ipfilter.startIP}-${ipfilter.endIP} -j ACCEPT`);
                    } else {
                        utils.execSync(`iptables -A INPUT -m iprange --src-range ${ipfilter.startIP}-${ipfilter.endIP} -j REJECT`);
                    }
                    // utils.execSync(`iptables -A INPUT -m iprange --src-range ${startIP}-${endIP} -j REJECT`);


                } else if (ipfilter.permission === 'deny') {
                    ipFilterTable = ipFilterTable + `<tr>
                                <th><input type="text" name="permission" id="permission" value="${ipfilter.permission}" readonly></th>
                                <th><input type="text" name="startIP" id="startIP" value="${ipfilter.startIP}" readonly></th>
                                <th><input type="text" name="endIP" id="endIP" value="${ipfilter.endIP}" readonly></th>
                                <th><input type="text" name="etc" id="etc" value="${ipfilter.etc}" readonly></th>
                                <th><a onClick="onEdit(this)">Edit</a> <a onClick="onDelete(this)">Delete</a></th>
                            </tr>`;
                    if (ipfilter.permission === 'allow') {
                        utils.execSync(`iptables -A INPUT -m iprange --src-range ${ipfilter.startIP}-${ipfilter.endIP} -j ACCEPT`);
                    } else {
                        utils.execSync(`iptables -A INPUT -m iprange --src-range ${ipfilter.startIP}-${ipfilter.endIP} -j REJECT`);
                    }
                } else {
                    for (var i = 0; i < ipfilter.permission.length; i++) {
                        ipFilterTable = ipFilterTable + `<tr>
                                <th><input type="text" name="permission" id="permission" value="${ipfilter.permission[i]}" readonly></th>
                                <th><input type="text" name="startIP" id="startIP" value="${ipfilter.startIP[i]}" readonly></th>
                                <th><input type="text" name="endIP" id="endIP" value="${ipfilter.endIP[i]}" readonly></th>
                                <th><input type="text" name="etc" id="etc" value="${ipfilter.etc[i]}" readonly></th>
                                <th><a onClick="onEdit(this)">Edit</a> <a onClick="onDelete(this)">Delete</a></th>
                            </tr>`;
                        if (ipfilter.permission[i] === 'allow') {
                            utils.execSync(`iptables -A INPUT -m iprange --src-range ${ipfilter.startIP[i]}-${ipfilter.endIP[i]} -j ACCEPT`);
                        } else {
                            utils.execSync(`iptables -A INPUT -m iprange --src-range ${ipfilter.startIP[i]}-${ipfilter.endIP[i]} -j REJECT`);
                        }
                        // utils.execSync(`iptables -A INPUT -m iprange --src-range ${startIP}-${endIP} -j REJECT`);
                    }

                }

                description = description + `
                <label><input type="radio" name="filter" value="1" checked onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="filter" value="2" onclick="chooseForm(this.name)" />off</label>
                <div id="form_1">
                    <table>
                    <tr>
                        <td>
                            <form onsubmit="event.preventDefault();onFormSubmit();" autocomplete="off">
                                <div>
                                    <label>Permission</label>
                                    <input type="text" name="permission" id="permission">
                                </div>
                                <div>
                                    <label>Start IP Address</label>
                                    <input type="text" name="startIP" id="startIP">
                                </div>
                                <div>
                                    <label>End IP Address</label>
                                    <input type="text" name="endIP" id="endIP">
                                </div>
                                <div>
                                    <label>etc</label>
                                    <input type="text" name="etc" id="etc">
                                </div>
                                <div class="form-action-buttons">
                                    <input type="submit" />
                                </div>
                            </form>
                        </td>
                    </tr>
                </table>
                <form action="/ipfilter2" method="post">
                    <input type="hidden" name="filter" value="on" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>Permission</th>
                                <th>Start IP Address</th>
                                <th>End IP Address</th>
                                <th>etc</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ipFilterTable}
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
                </div>
                <div id="form_2" style="display: none">
                <table>
                <tr>
                    <td>
                        
                    </td>
                </tr>
            </table>
                <form action="/ipfilter2" method="post">
                    <input type="hidden" name="filter" value="off" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>Permission</th>
                                <th>Start IP Address</th>
                                <th>End IP Address</th>
                                <th>etc</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
                </div>`;

            } else {
                description = description + `
                <label><input type="radio" name="filter" value="1" onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="filter" value="2" checked onclick="chooseForm(this.name)" />off</label>
                <div id="form_1" style="display: none">
                    <table>
                    <tr>
                        <td>
                            <form onsubmit="event.preventDefault();onFormSubmit();" autocomplete="off">
                                <div>
                                    <label>Permission</label>
                                    <input type="text" name="permission" id="permission">
                                </div>
                                <div>
                                    <label>Start IP Address</label>
                                    <input type="text" name="startIP" id="startIP">
                                </div>
                                <div>
                                    <label>End IP Address</label>
                                    <input type="text" name="endIP" id="endIP">
                                </div>
                                <div>
                                    <label>etc</label>
                                    <input type="text" name="etc" id="etc">
                                </div>
                                <div class="form-action-buttons">
                                    <input type="submit" />
                                </div>
                            </form>
                        </td>
                    </tr>
                </table>
                <form action="/ipfilter2" method="post">
                    <input type="hidden" name="filter" value="on" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>Permission</th>
                                <th>Start IP Address</th>
                                <th>End IP Address</th>
                                <th>etc</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ipFilterTable}
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
                </div>
                <div id="form_2">
                <table>
                <tr>
                    <td>
                        
                    </td>
                </tr>
            </table>
                <form action="/ipfilter2" method="post">
                    <input type="hidden" name="filter" value="off" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>Permission</th>
                                <th>Start IP Address</th>
                                <th>End IP Address</th>
                                <th>etc</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
                </div>`;
            }

            // end



            var description = description + `
        <script>
            var selectedRow = null
        
            function onFormSubmit() {
                var formData = readFormData();
                if (selectedRow == null)
                    insertNewRecord(formData);
                else
                    updateRecord(formData);
                resetForm();
            }
        
            function readFormData() {
                var formData = {};
                formData["permission"] = document.getElementById("permission").value;
                formData["startIP"] = document.getElementById("startIP").value;
                formData["endIP"] = document.getElementById("endIP").value;
                formData["etc"] = document.getElementById("etc").value;
                return formData;
            }
        
            function insertNewRecord(data) {
                var table = document.getElementById("employeeList").getElementsByTagName('tbody')[0];
                var newRow = table.insertRow(table.length);
                cell1 = newRow.insertCell(0);
                cell1.innerHTML = \`<tr><th><input type="text" name="permission" id="permission" value="\${data.permission}" readonly></th>\`;
                // cell1.innerHTML = data.permission;
                cell2 = newRow.insertCell(1);
                cell2.innerHTML = \`<th><input type="text" name="startIP" id="startIP" value="\${data.startIP}" readonly></th>\`;
                // cell2.innerHTML = data.startIP;
                cell3 = newRow.insertCell(2);
                cell3.innerHTML = \`<th><input type="text" name="endIP" id="endIP" value="\${data.endIP}" readonly></th>\`;
                // cell3.innerHTML = data.endIP;
                cell4 = newRow.insertCell(3);
                cell4.innerHTML = \`<th><input type="text" name="etc" id="etc" value="\${data.etc}" readonly></th>\`;
                // cell4.innerHTML = data.etc;
                cell4 = newRow.insertCell(4);
                cell4.innerHTML = '<th><a onClick="onEdit(this)">Edit</a> <a onClick="onDelete(this)">Delete</a></th></tr>';
            }
        
            function resetForm() {
                document.getElementById("permission").value = "";
                document.getElementById("startIP").value = "";
                document.getElementById("endIP").value = "";
                document.getElementById("etc").value = "";
                selectedRow = null;
            }
        
            function onEdit(td) {
                selectedRow = td.parentElement.parentElement;
                document.getElementById("permission").value = selectedRow.cells[0].innerHTML;
                document.getElementById("startIP").value = selectedRow.cells[1].innerHTML;
                document.getElementById("endIP").value = selectedRow.cells[2].innerHTML;
                document.getElementById("etc").value = selectedRow.cells[3].innerHTML;
            }
        
            function updateRecord(formData) {
                selectedRow.cells[0].innerHTML = \`<tr><th><input type="text" name="permission" id="permission" value="\${formData.permission}" readonly></th>\`;
                selectedRow.cells[1].innerHTML = \`<tr><th><input type="text" name="startIP" id="startIP" value="\${formData.startIP}" readonly></th>\`;
                selectedRow.cells[2].innerHTML = \`<tr><th><input type="text" name="endIP" id="endIP" value="\${formData.endIP}" readonly></th>\`;
                selectedRow.cells[3].innerHTML = \`<tr><th><input type="text" name="etc" id="etc" value="\${formData.etc}" readonly></th></tr>\`;
            }
        
            function onDelete(td) {
                if (confirm('Are you sure to delete this IP Address?')) {
                    row = td.parentElement.parentElement;
                    document.getElementById("employeeList").deleteRow(row.rowIndex);
                    resetForm();
                }
            }
        </script>`;
            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);
            })

        })


        this.webserver.post('/mask', (req, res) => {
            var title = 'Privacy_Mask';
            var mask = req.body;

            // if ([mask.StartX].length === 1){
            //     mask.StartX = [mask.StartX];           
            //     mask.EndX = [mask.EndX];               
            //     mask.StartY = [mask.StartY];            
            //     mask.EndY = [mask.EndY];
            // }
            

            console.log(mask);

            var description = `
            <script>
                function chooseForm(radioName) {
                    var radios = document.getElementsByName(radioName);
                    for (var i = 0, length = radios.length; i < length; i++) {
                        document.getElementById('form_' + radios[i].value).style.display = 'none';
                        if (radios[i].checked) {
                        document.getElementById('form_' + radios[i].value).style.display = 'block';
                        }
                    }
                }
            </script>`;
            cppCode_pm = ``;
            var maskData =``;
            if (mask.mask == 'on') {
                for (var i = 0; i < mask.StartX.length; i++) {
                    maskData = maskData + `<tr>
                            <th><input type="text" name="StartX[]" id="StartX" value="${mask.StartX[i]}" readonly></th>
                            <th><input type="text" name="EndX[]" id="EndX" value="${mask.EndX[i]}" readonly></th>
                            <th><input type="text" name="StartY[]" id="StartY" value="${mask.StartY[i]}" readonly></th>
                            <th><input type="text" name="EndY[]" id="EndY" value="${mask.EndY[i]}" readonly></th>
                            <th><a onClick="onEdit(this)">Edit</a> <a onClick="onDelete(this)">Delete</a></th>
                        </tr>`;
                        // fs.writeFileSync("ImageProcessing.cpp", cppCode)

                    cppCode_pm= cppCode_pm + `
        cv::rectangle(frame, cv::Point(${mask.StartX[i]}, ${mask.StartY[i]}), cv::Point(${mask.EndX[i]}, ${mask.EndY[i]}), (255, 0, 0), -1);
                            `;
                    
                }
                cppCode = cppCode_header + cppCode_resolution + cppCode_cap + cppCode_roi + cppCode_pm + cppCode_text + cppCode_write;
                fs.writeFileSync("opencv/pm", cppCode_pm)
                fs.writeFileSync("ImageProcessing.cpp", cppCode)



                description = description + `
                <label><input type="radio" name="mask" value="1" checked onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="mask" value="2" onclick="chooseForm(this.name)" />off</label>
                <div id="form_1">
                    <table>
                    <tr>
                        <td>
                            <form onsubmit="event.preventDefault();onFormSubmit();" autocomplete="off">
                                <div>
                                    <label>StartX</label>
                                    <input type="text" name="StartX" id="StartX">
                                </div>
                                <div>
                                    <label>EndX </label>
                                    <input type="text" name="EndX" id="EndX">
                                </div>
                                <div>
                                    <label>StartY</label>
                                    <input type="text" name="StartY" id="StartY">
                                </div>
                                <div>
                                    <label>EndY</label>
                                    <input type="text" name="EndY" id="EndY">
                                </div>
                                <div class="form-action-buttons">
                                    <input type="submit" />
                                </div>
                            </form>
                        </td>
                    </tr>
                </table>
                <form action="/mask" method="post">
                    <input type="hidden" name="mask" value="on" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>StartX</th>
                                <th>EndX</th>
                                <th>StartY</th>
                                <th>EndY</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${maskData}
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
            </div>
            <div id="form_2" style="display: none">
                <table>
                <tr>
                    <td>
                        
                    </td>
                </tr>
            </table>
                <form action="/mask" method="post">
                    <input type="hidden" name="mask" value="off" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>StartX</th>
                                <th>EndX Address</th>
                                <th>StartY</th>
                                <th>endY</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
            </div>`;
            } else {
                description = description + `
                <label><input type="radio" name="mask" value="1" onclick="chooseForm(this.name)" />on</label>
                <label><input type="radio" name="mask" value="2" checked onclick="chooseForm(this.name)" />off</label>
                <div id="form_1" style="display: none">
                    <table>
                    <tr>
                        <td>
                            <form onsubmit="event.preventDefault();onFormSubmit();" autocomplete="off">
                                <div>
                                    <label>StartX</label>
                                    <input type="text" name="StartX" id="StartX">
                                </div>
                                <div>
                                    <label>EndX </label>
                                    <input type="text" name="EndX" id="EndX">
                                </div>
                                <div>
                                    <label>StartY</label>
                                    <input type="text" name="StartY" id="StartY">
                                </div>
                                <div>
                                    <label>EndY</label>
                                    <input type="text" name="EndY" id="EndY">
                                </div>
                                <div class="form-action-buttons">
                                    <input type="submit" />
                                </div>
                            </form>
                        </td>
                    </tr>
                </table>
                <form action="/mask" method="post">
                    <input type="hidden" name="mask" value="on" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>StartX</th>
                                <th>EndX</th>
                                <th>StartY</th>
                                <th>EndY</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                
                            </tr>
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
            </div>
            <div id="form_2">
                <table>
                <tr>
                    <td>
                        
                    </td>
                </tr>
            </table>
                <form action="/mask" method="post">
                    <input type="hidden" name="mask" value="off" />
                    <table class="list" id="employeeList">
                        <thead>
                            <tr>
                                <th>StartX</th>
                                <th>EndX Address</th>
                                <th>StartY</th>
                                <th>endY</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            
                        </tbody>
                    </table>
                    <input type="submit" />
                </form>
            </div>`;
            }
            

            description = description + `
        <script>
            var selectedRow = null
        
            function onFormSubmit() {
                var formData = readFormData();
                if (selectedRow == null)
                    insertNewRecord(formData);
                else
                    updateRecord(formData);
                resetForm();
            }
        
            function readFormData() {
                var formData = {};
                formData["StartX"] = document.getElementById("StartX").value;
                formData["EndX"] = document.getElementById("EndX").value;
                formData["StartY"] = document.getElementById("StartY").value;
                formData["EndY"] = document.getElementById("EndY").value;
                return formData;
            }
        
            function insertNewRecord(data) {
                var table = document.getElementById("employeeList").getElementsByTagName('tbody')[0];
                var newRow = table.insertRow(table.length);
                cell1 = newRow.insertCell(0);
                cell1.innerHTML = \`<tr><th><input type="text" name="StartX[]" id="StartX" value="\${data.StartX}" readonly></th>\`;
                // cell1.innerHTML = data.StartX;
                cell2 = newRow.insertCell(1);
                cell2.innerHTML = \`<th><input type="text" name="EndX[]" id="EndX" value="\${data.EndX}" readonly></th>\`;
                // cell2.innerHTML = data.EndX;
                cell3 = newRow.insertCell(2);
                cell3.innerHTML = \`<th><input type="text" name="StartY[]" id="StartY" value="\${data.StartY}" readonly></th>\`;
                // cell3.innerHTML = data.StartY;
                cell4 = newRow.insertCell(3);
                cell4.innerHTML = \`<th><input type="text" name="EndY[]" id="EndY" value="\${data.EndY}" readonly></th>\`;
                // cell4.innerHTML = data.EndY;
                cell4 = newRow.insertCell(4);
                cell4.innerHTML = \`<th><a onClick="onEdit(this)">Edit</a> <a onClick="onDelete(this)">Delete</a></th></tr>\`;
            }
        
            function resetForm() {
                document.getElementById("StartX").value = "";
                document.getElementById("EndX").value = "";
                document.getElementById("StartY").value = "";
                document.getElementById("EndY").value = "";
                selectedRow = null;
            }
        
            function onEdit(td) {
                selectedRow = td.parentElement.parentElement;
                document.getElementById("StartX").value = selectedRow.cells[0].innerHTML;
                document.getElementById("EndX").value = selectedRow.cells[1].innerHTML;
                document.getElementById("StartY").value = selectedRow.cells[2].innerHTML;
                document.getElementById("EndY").value = selectedRow.cells[3].innerHTML;
            }
        
            function updateRecord(formData) {
                selectedRow.cells[0].innerHTML = \`<tr><th><input type="text" name="StartX[]" id="StartX" value="\${formData.StartX}" readonly></th>\`;
                selectedRow.cells[1].innerHTML = \`<tr><th><input type="text" name="EndX[]" id="EndX" value="\${formData.EndX}" readonly></th>\`;
                selectedRow.cells[2].innerHTML = \`<tr><th><input type="text" name="StartY[]" id="StartY" value="\${formData.StartY}" readonly></th>\`;
                selectedRow.cells[3].innerHTML = \`<tr><th><input type="text" name="EndY[]" id="EndY" value="\${formData.EndY}" readonly></th></tr>\`;
            }
        
            function onDelete(td) {
                if (confirm('Are you sure to delete this IP Address?')) {
                    row = td.parentElement.parentElement;
                    document.getElementById("employeeList").deleteRow(row.rowIndex);
                    resetForm();
                }
            }
        </script>`;
           
            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);
            })

        })

        this.webserver.post('/socket', (req, res) => {
            var title = 'Socket';
            var tur = req.body.tur;

            updateJsonFile(configPath, (config) => {
                config.tur = tur;
                return config;
            });

            var description = `
            <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.1.2/socket.io.js"></script>
            <script>
                var socket = io();
                var tempData;
                socket.on('connect', function(arg){
                    console.log('server connect');
                });
                socket.on('message', function (data) {
                    console.log(data);
                });
            </script>
            `;

            console.log(tur);
            if (tur == 1){
                description = description + `
            <form action="/socket" method="post">
            <p>
            <input type="hidden" name="socket" value="socket" />
            </p>
            <p>
            TUR: <select name="tur">
            <option selected value="1">1 Hz</option>
            <option value="5">5 Hz</option>
            <option value="15">15 Hz</option>
            <option value="30">30 Hz</option>
            </select>
            
            <input type="submit" />
            </form>`;
            } else if (tur == 5){
                description = description + `
            <form action="/socket" method="post">
            <p>
            <input type="hidden" name="socket" value="socket" />
            </p>
            <p>
            TUR: <select name="tur">
            <option value="1">1 Hz</option>
            <option selected value="5">5 Hz</option>
            <option value="15">15 Hz</option>
            <option value="30">30 Hz</option>
            </select>
            
            <input type="submit" />
            </form>`;
            } else if (tur == 15){
                description = description + `
            <form action="/socket" method="post">
            <p>
            <input type="hidden" name="socket" value="socket" />
            </p>
            <p>
            TUR: <select name="tur">
            <option value="1">1 Hz</option>
            <option value="5">5 Hz</option>
            <option selected value="15">15 Hz</option>
            <option value="30">30 Hz</option>
            </select>
            
            <input type="submit" />
            </form>`;
            } else if (tur == 30){
                description = description + `
            <form action="/socket" method="post">
            <p>
            <input type="hidden" name="socket" value="socket" />
            </p>
            <p>
            TUR: <select name="tur">
            <option value="1">1 Hz</option>
            <option value="5">5 Hz</option>
            <option value="15">15 Hz</option>
            <option selected value="30">30 Hz</option>
            </select>
            
            <input type="submit" />
            </form>`;
            }   
            


            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);
            })

        })

        
        this.webserver.post('/control', (req, res) => {
            var title = 'Control';
            var post = req.body;




            // // Sync
            var agcControl = post.agcControl;
            var text = Object.keys({
                agcControl
            })[0];
            setTimeout(uartCommand, 500, text, post.agcControl);

            var inverseControl = post.inverseControl;
            var text = Object.keys({
                inverseControl
            })[0];
            setTimeout(uartCommand, 8000, text, post.inverseControl);

            var description = `
        <form action="/control" method="post">
            <p>
                AGC Control: <select name="agcControl">
                <option selected value="0x00">MGC</option>
                <option value="0x01">AGC</option>
                </select>
            </p>
            <p>
                Inverse Control: <select name="inverseControl">
                <option selected value="0x00">Disable</option>
                <option value="0x01">Enable</option>
                </select>
            </p>
            <p>
                MGC Cotrast (0 ~ 1024): <input type="number" name="mgcContrast" min="0" max="1024" step="1" value="255">
            </p>
            <p>
                MGC Brightness (0 ~ 511): <input type="number" name="mgcBrightness" min="0" max="511" step="1" value="256">
            </p>
            <p>
                Edge Enhance Mode: <select name="edgeEnhanceMode">
                <option selected value="0x00">Disable</option>
                <option value="0x03">Enable</option>
                </select>
            </p>
            <p>
                Edge Enhance Level (0 ~ 1000): <input type="number" name="edgeEnhanceLevel" min="0" max="1000" step="1" value="400">
            </p>
            <p>
                Save Setting: <select name="saveSetting">
                    <option selected value="0x00">Save Setting</option>
                    <option value="0x03">Save Temp</option>
                    <option value="0x09">Save Factory Default Temp</option>
                    </select>
            </p>
            <p>
                Shutter: 보류
            </p>
            <p>
                Flip Mirror: <select name="flipMirror">
                <option selected value="0x00">Flip : Off, Mirror : Off</option>
                <option value="0x01">Flip : Off, Mirror : On</option>
                <option value="0x02">Flip : On, Mirror : Off</option>
                <option value="0x03">Flip : On, Mirror : On</option>
                </select>
            </p>
            <p>
                Limit Gain (0 ~ 255): <input type="number" name="limitGain" min="0" max="1000" step="1" value="220">
            </p>
            <p>
                Shutter Mode: <select name="shutterMode">
                <option selected value="0x00">Temprature Mode</option>
                <option value="0x01">Time Mode</option>
                <option value="0x02">Manual Mode</option>
                </select>
            </p>
            <p>
                Shutter Time: (1(30s) ~ 120(60m)): <input type="number" name="shutterTime" min="1" max="120" step="1" value="1">
            </p>
            <p>
                Shutter Temp: (1 ~ 10): <input type="number" name="shutterTemp" min="1" max="10" step="1" value="1">
            </p>
            <p>
                Gamma Correction: (1 ~ 5): <input type="number" name="gammaCorrection" min="1" max="5" step="1" value="2">
            </p>
            <p>
                Temp Command: <select name="tempCommand">
                <option selected value="0x80">Read Temperature Status</option>
                <option value="0x00">Read Temperature Status</option>
                <option value="0x10">Select 1st Temp Period</option>            
                <option value="0x11">Select 2nd Temp Period</option>
                <option value="0x12">Select 3rd Temp Period</option>        
                <option value="0x13">Select 4th Temp Period</option>
                </select>
            </p>
            <p>
                De-Noise Filter: <select name="deNoiseFilter">
                <option value="0x00">Filter Off</option>
                <option value="0x01">Gaussian Filter On</option>
                <option value="0x02">Bilateral Filter On</option>            
                <option selected value="0x03">Gaussian + Bilateral Filter On</option>
                </select>
            </p>
            <p>
                Image Enhancement: <select name="imageEnhancement">
                <option value="0x00">On</option>
                <option selected value="0x01">Off</option>
                </select>
            </p>
            <p>
                Raw Data Control: <select name="rawDataControl">
                <option selected value="0x00">8 bits data output</option>
                <option value="0x01">16 bits data output</option>
                </select>
            </p>
            <p>
                Dead Update: <select name="deadUpdate">
                <option selected value="0x00">Dead Mode Off</option>
                <option value="0x01">Dead Mode On</option>
                <option value="0x03">Bram Write (Add)</option>
                <option value="0x05">Flash Write (Write)</option>
                </select>
            </p>
            <p>
                Set Output Data: <select name="setOutputData">
                <option selected value="0x00">Mix (Image + Temp)</option>
                <option value="0x01">Image Only</option>
                <option value="0x02">Temp Only</option>
                </select>
            </p>
            <p>
                Engine Information Request: 보류
            </p>
            <input type="submit" />
        </form>`
            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);
            });
        })


        this.webserver.post('/camerasetting', function (req, res) {
            var title = 'Camera_Setting';
            var post = req.body;
            // console.log(post);

            for (var par in post) {
                var g = par.split('.')[0];
                var p = par.split('.')[1];
                if (p && g) {
                    var prop = v4l2ctl_1.v4l2ctl.Controls[g][p];
                    var val = post[par];
                    if (val instanceof Array)
                        val = val.pop();
                    prop.value = val;
                    if (prop.isDirty) {
                        utils.log.debug("Property %s changed to %s", par, prop.value);
                    }
                }
            }
            v4l2ctl_1.v4l2ctl.ApplyControls();
            v4l2ctl_1.v4l2ctl.ReadControls();
            var parseControls = function (html, displayname, propname, controls) {
                html += "<tr><td colspan=\"2\"><strong>" + displayname + "</strong></td></tr>";
                for (var uc in controls) {
                    var p = controls[uc];
                    if (p.hasSet) {
                        var set = p.getLookupSet();
                        html += "<tr><td><span class=\"label\">" + uc + "</span></td><td><select name=\"" + propname + "." + uc + "\">";
                        for (var _i = 0, set_1 = set; _i < set_1.length; _i++) {
                            var o = set_1[_i];
                            html += "<option value=\"" + o.value + "\" " + (o.value == p.value ? 'selected="selected"' : '') + ">" + o.desc + "</option>";
                        }
                        html += '</select></td></tr>';
                    } else if (p.type == "Boolean") {
                        html += "<tr><td><span class=\"label\">" + uc + "</span></td>\n              <td><input type=\"hidden\" name=\"" + propname + "." + uc + "\" value=\"false\" />\n              <input type=\"checkbox\" name=\"" + propname + "." + uc + "\" value=\"true\" " + (p.value ? 'checked="checked"' : '') + "/></td><tr>";
                    } else {
                        html += "<tr><td><span class=\"label\">" + uc + "</span></td>\n              <td><input type=\"text\" name=\"" + propname + "." + uc + "\" value=\"" + p.value + "\" />";
                        if (p.hasRange)
                            html += "<span>( min: " + p.getRange().min + " max: " + p.getRange().max + " )</span>";
                        html += "</td><tr>";
                    }
                }
                return html;
            };

            var html = parseControls("", 'User Controls', 'UserControls', v4l2ctl_1.v4l2ctl.Controls.UserControls);
            html = parseControls(html, 'Codec Controls', 'CodecControls', v4l2ctl_1.v4l2ctl.Controls.CodecControls);
            html = parseControls(html, 'Camera Controls', 'CameraControls', v4l2ctl_1.v4l2ctl.Controls.CameraControls);
            html = parseControls(html, 'JPG Compression Controls', 'JPEGCompressionControls', v4l2ctl_1.v4l2ctl.Controls.JPEGCompressionControls);

            var description = `
            <form action="/camerasetting" method="post">
                <table>
                    <tbody>
                        ${html}
                    </tbody>
                </table>
                <button type="submit">SET</button>
            </form>`

            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                res.redirect(`/page/${title}`);
            })
        });

        // NTP s
        var ntpOptions = {
            host: 'address', // Defaults to pool.ntp.org
            port: 123, // Defaults to 123 (NTP)
            resolveReference: true, // Default to false (not resolving)
            timeout: 1000 // Defaults to zero (no timeout)
        };
        // timedatectl set-ntp false
        // timedatectl set-ntp true
        var exec = async function () {

            try {
                const time = await Sntp.time(ntpOptions);
                console.log(time);
                console.log('Local clock is off by: ' + time.t + ' milliseconds');
                // process.exit(0);
            } catch (err) {
                console.log('Failed: ' + err.message);
                // process.exit(1);
            }
        };
        // NTP f

        

        // SMTP s
        var smtpConfig = {
            host: 'smtp.gmail.com',
            port: 25,
            secure: false,
            auth: {
                user: 'wleodzz@gmail.com',
                pass: 'skrxk3@@'
            }
        };

        var mailOptions = {
            from: 'wleodzz@gmail.com',
            to: 'wleodzz@gmail.com',
            subject: 'Sending Email using Node.js[nodemailer]',
            text: 'That was easy!'
        };
        // SMTP f

        // FTP s
        var c = new Client(); 



    };

    Camera.prototype.setupWebserverStart = function () {
        var _this = this;
        utils.log.info("Starting camera settings http webserver on http://%s:%s/", utils.getIpAddress(), this.config.ServicePort);
        utils.log.info("Starting camera settings https webserver on https://%s:%s/", utils.getIpAddress(), this.config.httpsPort);        
        this.webserver.use(parser.urlencoded({
            extended: true
        }));
    };

    Camera.prototype.loadDriver = function () {
        try {
            utils.execSync("sudo modprobe bcm2835-v4l2");
        } catch (err) {}
    };
    Camera.prototype.unloadDriver = function () {
        try {
            utils.execSync("sudo modprobe -r bcm2835-v4l2");
        } catch (err) {}
    };
    Camera.prototype.setupCamera = function () {
        v4l2ctl_1.v4l2ctl.SetPixelFormat(v4l2ctl_1.v4l2ctl.Pixelformat.BGR3);
        v4l2ctl_1.v4l2ctl.SetResolution(this.settings.resolution);
        v4l2ctl_1.v4l2ctl.SetFrameRate(this.settings.framerate);
        v4l2ctl_1.v4l2ctl.SetPriority(v4l2ctl_1.v4l2ctl.ProcessPriority.record);
        v4l2ctl_1.v4l2ctl.ReadFromFile();
        v4l2ctl_1.v4l2ctl.ApplyControls();
    };
    Camera.prototype.setSettings = function (newsettings) {
        v4l2ctl_1.v4l2ctl.SetResolution(newsettings.resolution);
        v4l2ctl_1.v4l2ctl.SetFrameRate(newsettings.framerate);
        v4l2ctl_1.v4l2ctl.Controls.CodecControls.video_bitrate.value = newsettings.bitrate * 1000;
        v4l2ctl_1.v4l2ctl.Controls.CodecControls.video_bitrate_mode.value = newsettings.quality > 0 ? 0 : 1;
        v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_i_frame_period.value = this.settings.forceGop ? v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_i_frame_period.value : newsettings.gop;
        v4l2ctl_1.v4l2ctl.ApplyControls();
        // console.log("setSettings"+newsettings.resolution.Width+newsettings.resolution.Height);
    };
    Camera.prototype.startRtsp = function () {
        if (this.rtspServer) {
            utils.log.warn("Cannot start rtspServer, already running");
            return;
        }
        if (this.rtspServer2) {
            utils.log.warn("Cannot start rtspServer, already running");
            return;
        }
        utils.log.info("Starting Live555 rtsp server");
        if (this.config.MulticastEnabled) {
            this.rtspServer = utils.spawn("v4l2rtspserver", ["-P", this.config.RTSPPort.toString(), "-u", this.config.RTSPName.toString(), "-m", this.config.RTSPMulticastName, "-M", this.config.MulticastAddress.toString() + ":" + this.config.MulticastPort.toString(), "-W", this.settings.resolution.Width.toString(), "-H", this.settings.resolution.Height.toString(), "/dev/video0"]);
        } else {
            if (this.config.RTSPServer == 1)
                this.rtspServer = utils.spawn("./bin/rtspServer", ["/dev/video0", "2088960", this.config.RTSPPort.toString(), "0", this.config.RTSPName.toString()]);
            if (this.config.RTSPServer == 2)
                this.rtspServer = utils.spawn("v4l2rtspserver", ["-P", this.config.RTSPPort.toString(), "-u", this.config.RTSPName.toString(), "-W", this.settings.resolution.Width.toString(), "-H", this.settings.resolution.Height.toString(), "/dev/video5"]);
                this.rtspServer2 = utils.spawn("v4l2rtspserver", ["-P", this.config.RTSPPort2.toString(), "-u", this.config.RTSPName2.toString(), "-W", this.settings.resolution.Width.toString(), "-H", this.settings.resolution.Height.toString(), "/dev/video7"]);
            if (this.config.RTSPServer == 3)
                this.rtspServer = utils.spawn("./python/gst-rtsp-launch.sh", ["-P", this.config.RTSPPort.toString(), "-u", this.config.RTSPName.toString(), "-W", this.settings.resolution.Width.toString(), "-H", this.settings.resolution.Height.toString(), "-d", ((this.config.CameraType == 'picam') ? ('picam') : (this.config.CameraDevice))]);
        }
        if (this.rtspServer) {
            this.rtspServer.stdout.on('data', function (data) {
                return utils.log.debug("rtspServer: %s", data);
            });
            this.rtspServer.stderr.on('data', function (data) {
                return utils.log.error("rtspServer: %s", data);
            });
            this.rtspServer.on('error', function (err) {
                return utils.log.error("rtspServer error: %s", err);
            });
            this.rtspServer.on('exit', function (code, signal) {
                if (code)
                    utils.log.error("rtspServer exited with code: %s", code);
                else
                    utils.log.debug("rtspServer exited");
            });
        }
        if (this.rtspServer2) {
            this.rtspServer2.stdout.on('data', function (data) {
                return utils.log.debug("rtspServer: %s", data);
            });
            this.rtspServer2.stderr.on('data', function (data) {
                return utils.log.error("rtspServer: %s", data);
            });
            this.rtspServer2.on('error', function (err) {
                return utils.log.error("rtspServer error: %s", err);
            });
            this.rtspServer2.on('exit', function (code, signal) {
                if (code)
                    utils.log.error("rtspServer exited with code: %s", code);
                else
                    utils.log.debug("rtspServer exited");
            });
        }

    };


    Camera.prototype.stopRtsp = function () {
        if (this.rtspServer) {
            utils.log.info("Stopping Live555 rtsp server");
            this.rtspServer.kill();
            this.rtspServer = null;
            this.rtspServer2.kill();
            this.rtspServer2 = null;
        }
    };
    return Camera;
}());
module.exports = Camera;

//# sourceMappingURL=camera.js.map