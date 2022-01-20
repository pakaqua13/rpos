#include <stdio.h>
#include <fcntl.h>
#include <errno.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <linux/videodev2.h>
#include <opencv2/opencv.hpp>


#define VIDEO_OUT "/dev/video4" 
#define VIDEO_IN  "/dev/video0" 

#define WIDTH  640
#define HEIGHT 480


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
            printf ( "Unable to get video format data. Errro: %d\n", errno );

        vid_format.fmt.pix.width       = cap.get ( CV_CAP_PROP_FRAME_WIDTH  );
        vid_format.fmt.pix.height      = cap.get ( CV_CAP_PROP_FRAME_HEIGHT );
        vid_format.fmt.pix.pixelformat = V4L2_PIX_FMT_RGB24;
        vid_format.fmt.pix.sizeimage   = framesize;
        vid_format.fmt.pix.field       = V4L2_FIELD_NONE;

        if ( ioctl ( fd, VIDIOC_S_FMT, &vid_format ) == -1 )
            printf ( "Unable to set video format! Errno: %d\n", errno );

        cv::Mat frame ( cap.get(CV_CAP_PROP_FRAME_HEIGHT), 
        cap.get(CV_CAP_PROP_FRAME_WIDTH), CV_8UC3 );
        cv::Mat frameROI;
        cv::Mat thermal = cv::imread("thermal.png", 0);
        printf ( "Please open the virtual video device (/dev/video<x>) e.g. with VLC\n" );

        while (1) {
            cap >> frame;
            // cv::cvtColor ( frame, frame, cv::COLOR_BGR2RGB ); // Webcams sometimes deliver video in BGR not RGB. so we need to convert
            //    cv::cvtColor ( frame, frame, cv::COLOR_RGB2GRAY );
            frame = thermal;
            // frameROI = frame.clone();
            cv::cvtColor ( frame, frame, cv::COLOR_GRAY2RGB );
            frameROI = frame.clone();
            cv::cvtColor ( frame, frame, cv::COLOR_RGB2GRAY );
            // cv::applyColorMap(frame, frame, cv::COLORMAP_JET);
            // // 특정 픽셀 >>
            cv::Rect roi(100, 100, 300, 300);
            for (int y = 0; y < frame.rows; y++) { 
                for (int x = 0; x < frame.cols; x++) { 
                    if (frame.at<uchar>(y, x) > 100) { 
                        frameROI.at<cv::Vec3b>(y, x)[0] = 0;
                        frameROI.at<cv::Vec3b>(y, x)[1] = 0;  
                        frameROI.at<cv::Vec3b>(y, x)[2] = frame.at<uchar>(y, x); 
                    } 
                }
            }
            double minVal; 
            double maxVal; 
            cv::Point minLoc; 
            cv::Point maxLoc;

            minMaxLoc( frame(roi), &minVal, &maxVal, &minLoc, &maxLoc );
            auto minstr = std::to_string(minVal); 
            auto maxstr = std::to_string(maxVal);
            // cv::cvtColor ( frame, frame, cv::COLOR_GRAY2RGB );
            
            // cv::applyColorMap(frame, frame, cv::COLORMAP_JET);
            frameROI(roi).copyTo(frame(roi));
            cv::rectangle(frame, cv::Point(100, 100), cv::Point(200, 200), (255, 0, 0), -1);
            cv::rectangle(frame, cv::Point(300, 300), cv::Point(400, 400), (255, 0, 0), -1);
            cv::rectangle(frame, cv::Point(400, 400), cv::Point(450, 450), (255, 0, 0), -1);
            cv::putText(frame, //target image
                "Hello, i3system!", //text
                cv::Point(10, frame.rows / 2), //top-left position
                cv::FONT_HERSHEY_DUPLEX,
                1.0,
                CV_RGB(118, 185, 0), //font color
                2);
            cv::putText(frame, //target image
                "r0: " + minstr, //text
                cv::Point(10, frame.rows / 4), //top-left position
                cv::FONT_HERSHEY_SIMPLEX,
                1.0,
                CV_RGB(118, 185, 0), //font color
                2);
            cv::putText(frame, //target image
                "r1: " + maxstr, //text
                cv::Point(10, frame.rows / 6), //top-left position
                cv::FONT_HERSHEY_SIMPLEX,
                1.0,
                CV_RGB(118, 185, 0), //font color
                2);
            cv::cvtColor ( frame, frame, cv::COLOR_RGB2BGR );
            
            write ( fd, frame.data, framesize );
        }
}
// g++ -ggdb `pkg-config --cflags --libs opencv` sample.cpp -o sample
// ffmpeg -fflags nobuffer -probesize 256 -rtsp_transport tcp -i rtsp://127.0.0.1:8554/h264 -vframes 1  -r 1 -s 640x360 -y /dev/shm/snapshot.jpg /dev/video1
// ./v4l2rtspserver -u h264 -W 640 -H 480 /dev/video1
// sudo modprobe v4l2loopback video_nr=1
// ("v4l2rtspserver", ["-P", this.config.RTSPPort.toString(), "-u", this.config.RTSPName.toString(), "-W", this.settings.resolution.Width.toString(), "-H", this.settings.resolution.Height.toString(), "/dev/video0"])
// gst-launch-1.0 v4l2src device=/dev/video1 ! video/x-raw, width=640, height=480 ! autovideosink
// gst-launch-1.0 v4l2src device=/dev/video4 ! video/x-raw, width=640 height=480 ! videoconvert ! jpegenc ! rtpjpegpay ! udpsink host=192.168.0.26 port=5000
// raspivid -n -w 640 -h 480 -b 4500000 -fps 30 -vf -hf -t 0 -o - | cvlc -vvv stream:///dev/stdin --sout '#rtp{sdp=rtsp://:9000/}' :demux=h264

// g++ -ggdb `pkg-config --cflags --libs opencv` sample.cpp -o sample
// sudo modprobe bcm2835-v4l2
// sudo modprobe v4l2loopback video_nr=4,5
// v4l2compress_omx /dev/video4 /dev/video5
// v4l2compress -fH264 /dev/video4 /dev/video5
// v4l2compress -fJPEG /dev/video4 /dev/video5
// v4l2uncompress_jpeg /dev/video4 /dev/video5
// g++ -ggdb `pkg-config --cflags --libs opencv` ImageProcessing.cpp -o ImageProcessing
// g++ -ggdb `pkg-config --cflags --libs opencv` ImageProcessing2.cpp -o ImageProcessing2
// v4l2-ctl -d /dev/video0 --list-formats
// ffmpeg -re -stream_loop -1 -i ir_video.mp4 -c:v libx264 -f rtsp rtsp://192.168.0.26:8554/video

// sudo /usr/local/share/perl/5.28.1/RTSP/rtsp-server.pl
// ffmpeg -re -stream_loop -1 -i ir_video.mp4 -c:v libx264 -f rtsp rtsp://localhost:5545/h264
