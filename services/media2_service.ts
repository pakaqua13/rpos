///<reference path="../rpos.d.ts" />

import fs = require("fs");
import util = require("util");
import SoapService = require('../lib/SoapService');
import { Utils }  from '../lib/utils';
import url = require('url');
import { Server } from 'http';
import Camera = require('../lib/camera');
import { v4l2ctl } from '../lib/v4l2ctl';
import { exec } from 'child_process';
import PTZService = require('./ptz_service');
import MediaService = require("./media_service");
var utils = Utils.utils;

class Media2Service extends MediaService {
  media_service: any;
  camera: Camera;
  ptz_service: PTZService;
  ffmpeg_process: any = null;
  ffmpeg_responses: any[] = [];

  constructor(config: rposConfig, server: Server, camera: Camera, ptz_service: PTZService) {
    super(config, server,camera, ptz_service);

  }

  //Init called from parent constructor
  init(config: rposConfig, server: Server, camera: Camera, ptz_service: PTZService) {
    console.log("----- Media2 creation")
    this.media_service = require('./stubs/media2_service.js').Media2Service;

    this.camera = camera;
    this.ptz_service = ptz_service;
    this.serviceOptions = {
      path: '/onvif/media2_service',
      services: this.media_service,
      xml: fs.readFileSync('./wsdl/media2_service.wsdl', 'utf8'),
      wsdlPath: 'wsdl/media2_service.wsdl',
      onReady: function() {
        utils.log.info('media2_service started');
      }
    };
    this.extendService();
  }

  started() {
    //Override started to avoid starting rtsp twice
  }

  getPort() {
    return this.media_service.Media2Service.Media2;
  }

  extendService() {
    console.log("Media2 extends");
    super.extendService();
    var port = this.getPort();

    var videoSource = {
      attributes: {
        token: "video_cfg_src_token",
        ViewMode: "Original"
      },
      Name: "PrimVideoSource",
      UseCount: 1,
      SourceToken : "video_src_token",
      Bounds : {
        x : 0,
        y : 0,
        width : 1280,
        height : 720
      }
    };

    var audioSource = {
      attributes: {
        token: "audio_cfg_src_token"
      },
      Name: "PrimAudioSource",
      UseCount: 1,
      SourceToken : "audio_src_token"
    };

    var videoEncoder = {
      attributes: {
        token: "video_enc_token",
        GovLength: 10, //TODO Set from config
        Profile: 4, //TODO Set from config
        GuaranteedFrameRate: "true"
      },
      Name: "PrimVideoEnc",
      UseCount: 1,
      Encoding: "H264", //TODO From config to support mjpeg
      Resolution: {
        Width: 1280,
        Height: 720
      },
      Quality: 100
    };

    var audioEncoder = {
      attributes: {
        token: "audio_enc_token",
      },
      Name: "PrimAudioEnc",
      UseCount: 1,
      Encoding: "PCMU",
      Bitrate: 8000,
      SampleRate: 48000
    };

    var audioOutput = {
      attributes: {
        token: "audio_out_token",
      },
      Name: "PrimAudioOut",
      UseCount: 1,
      OutputToken: "audio_output_token",
      //SendPrimacy: "", //TODO Figure this one out
      OutputLevel: "100"
    };

    var audioDecoder = {
      attributes: {
        token: "audio_dec_token",
      },
      Name: "PrimAudioDec",
      UseCount: 1
    };

    var profile = {
      Name: "CurrentProfile",
      attributes: {
        token: "profile_token",
        fixed: "true"
      },
      Configurations : {
        VideoSource: videoSource,
        AudioSource: audioSource,
        VideoEncoder: videoEncoder,
        AudioEncoder: audioEncoder,
        //Analytics
        //PTZ : this.ptz_service.ptzConfiguration,
        //Metadata
        AudioOutput: audioOutput,
        AudioDecoder : audioDecoder,
        //Receiver
      }
    };


    port.GetProfiles = (args) => {
      utils.log.debug('\tGetting Profiles : ' + JSON.stringify(args));
      var GetProfilesResponse = { Profiles: [profile] };
      //console.log('\tReturn : ' + JSON.stringify(GetProfilesResponse));
      return GetProfilesResponse;
    };
    
    port.GetStreamUri = (args /*, cb, headers*/) => {
      console.log("\tGetStreamUri : " + JSON.stringify(args));
      // Usually RTSP server is on same IP Address as the ONVIF Service
      // Setting RTSPAddress in the config file lets you to use another IP Address
      let rtspAddress = utils.getIpAddress();
      if (this.config.RTSPAddress.length > 0) {rtspAddress = this.config.RTSPAddress};

      var GetStreamUriResponse;
      if(args.StreamSetup != null){
        GetStreamUriResponse = {
          Uri : (args.StreamSetup.Stream == "RTP-Multicast" && this.config.MulticastEnabled ? 
          `rtsp://${rtspAddress}:${this.config.RTSPPort}/${this.config.RTSPMulticastName}` :
          `rtsp://${rtspAddress}:${this.config.RTSPPort}/${this.config.RTSPName}`)
        }
      } else {
        GetStreamUriResponse = {
          Uri: `rtsp://${rtspAddress}:${this.config.RTSPPort}/${this.config.RTSPName}`
        };
      }
      console.log("\tResponse : " + JSON.stringify(GetStreamUriResponse));
      return GetStreamUriResponse;
    };

    port.GetSnapshotUri = (args) => {
      console.log("GetSnapshotUri : " + JSON.stringify(args));
      var GetSnapshotUriResponse = {
        Uri : "http://" + utils.getIpAddress() + ":" + this.config.ServicePort + "/web/snapshot.jpg"
      };
      console.log("Return : " + JSON.stringify(GetSnapshotUriResponse));
      return GetSnapshotUriResponse;
    };
    
    port.GetAudioDecoderConfigurationOptions = (args) => {
      console.log('\tGetAudioDecoderConfigurationOptions : ' + JSON.stringify(args));
      var GetAudioDecoderConfigurationOptionsResponse = { Options: [audioEncoder]};
      console.log('\tReturn : ' + JSON.stringify(GetAudioDecoderConfigurationOptionsResponse));
      return GetAudioDecoderConfigurationOptionsResponse;
    }
  }
}
export = Media2Service;

