// library
var fs = require('fs');

// video resolution and IN&OUT
const VIDEO_IN = "/dev/video0";
const VIDEO_OUT = "/dev/video4";

const WIDTH = 640;
const HEIGHT = 480;

var fo = fs.open(VIDEO_OUT, 'r', function(err, fd){
    if (err) {
        return console.log('Error on write: ', err)
    }
    // if (fd) {
    //     return console.log('Error on write: ', fd)
    // }
})