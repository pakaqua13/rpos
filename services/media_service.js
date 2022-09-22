"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var updateJsonFile = require('update-json-file');
var configPath = './rposConfig.json';
var profilesPath = './profiles.json';
var fs = require("fs");
var SoapService = require('../lib/SoapService');
var utils_1 = require('../lib/utils');
var url = require('url');
var v4l2ctl_1 = require('../lib/v4l2ctl');
var child_process_1 = require('child_process');
// const { config } = require("process");
var utils = utils_1.Utils.utils;
var MediaService = (function (_super) {
    __extends(MediaService, _super);
    function MediaService(config, server, camera, ptz_service) {
        _super.call(this, config, server);
        this.ffmpeg_process = null;
        this.ffmpeg_responses = [];
        this.media_service = require('./stubs/media_service.js').MediaService;
        this.camera = camera;
        // setTimeout(this.camera.startSample, 5000)
        this.ptz_service = ptz_service;
        this.serviceOptions = {
            path: '/onvif/media_service',
            services: this.media_service,
            xml: fs.readFileSync('./wsdl/media_service.wsdl', 'utf8'),
            wsdlPath: 'wsdl/media_service.wsdl',
            onReady: function () {
                utils.log.info('media_service started');
            }
        };
        this.extendService();
    }
    MediaService.prototype.starting = function () {
        var _this = this;
        var listeners = this.webserver.listeners('request').slice();
        this.webserver.removeAllListeners('request');
        this.webserver.addListener('request', function (request, response, next) {
            utils.log.debug('web request received : %s', request.url);
            var uri = url.parse(request.url, true);
            var action = uri.pathname;
            if (action == '/web/snapshot.jpg') {
                if (_this.ffmpeg_process != null) {
                    utils.log.info("ffmpeg - already running");
                    _this.ffmpeg_responses.push(response);
                }
                else {
                    var cmd = "ffmpeg -fflags nobuffer -probesize 256 -rtsp_transport tcp -i rtsp://127.0.0.1:" + _this.config.RTSPPort + "/" + _this.config.RTSPName + " -vframes 1  -r 1 -s 640x480 -y /dev/shm/snapshot.jpg";
                    var options = { timeout: 15000 };
                    utils.log.info("ffmpeg - starting");
                    _this.ffmpeg_responses.push(response);
                    _this.ffmpeg_process = child_process_1.exec(cmd, options, function (error, stdout, stderr) {
                        utils.log.info("ffmpeg - finished");
                        if (error) {
                            utils.log.warn('ffmpeg exec error: %s', error);
                        }
                        _this.ffmpeg_responses.forEach(function (response) { _this.deliver_jpg(response); });
                        _this.ffmpeg_process = null;
                    });
                }
            }
            else {
                for (var i = 0, len = listeners.length; i < len; i++) {
                    listeners[i].call(_this, request, response, next);
                }
            }
        });
    };
    MediaService.prototype.deliver_jpg = function (response) {
        try {
            var img = fs.readFileSync('/dev/shm/snapshot.jpg');
            response.writeHead(200, { 'Content-Type': 'image/jpg' });
            response.end(img, 'binary');
        }
        catch (err) {
            utils.log.debug("Error opening snapshot : %s", err);
            var img = fs.readFileSync('web/snapshot.jpg');
            response.writeHead(200, { 'Content-Type': 'image/jpg' });
            response.end(img, 'binary');
        }
    };
    MediaService.prototype.started = function () {
        
        this.camera.startRtsp();
        // setTimeout(this.camera.startRtsp, 10000);
    };
    MediaService.prototype.extendService = function () {
        var _this = this;
        var port = this.media_service.MediaService.Media;
        var cameraOptions = this.camera.options;
        var cameraSettings = this.camera.settings;
        var camera = this.camera;
        var h264Profiles = v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_profile.getLookupSet().map(function (ls) { return ls.desc; });
        h264Profiles.splice(1, 1);
        var videoConfigurationOptions = {
            QualityRange: {
                Min: 1,
                Max: 1
            },
            H264: {
                ResolutionsAvailable: cameraOptions.resolutions,
                GovLengthRange: {
                    Min: v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_i_frame_period.getRange().min,
                    Max: v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_i_frame_period.getRange().max
                },
                FrameRateRange: {
                    Min: cameraOptions.framerates[0],
                    Max: cameraOptions.framerates[cameraOptions.framerates.length - 1]
                },
                EncodingIntervalRange: { Min: 1, Max: 1 },
                H264ProfilesSupported: h264Profiles
            },
            Extension: {
                H264: {
                    ResolutionsAvailable: cameraOptions.resolutions,
                    GovLengthRange: {
                        Min: v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_i_frame_period.getRange().min,
                        Max: v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_i_frame_period.getRange().max
                    },
                    FrameRateRange: {
                        Min: cameraOptions.framerates[0],
                        Max: cameraOptions.framerates[cameraOptions.framerates.length - 1]
                    },
                    EncodingIntervalRange: { Min: 1, Max: 1 },
                    H264ProfilesSupported: h264Profiles,
                    BitrateRange: {
                        Min: cameraOptions.bitrates[0],
                        Max: cameraOptions.bitrates[cameraOptions.bitrates.length - 1]
                    }
                }
            }
        };
        var videoEncoderConfiguration = {
            attributes: {
                token: "encoder_config_token"
            },
            Name: "PiCameraConfiguration",
            UseCount: 0,
            Encoding: "H264",
            Resolution: {
                Width: this.config.Width,
                Height: this.config.Height
            },
            Quality: v4l2ctl_1.v4l2ctl.Controls.CodecControls.video_bitrate.value ? 1 : 1,
            RateControl: {
                FrameRateLimit: this.config.fps,
                EncodingInterval: 1,
                BitrateLimit: v4l2ctl_1.v4l2ctl.Controls.CodecControls.video_bitrate.value / 1000
            },
            H264: {
                GovLength: v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_i_frame_period.value,
                H264Profile: v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_profile.desc
            },
            Multicast: {
                Address: {
                    Type: "IPv4",
                    IPv4Address: "0.0.0.0"
                },
                Port: 0,
                TTL: 1,
                AutoStart: false
            },
            SessionTimeout: "PT1000S"
        };

        var videoEncoderConfiguration_MJPEG = {
            attributes: {
                token: "encoder_config_token_MJPEG"
            },
            Name: "PiCameraConfiguration_MJPEG",
            UseCount: 0,
            Encoding: "JPEG",
            Resolution: {
                Width: this.config.Width,
                Height: this.config.Height
            },
            Quality: v4l2ctl_1.v4l2ctl.Controls.CodecControls.video_bitrate.value ? 1 : 1,
            RateControl: {
                FrameRateLimit: this.config.fps,
                EncodingInterval: 1,
                BitrateLimit: v4l2ctl_1.v4l2ctl.Controls.CodecControls.video_bitrate.value / 1000
            },
            H264: {
                GovLength: v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_i_frame_period.value,
                H264Profile: v4l2ctl_1.v4l2ctl.Controls.CodecControls.h264_profile.desc
            },
            Multicast: {
                Address: {
                    Type: "IPv4",
                    IPv4Address: "0.0.0.0"
                },
                Port: 0,
                TTL: 1,
                AutoStart: false
            },
            SessionTimeout: "PT1000S"
        };

        var videoSource = {
            attributes: {
                token: "video_src_token"
            },
            Framerate: 25,
            Resolution: { Width: 1920, Height: 1080 }
        };
        var videoSource_IR = {
            attributes: {
                token: "video_src_token_ir"
            },
            Framerate: 25,
            Resolution: { Width: 1920, Height: 1080 }
        };
        var videoSourceConfiguration = {
            Name: "Primary Source",
            UseCount: 0,
            attributes: {
                token: "video_src_config_token"
            },
            SourceToken: "video_src_token",
            Bounds: { attributes: { x: 0, y: 0, width: 1920, height: 1080 } }
        };
        var videoSourceConfiguration_IR = {
            Name: "Primary Source IR",
            UseCount: 0,
            attributes: {
                token: "video_src_config_token_ir"
            },
            SourceToken: "video_src_token_ir",
            Bounds: { attributes: { x: 0, y: 0, width: 1920, height: 1080 } }
        };
        var audioEncoderConfigurationOptions = {
            Options: []
        };
        // var profile = {
        //     Name: "CurrentProfile",
        //     attributes: {
        //         token: "profile_token"
        //     },
        //     VideoSourceConfiguration: videoSourceConfiguration,
        //     VideoEncoderConfiguration: videoEncoderConfiguration,
        //     PTZConfiguration: this.ptz_service.ptzConfiguration
        // };
        // var jsonData = JSON.stringify({profiles: [profile]});
        // fs.writeFile("profiles.json", jsonData, function(err) {
        //     if (err) {
        //         console.log(err);
        //     }
        // });
        // console.log(profile);
        var newprofile = {
            Name: "",
            attributes: {
                token: ""
            },
            VideoSourceConfiguration: "",
            VideoEncoderConfiguration:"",
            PTZConfiguration: ""
        };
        // var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
        // var profiles = profiles_tmp.profiles;
        // var profiles = [{
        //     Name: "CurrentProfile",
        //     attributes: {
        //         token: "profile_token"
        //     },
        //     VideoSourceConfiguration: videoSourceConfiguration,
        //     VideoEncoderConfiguration: videoEncoderConfiguration,
        //     PTZConfiguration: this.ptz_service.ptzConfiguration
        // }];
        var DeletionOfFixedProfile = {
            Fault: {
              Code: {
                Value: "env:Sender",
                Subcode: {
                    Value: "ter:Action",
                    Subcode: {
                        Value: "ter:DeletionOfFixedProfile"
                    }
                }
              },
              Reason: {
                Text: "The fixed Profile cannot be deleted."
              }
            }
        };

        port.GetServiceCapabilities = function (args) {
            var GetServiceCapabilitiesResponse = {
                Capabilities: {
                    attributes: {
                        SnapshotUri: true,
                        Rotation: false,
                        VideoSourceMode: true,
                        OSD: false
                    },
                    ProfileCapabilities: {
                        attributes: {
                            MaximumNumberOfProfiles: 1
                        }
                    },
                    StreamingCapabilities: {
                        attributes: {
                            RTPMulticast: _this.config.MulticastEnabled,
                            RTP_TCP: true,
                            RTP_RTSP_TCP: true,
                            NonAggregateControl: false,
                            NoRTSPStreaming: false
                        }
                    }
                }
            };
            return GetServiceCapabilitiesResponse;
        };
        port.GetStreamUri = function (args) {
            var rtspAddress = utils.getIpAddress();
            if (_this.config.RTSPAddress.length > 0)
                rtspAddress = _this.config.RTSPAddress;
            var GetStreamUriResponse = {
                MediaUri: {
                    Uri: (args.StreamSetup.Stream == "RTP-Multicast" && _this.config.MulticastEnabled ?
                        "rtsp://" + rtspAddress + ":" + _this.config.RTSPPort + "/" + _this.config.RTSPMulticastName :
                        "rtsp://" + rtspAddress + ":" + _this.config.RTSPPort + "/" + _this.config.RTSPName),
                    InvalidAfterConnect: false,
                    InvalidAfterReboot: false,
                    Timeout: "PT30S"
                }
            };
            return GetStreamUriResponse;
        };
        port.GetProfile = function (args) {
            var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
            var profiles = profiles_tmp.profiles;
            var profile
            // console.log(args);
            profiles.forEach(function (item, index, object) {
                // console.log(item);
                if (object[index].attributes.token === args.ProfileToken){
                    profile = object[index];
                }
            })
            var GetProfileResponse = { Profile: profile };
            return GetProfileResponse;
        };
        port.GetProfiles = function (args) {
            var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
            var profiles = profiles_tmp.profiles;
            var GetProfilesResponse = { Profiles: profiles };
            return GetProfilesResponse;
        };
        port.CreateProfile = function (args) {
            var CreateProfileResponse = { };
            var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
            var profiles = profiles_tmp.profiles;
            profiles.push(newprofile);
            profiles.forEach(function (item, index, object) {
                if (index === (profiles.length - 1)){
                    object[index].Name = args.Name
                    object[index].attributes.token = `profile_token_${index}`;
                    CreateProfileResponse = {
                        Profile: {
                            Name: args.Name,
                        attributes: {
                            token: `profile_token_${index}`
                        },
                        VideoSourceConfiguration: "",
                        VideoEncoderConfiguration:"",
                        PTZConfiguration: ""
                        }
                    };
                }
            })
            var jsonData = JSON.stringify({profiles: profiles});
            fs.writeFile("profiles.json", jsonData, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            
            return CreateProfileResponse;
        };
        port.DeleteProfile = function (args) {
            var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
            var profiles = profiles_tmp.profiles;
            profiles.forEach(function (item, index, object) {
                if (object[index].attributes.token === args.ProfileToken){
                    if(index === 0){
                        throw DeletionOfFixedProfile
                    }else{
                        object.splice(index,1);
                    }
                }
            });
            var jsonData = JSON.stringify({profiles: profiles});
            fs.writeFile("profiles.json", jsonData, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            var DeleteProfileResponse = {};
            return DeleteProfileResponse;
        };
        port.GetVideoSources = function (args) {
            var GetVideoSourcesResponse = { VideoSources: [videoSource] };
            // GetVideoSourcesResponse.VideoSources.push(videoSource_IR);
            return GetVideoSourcesResponse;
        };
        port.GetVideoSourceConfigurations = function (args) {
            var GetVideoSourceConfigurationsResponse = { Configurations: [videoSourceConfiguration] };
            GetVideoSourceConfigurationsResponse.Configurations.push(videoSourceConfiguration_IR)
            console.log(GetVideoSourceConfigurationsResponse);
            return GetVideoSourceConfigurationsResponse;
        };
        port.GetVideoSourceConfiguration = function (args) {
            var GetVideoSourceConfigurationResponse = {};
            var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
            var profiles = profiles_tmp.profiles;
            var profile
            // console.log(args);
            profiles.forEach(function (item, index, object) {
                // console.log(item);
                if (object[index].VideoSourceConfiguration.attributes.token === args.ConfigurationToken){
                    profile = object[index];
                    GetVideoSourceConfigurationResponse = { Configurations: object[index].videoSourceConfiguration }
                }
            })
            // var GetVideoSourceConfigurationResponse = { Configurations: videoSourceConfiguration };
            return GetVideoSourceConfigurationResponse;
        };
        port.GetVideoEncoderConfigurations = function (args) {
            var GetVideoEncoderConfigurationsResponse = { Configurations: [videoEncoderConfiguration] };
            // GetVideoEncoderConfigurationsResponse.Configurations.push(videoEncoderConfiguration_MJPEG)
            console.log(GetVideoEncoderConfigurationsResponse);
            return GetVideoEncoderConfigurationsResponse;
        };
        port.GetVideoEncoderConfiguration = function (args) {
            var GetVideoEncoderConfigurationResponse;
            if (args.ConfigurationToken === "encoder_config_token")
                GetVideoEncoderConfigurationResponse = { Configuration: videoEncoderConfiguration };
            else if(args.ConfigurationToken === "encoder_config_token_MJPEG")
                GetVideoEncoderConfigurationResponse = { Configuration: videoEncoderConfiguration_MJPEG };
            // GetVideoEncoderConfigurationResponse = { Configuration: videoEncoderConfiguration };
            return GetVideoEncoderConfigurationResponse;
        };
        port.AddVideoEncoderConfiguration = function(args /*수정 보완*/) {
            var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
            var profiles = profiles_tmp.profiles;
            // console.log(args);
            profiles.forEach(function (item, index, object) {
                // console.log(item);
                if (object[index].attributes.token === args.ProfileToken){
                    // args.ConfigurationToken
                    if(args.ConfigurationToken === "encoder_config_token")
                        object[index].VideoEncoderConfiguration = videoEncoderConfiguration;
                    else if(args.ConfigurationToken === "encoder_config_token_MJPEG")
                        object[index].VideoEncoderConfiguration = videoEncoderConfiguration_MJPEG;
                }
            })
            // console.log(profiles);
            var jsonData = JSON.stringify({profiles: profiles});
            fs.writeFile("profiles.json", jsonData, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            // if(args.ConfigurationToken === "encoder_config_token")
            //     profiles[1].VideoEncoderConfiguration = videoEncoderConfiguration;
            // else if(args.ConfigurationToken === "encoder_config_token_MJPEG")
            //     profiles[1].VideoEncoderConfiguration = videoEncoderConfiguration_MJPEG;
            // throw NOT_IMPLEMENTED;
            var AddVideoEncoderConfigurationResponse = { };
            return AddVideoEncoderConfigurationResponse;
        };
        port.RemoveVideoEncoderConfiguration = function(args /*수정 보완*/) {
            // throw NOT_IMPLEMENTED;
            var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
            var profiles = profiles_tmp.profiles;
            // console.log(args);
            profiles.forEach(function (item, index, object) {
                // console.log(item);
                if (object[index].attributes.token === args.ProfileToken){
                    object[index].VideoEncoderConfiguration = "";
                }
            })
            // console.log(profiles);
            var jsonData = JSON.stringify({profiles: profiles});
            fs.writeFile("profiles.json", jsonData, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            var RemoveVideoEncoderConfigurationResponse = { };
            return RemoveVideoEncoderConfigurationResponse;
        };
        port.SetVideoEncoderConfiguration = function (args) {
            var settings = {
                bitrate: args.Configuration.RateControl.BitrateLimit,
                framerate: args.Configuration.RateControl.FrameRateLimit,
                gop: args.Configuration.H264.GovLength,
                profile: args.Configuration.H264.H264Profile,
                quality: args.Configuration.Quality instanceof Object ? 1 : args.Configuration.Quality,
                resolution: args.Configuration.Resolution
            };
            
            videoEncoderConfiguration.Resolution.Width = args.Configuration.Resolution.Width;
            videoEncoderConfiguration.Resolution.Height = args.Configuration.Resolution.Height;
            videoEncoderConfiguration.RateControl.FrameRateLimit = args.Configuration.RateControl.FrameRateLimit;
            
            updateJsonFile(profilesPath, (config) => {
                config.profiles[0].VideoEncoderConfiguration.Resolution.Width = args.Configuration.Resolution.Width;
                config.profiles[0].VideoEncoderConfiguration.Resolution.Height = args.Configuration.Resolution.Height;
                config.profiles[0].VideoEncoderConfiguration.RateControl.FrameRateLimit = args.Configuration.RateControl.FrameRateLimit;
                return config;
            });
            // console.log("media_service" + settings.resolution.Width + settings.resolution.Height);

            camera.setSettings(settings);
            
            var SetVideoEncoderConfigurationResponse = {};
            return SetVideoEncoderConfigurationResponse;
        };
        port.GetCompatibleVideoEncoderConfigurations = function(args /*수정 보완*/) {
            // throw NOT_IMPLEMENTED;
            var GetCompatibleVideoEncoderConfigurationsResponse = { Configurations: [videoEncoderConfiguration] };
            GetCompatibleVideoEncoderConfigurationsResponse.Configurations.push(videoEncoderConfiguration_MJPEG)
            return GetCompatibleVideoEncoderConfigurationsResponse;
        };
        port.GetVideoEncoderConfigurationOptions = function (args) {
            var GetVideoEncoderConfigurationOptionsResponse = { Options: videoConfigurationOptions };
            return GetVideoEncoderConfigurationOptionsResponse;
        };
        port.GetGuaranteedNumberOfVideoEncoderInstances = function (args) {
            var GetGuaranteedNumberOfVideoEncoderInstancesResponse = {
                TotalNumber: 1,
                H264: 1
            };
            return GetGuaranteedNumberOfVideoEncoderInstancesResponse;
        };
        port.GetSnapshotUri = function (args) {
            var GetSnapshotUriResponse = {
                MediaUri: {
                    Uri: "http://" + utils.getIpAddress() + ":" + _this.config.ServicePort + "/web/snapshot.jpg",
                    InvalidAfterConnect: false,
                    InvalidAfterReboot: false,
                    Timeout: "PT30S"
                }
            };
            return GetSnapshotUriResponse;
        };
        port.GetAudioEncoderConfigurationOptions = function (args) {
            var GetAudioEncoderConfigurationOptionsResponse = { Options: [{}] };
            return GetAudioEncoderConfigurationOptionsResponse;
        };
        port.AddVideoSourceConfiguration = function(args) {
            // throw NOT_IMPLEMENTED;
            var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
            var profiles = profiles_tmp.profiles;
            // console.log(args);
            profiles.forEach(function (item, index, object) {
                // console.log(item);
                if (object[index].attributes.token === args.ProfileToken){
                    // args.ConfigurationToken
                    if (args.ConfigurationToken === 'video_src_config_token') {
                        object[index].VideoSourceConfiguration = videoSourceConfiguration;
                    } else if (args.ConfigurationToken === 'video_src_config_token_ir') {
                        object[index].VideoSourceConfiguration = videoSourceConfiguration_IR;
                    }
                }
            })
            // console.log(profiles);
            var jsonData = JSON.stringify({profiles: profiles});
            fs.writeFile("profiles.json", jsonData, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            // if (args.ConfigurationToken === 'video_src_config_token')
            //     profiles[1].VideoSourceConfiguration = videoSourceConfiguration;
            var AddVideoSourceConfigurationResponse = { };
            return AddVideoSourceConfigurationResponse;
        };
        port.RemoveVideoSourceConfiguration = function(args /*, cb, headers*/) {
            // throw NOT_IMPLEMENTED;
            var profiles_tmp = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
            var profiles = profiles_tmp.profiles;
            // console.log(args);
            profiles.forEach(function (item, index, object) {
                // console.log(item);
                if (object[index].attributes.token === args.ProfileToken){
                    object[index].VideoSourceConfiguration = "";
                }
            })
            // console.log(profiles);
            var jsonData = JSON.stringify({profiles: profiles});
            fs.writeFile("profiles.json", jsonData, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            var RemoveVideoSourceConfigurationResponse = { };
            return RemoveVideoSourceConfigurationResponse;
        };
        port.SetVideoSourceConfiguration = function(args /*, cb, headers*/) {
            // throw NOT_IMPLEMENTED;
            console.log(args);
            var SetVideoSourceConfigurationResponse = { };
            return SetVideoSourceConfigurationResponse;
        };
        port.GetCompatibleVideoSourceConfigurations = function(args /*, cb, headers*/) {
            // throw NOT_IMPLEMENTED;
            var GetCompatibleVideoSourceConfigurationsResponse = { Configurations: [videoSourceConfiguration] };
            GetCompatibleVideoSourceConfigurationsResponse.Configurations.push(videoSourceConfiguration_IR)
            return GetCompatibleVideoSourceConfigurationsResponse;
        };
        port.GetVideoSourceConfigurationOptions = function(args /*, cb, headers*/) {
            // throw NOT_IMPLEMENTED;
            var GetVideoSourceConfigurationOptionsResponse = { Options: [videoSourceConfiguration]}
            GetVideoSourceConfigurationOptionsResponse.Options.push(videoSourceConfiguration_IR)
            return GetVideoSourceConfigurationOptionsResponse;
        };
        port.GetCompatibleAudioEncoderConfigurations = function(args /*오디오 X*/) {
            var GetCompatibleAudioEncoderConfigurationsResponse = { };
            return GetCompatibleAudioEncoderConfigurationsResponse;
        };
        port.GetCompatibleMetadataConfigurations = function(args /* Metadata */) {
            // throw NOT_IMPLEMENTED;
            var GetCompatibleMetadataConfigurationsResponse = { };
              //Configurations : [{ 
                //attributes : {
                  //token : {tt:ReferenceToken}
                //},
                //Name : { xs:string},
                //UseCount : { xs:int}
              //
                //attributes : {
                  //CompressionType : {xs:string}
                //},
                //PTZStatus : { 
                  //Status : { xs:boolean},
                  //Position : { xs:boolean}
                //},
                //Events : { 
                  //Filter : { wsnt:FilterType},
                  //SubscriptionPolicy : { }
                //},
                //Analytics : { xs:boolean},
                //Multicast : { 
                  //Address : { 
                    //Type : { xs:string},
                    //IPv4Address : { xs:token},
                    //IPv6Address : { xs:token}
                  //},
                  //Port : { xs:int},
                  //TTL : { xs:int},
                  //AutoStart : { xs:boolean}
                //},
                //SessionTimeout : { xs:duration},
                //AnalyticsEngineConfiguration : { 
                  //AnalyticsModule : [{ 
                    //attributes : {
                      //Name : {xs:string},
                      //Type : {xs:QName}
                    //},
                    //Parameters : { 
                      //SimpleItem : [{ }],
                      //ElementItem : [{ }],
                      //Extension : { }
                    //}
                  //}],
                  //Extension : { }
                //},
                //Extension : { }
              //}]
            //
            //};
            return GetCompatibleMetadataConfigurationsResponse;
        };
    };
    return MediaService;
}(SoapService));
module.exports = MediaService;

//# sourceMappingURL=media_service.js.map
