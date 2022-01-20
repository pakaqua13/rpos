// var SerialPort = require('serialport');
// var uart = new SerialPort('/dev/ttyS0', {
//     baudRate: 38400,
//     dataBits: 8,
//     parity: 'none',
//     stopBits: 1,
//     encoding: 'hex'
// });
var fs = require('fs');

module.exports = {
    writeBuffer: function (uart, command, data) {

        var buffer = new Buffer.alloc(7);
        
        // fixed
        buffer[0] = 0xff;
        buffer[1] = 0x00;

        if (command == 'agcControl') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x0a;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'inverseControl') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x0c;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'mgcContrast') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x1e;
            // Data
            var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
            var tmpBuffer = Buffer.from(hex, 'hex');
            buffer[4] = tmpBuffer[0];
            buffer[5] = tmpBuffer[1];
        } else if (command == 'mgcBrightness') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x20;
            // Data
            var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
            var tmpBuffer = Buffer.from(hex, 'hex');
            buffer[4] = tmpBuffer[0];
            buffer[5] = tmpBuffer[1];
        } else if (command == 'edgeEnhanceMode') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x14;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'edgeEnhanceLevel') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x16;
            // Data
            var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
            var tmpBuffer = Buffer.from(hex, 'hex');
            buffer[4] = tmpBuffer[0];
            buffer[5] = tmpBuffer[1];
        } else if (command == 'saveSetting') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x30;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'shutter') { /* 체크 */
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x28;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = 0x02;
        } else if (command == 'flipMirror') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x34;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'limitGain') { /* 체크 */
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x38;
            // Data  
            // buffer[4] = 0x00;
            // buffer[5] = Number(data);
        } else if (command == 'shutterMode') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x3a;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'shutterTime') { /* 체크 */
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x3c;
            // Data
            var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
            var tmpBuffer = Buffer.from(hex, 'hex');
            buffer[4] = tmpBuffer[0];
            buffer[5] = tmpBuffer[1];
        } else if (command == 'shutterTemp') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x3e;
            // Data
            var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
            var tmpBuffer = Buffer.from(hex, 'hex');
            buffer[4] = tmpBuffer[0];
            buffer[5] = tmpBuffer[1];
        } else if (command == 'gammaCorrection') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x44;
            // Data
            var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
            var tmpBuffer = Buffer.from(hex, 'hex');
            buffer[4] = tmpBuffer[0];
            buffer[5] = tmpBuffer[1];
        } else if (command == 'tempCommand') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x46;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'tempData') { /* 체크 */
            // Address
            // buffer[2] = 0x00;
            // buffer[3] = 0x48;
            // Data  
            // buffer[4] = 0x00;
            // buffer[5] = Number(data);
        } else if (command == 'deNoiseFilter') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x50;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'imageEnhancement') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x52;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'rawDataControl') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x54;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'deadUpdate') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x56;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'setOutputData') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0x5e;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        } else if (command == 'engineInformationRequest') {
            // Address
            buffer[2] = 0x00;
            buffer[3] = 0xfb;
            // Data  
            buffer[4] = 0x00;
            buffer[5] = Number(data);
        }
        // Checksum
        buffer[6] = buffer[1] + buffer[2] + buffer[3] + buffer[4] + buffer[5];
        // UART Transmission
        uart.write(buffer, function (err) {
            // console.log(buffer);
            if (err) {
                return console.log('Error on write: ', err.message)
            }
            // console.log('tx: message')
        })
        
        return console.log('txData: ', buffer);
    },
    readAck: function (uart, buffer) {
        var checksum = new Buffer.alloc(1);
        var command;
        var result;
        // console.log("rxData: ", buffer);
        checksum = buffer[1] + buffer[2] + buffer[3] + buffer[4] + buffer[5];
        if (checksum !== buffer[6]) {
            return "checksumError"
        } else {
            if (buffer[1] === 0x01) {
                console.log('ACK')
                return "ACK"
                // return console.log('ACK')  
            } else {
                var command_tmp = JSON.parse(fs.readFileSync('command.json', 'utf-8'));
                var commandname = command_tmp.command;
                if (buffer[3] == 0x0a){
                    // command = "agcControl";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.agcControl;
                } else if (buffer[3] == 0x0c){
                    // command = "inverseControl";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.inverseControl;
                } else if (buffer[3] == 0x1e){
                    // command = "mgcContrast";
                    var hex = ('0000' + Number(command.mgcContrast).toString(16).toUpperCase()).slice(-4);
                    var tmpBuffer = Buffer.from(hex, 'hex');
                    buffer[4] = tmpBuffer[0];
                    buffer[5] = tmpBuffer[1];
                } else if (buffer[3] == 0x20){
                    // command = "mgcBrightness";
                    var hex = ('0000' + Number(command.mgcBrightness).toString(16).toUpperCase()).slice(-4);
                    var tmpBuffer = Buffer.from(hex, 'hex');
                    buffer[4] = tmpBuffer[0];
                    buffer[5] = tmpBuffer[1];
                } else if (buffer[3] == 0x14){
                    // command = "edgeEnhanceMode";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.edgeEnhanceMode;
                } else if (buffer[3] == 0x16){
                    // command = "edgeEnhanceLevel";
                    var hex = ('0000' + Number(command.edgeEnhanceLevel).toString(16).toUpperCase()).slice(-4);
                    var tmpBuffer = Buffer.from(hex, 'hex');
                    buffer[4] = tmpBuffer[0];
                    buffer[5] = tmpBuffer[1];
                } else if (buffer[3] == 0x30){
                    // command = "saveSetting";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.saveSetting;
                } else if (buffer[3] == 0x28){
                    // command = "shutter";
                    buffer[4] = 0x00;
                    buffer[5] = 0x02;
                } else if (buffer[3] == 0x34){
                    // command = "flipMirror";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.flipMirror;
                } else if (buffer[3] == 0x38){ /* 체크 */
                    // command = "limitGain";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.limitGain;
                } else if (buffer[3] == 0x3a){
                    // command = "shutterMode";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.shutterMode;
                } else if (buffer[3] == 0x3c){ /* 체크 */
                    // command = "shutterTime";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.shutterTime;
                } else if (buffer[3] == 0x3e){ /* 체크 */
                    // command = "shutterTemp";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.shutterTemp;
                } else if (buffer[3] == 0x44){ /* 체크 */
                    // command = "gammaCorrection";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.gammaCorrection;
                } else if (buffer[3] == 0x46){
                    // command = "tempCommand";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.tempCommand;
                } else if (buffer[3] == 0x48){ /* 체크 */
                    // command = "tempData";
                } else if (buffer[3] == 0x4a){  /* 체크 */
                    // command = "tempData";
                } else if (buffer[3] == 0x50){
                    // command = "deNoiseFilter";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.deNoiseFilter;
                } else if (buffer[3] == 0x52){
                    // command = "imageEnhancement";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.imageEnhancement;
                } else if (buffer[3] == 0x54){
                    // command = "rawDataControl";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.rawDataControl;
                } else if (buffer[3] == 0x56){
                    // command = "deadUpdate";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.deadUpdate;
                } else if (buffer[3] == 0x5e){
                    // command = "setOutputData";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.setOutputData;
                } else if (buffer[3] == 0xfb){
                    // command = "engineInformationRequest";
                    buffer[4] = 0x00;
                    buffer[5] = commandname.engineInformationRequest;
                }    
            }
            // Checksum
            buffer[0] = 0xff;
            buffer[1] = 0x00;
            buffer[6] = buffer[1] + buffer[2] + buffer[3] + buffer[4] + buffer[5];
            // console.log(buffer);
            // UART Transmission
            uart.write(buffer, function (err) {
                // console.log(buffer);
                if (err) {
                    return console.log('Error on write: ', err.message)
                }
                // console.log('NAK: retransmission');
            })
            return "NAK"
            // return console.log('NAK: retransmission');
        }
    }
    // uartComm: function (uart, command, data) {
    //     var buffer = new Buffer.alloc(7);
        
    //     // fixed
    //     buffer[0] = 0xff;
    //     buffer[1] = 0x00;

    //     if (command == 'agcControl') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x0a;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'inverseControl') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x0c;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'mgcContrast') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x1e;
    //         // Data
    //         var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
    //         var tmpBuffer = Buffer.from(hex, 'hex');
    //         buffer[4] = tmpBuffer[0];
    //         buffer[5] = tmpBuffer[1];
    //     } else if (command == 'mgcBrightness') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x20;
    //         // Data
    //         var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
    //         var tmpBuffer = Buffer.from(hex, 'hex');
    //         buffer[4] = tmpBuffer[0];
    //         buffer[5] = tmpBuffer[1];
    //     } else if (command == 'edgeEnhanceMode') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x14;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'edgeEnhanceLevel') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x16;
    //         // Data
    //         var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
    //         var tmpBuffer = Buffer.from(hex, 'hex');
    //         buffer[4] = tmpBuffer[0];
    //         buffer[5] = tmpBuffer[1];
    //     } else if (command == 'saveSetting') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x30;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'shutter') { /* 체크 */
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x28;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = 0x02;
    //     } else if (command == 'flipMirror') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x34;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'limitGain') { /* 체크 */
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x38;
    //         // Data  
    //         // buffer[4] = 0x00;
    //         // buffer[5] = Number(data);
    //     } else if (command == 'shutterMode') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x3a;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'shutterTime') { /* 체크 */
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x3c;
    //         // Data
    //         var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
    //         var tmpBuffer = Buffer.from(hex, 'hex');
    //         buffer[4] = tmpBuffer[0];
    //         buffer[5] = tmpBuffer[1];
    //     } else if (command == 'shutterTemp') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x3e;
    //         // Data
    //         var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
    //         var tmpBuffer = Buffer.from(hex, 'hex');
    //         buffer[4] = tmpBuffer[0];
    //         buffer[5] = tmpBuffer[1];
    //     } else if (command == 'gammaCorrection') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x44;
    //         // Data
    //         var hex = ('0000' + Number(data).toString(16).toUpperCase()).slice(-4);
    //         var tmpBuffer = Buffer.from(hex, 'hex');
    //         buffer[4] = tmpBuffer[0];
    //         buffer[5] = tmpBuffer[1];
    //     } else if (command == 'tempCommand') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x46;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'tempData') { /* 체크 */
    //         // Address
    //         // buffer[2] = 0x00;
    //         // buffer[3] = 0x48;
    //         // Data  
    //         // buffer[4] = 0x00;
    //         // buffer[5] = Number(data);
    //     } else if (command == 'deNoiseFilter') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x50;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'imageEnhancement') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x52;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'rawDataControl') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x54;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'deadUpdate') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x56;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'setOutputData') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0x5e;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     } else if (command == 'engineInformationRequest') {
    //         // Address
    //         buffer[2] = 0x00;
    //         buffer[3] = 0xfb;
    //         // Data  
    //         buffer[4] = 0x00;
    //         buffer[5] = Number(data);
    //     }
    //     // Checksum
    //     buffer[6] = buffer[1] + buffer[2] + buffer[3] + buffer[4] + buffer[5];
    //     // UART Transmission
    //     uart.write(buffer, function (err) {
    //         console.log("tx: ", buffer);
    //         if (err) {
    //             return console.log('Error on write: ', err.message)
    //         }
    //         var readPorts = uart.pipe(new ByteLength({length: 7}));

    //         readPorts.on('data', function (rxBuffer) {
    //             console.log('rx: ', rxBuffer);
    //             var checksum = new Buffer.alloc(1);
    //             var command;
    //             checksum = rxBuffer[1] + rxBuffer[2] + rxBuffer[3] + rxBuffer[4] + rxBuffer[5];
    //             if (checksum !== buffer[6]) {
    //                 return console.log('checksum error')
    //             } else {
    //                 if (rxBuffer[1] === 0x01) {
    //                     return console.log('ACK')  
    //                 } else {
    //                     var command_tmp = JSON.parse(fs.readFileSync('command.json', 'utf-8'));
    //                     var commandname = command_tmp.command;
    //                     if (rxBuffer[3] == 0x0a){
    //                         // command = "agcControl";
    //                         rxBuffer[4] = 0x00;
    //                         rxBuffer[5] = commandname.agcControl;
    //                     } else if (rxBuffer[3] == 0x0c){
    //                         // command = "inverseControl";
    //                         rxBuffer[4] = 0x00;
    //                         rxBuffer[5] = commandname.inverseControl;
    //                     } else if (rxBuffer[3] == 0x1e){
    //                         // command = "mgcContrast";
    //                         var hex = ('0000' + Number(command.mgcContrast).toString(16).toUpperCase()).slice(-4);
    //                         var tmpBuffer = Buffer.from(hex, 'hex');
    //                         buffer[4] = tmpBuffer[0];
    //                         buffer[5] = tmpBuffer[1];
    //                     } else if (buffer[3] == 0x20){
    //                         // command = "mgcBrightness";
    //                         var hex = ('0000' + Number(command.mgcBrightness).toString(16).toUpperCase()).slice(-4);
    //                         var tmpBuffer = Buffer.from(hex, 'hex');
    //                         buffer[4] = tmpBuffer[0];
    //                         buffer[5] = tmpBuffer[1];
    //                     } else if (buffer[3] == 0x14){
    //                         // command = "edgeEnhanceMode";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.edgeEnhanceMode;
    //                     } else if (buffer[3] == 0x16){
    //                         // command = "edgeEnhanceLevel";
    //                         var hex = ('0000' + Number(command.edgeEnhanceLevel).toString(16).toUpperCase()).slice(-4);
    //                         var tmpBuffer = Buffer.from(hex, 'hex');
    //                         buffer[4] = tmpBuffer[0];
    //                         buffer[5] = tmpBuffer[1];
    //                     } else if (buffer[3] == 0x30){
    //                         // command = "saveSetting";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.saveSetting;
    //                     } else if (buffer[3] == 0x28){
    //                         // command = "shutter";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = 0x02;
    //                     } else if (buffer[3] == 0x34){
    //                         // command = "flipMirror";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.flipMirror;
    //                     } else if (buffer[3] == 0x38){ /* 체크 */
    //                         // command = "limitGain";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.limitGain;
    //                     } else if (buffer[3] == 0x3a){
    //                         // command = "shutterMode";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.shutterMode;
    //                     } else if (buffer[3] == 0x3c){ /* 체크 */
    //                         // command = "shutterTime";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.shutterTime;
    //                     } else if (buffer[3] == 0x3e){ /* 체크 */
    //                         // command = "shutterTemp";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.shutterTemp;
    //                     } else if (buffer[3] == 0x44){ /* 체크 */
    //                         // command = "gammaCorrection";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.gammaCorrection;
    //                     } else if (buffer[3] == 0x46){
    //                         // command = "tempCommand";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.tempCommand;
    //                     } else if (buffer[3] == 0x48){ /* 체크 */
    //                         // command = "tempData";
    //                     } else if (buffer[3] == 0x4a){  /* 체크 */
    //                         // command = "tempData";
    //                     } else if (buffer[3] == 0x50){
    //                         // command = "deNoiseFilter";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.deNoiseFilter;
    //                     } else if (buffer[3] == 0x52){
    //                         // command = "imageEnhancement";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.imageEnhancement;
    //                     } else if (buffer[3] == 0x54){
    //                         // command = "rawDataControl";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.rawDataControl;
    //                     } else if (buffer[3] == 0x56){
    //                         // command = "deadUpdate";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.deadUpdate;
    //                     } else if (buffer[3] == 0x5e){
    //                         // command = "setOutputData";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.setOutputData;
    //                     } else if (buffer[3] == 0xfb){
    //                         // command = "engineInformationRequest";
    //                         buffer[4] = 0x00;
    //                         buffer[5] = commandname.engineInformationRequest;
    //                     }    
    //                 }
    //                 // Checksum
    //                 buffer[0] = 0xff;
    //                 buffer[1] = 0x00;
    //                 buffer[6] = buffer[1] + buffer[2] + buffer[3] + buffer[4] + buffer[5];
    //                 // console.log(buffer);
    //                 // UART Transmission
    //                 uart.write(buffer, function (err) {
    //                     // console.log(buffer);
    //                     if (err) {
    //                         return console.log('Error on write: ', err.message)
    //                     }
    //                     // console.log('NAK: retransmission');
    //                 })
    //                 console.log("txData", buffer);
    //                 return console.log('NAK: retransmission');
    //             }

                
    //         });
    //     })

    //     return console.log("success");
    // }

}

// agcControl
// inverseControl
// mgcContrast
// mgcBrightness
// edgeEnhanceMode
// edgeEnhanceLevel
// saveSetting
// shutter
// flipMirror
// limitGain
// shutterMode
// shutterTime
// shutterTemp
// gammaCorrection
// tempCommand
// tempData
// deNoiseFilter
// imageEnhancement
// rawDataControl
// deadUpdate
// setOutputData
// engineInformationRequest