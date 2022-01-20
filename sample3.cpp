#include <stdio.h>
#include <fcntl.h>
#include <errno.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <linux/videodev2.h>
#include <opencv2/opencv.hpp>
#include <iostream>

#define VIDEO_OUT "/dev/video4" // V4L2 Loopack
#define VIDEO_IN  "/dev/video0" // Webcam

#define WIDTH  1280
#define HEIGHT 720


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
    cv::Mat thermal = cv::imread("test1.jpg", 0);
    printf ( "Please open the virtual video device (/dev/video<x>) e.g. with VLC\n" );
    std::cout << "sample starts" << VIDEO_IN << std::endl;
    while (1) {
        // 되는거
        // cap >> frame;
        // cv::cvtColor ( frame, frame, cv::COLOR_BGR2RGB ); // Webcams sometimes deliver video in BGR not RGB. so we need to convert
        // write ( fd, frame.data, framesize );
        // std::cout << "Data: " << "start" << std::endl;

        // 안되는거
        cap >> frame;
            // cv::cvtColor ( frame, frame, cv::COLOR_BGR2RGB ); // Webcams sometimes deliver video in BGR not RGB. so we need to convert
            // cv::cvtColor ( frame, frame, cv::COLOR_GRAY2RGB );
            
        cv::cvtColor ( frame, frame, cv::COLOR_BGR2GRAY );
        // frame = thermal;
        // cv::cvtColor ( thermal, thermal, cv::COLOR_GRAY2RGB );
        // for (int row = 0; row < frame.rows; row++)
        // {
        //     for (int col = 0; col < frame.cols; col++) 
        //     {
        //         // frame.at<cv::Vec3b>(row, col)[0] = thermal.at<cv::Vec3b>(row, col)[0];
        //         // frame.at<cv::Vec3b>(row, col)[1] = thermal.at<cv::Vec3b>(row, col)[1];
        //         // frame.at<cv::Vec3b>(row, col)[2] = thermal.at<cv::Vec3b>(row, col)[2];
        //         frame.at<uchar>(row,col) = thermal.at<uchar>(row,col);;
        //     }
        // }

        frameROI = frame.clone();
        cv::cvtColor ( frameROI, frameROI, cv::COLOR_GRAY2RGB );
        // cv::cvtColor ( frame, frame, cv::COLOR_GRAY2BGR );
        cv::Rect roi(cv::Point(200, 100),cv::Point( 400, 300));
        for (int y = 0; y < frame(roi).rows; y++) { 
            for (int x = 0; x < frame(roi).cols; x++) { 
                if (frame(roi).at<uchar>(y, x) > 180) { 
                    frameROI(roi).at<cv::Vec3b>(y, x)[0] = 0;
                    frameROI(roi).at<cv::Vec3b>(y, x)[1] = 0;
                    frameROI(roi).at<cv::Vec3b>(y, x)[2] = frame(roi).at<uchar>(y, x); 
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

        cv::cvtColor ( frame, frame, cv::COLOR_GRAY2RGB );
        frameROI(roi).copyTo(frame(roi));

        cv::rectangle(frame, cv::Point(50, 50), cv::Point(150, 150), (255, 0, 0), -1);
        // cv::rectangle(frame, cv::Point(50, 50), cv::Point(150, 150), (0, 255, 255), 3);
        // cv::rectangle(frame, cv::Point(200, 10), cv::Point(500, 410), cv::Scalar(0, 255, 0), 3);

        cv::putText(frame, //target image
            "max: " + maxstr, //text
            cv::Point(10, frame.rows / 6), //top-left position
            cv::FONT_HERSHEY_SIMPLEX,
            1.0,
            CV_RGB(0, 255, 0), //font color
            2);

        cv::cvtColor ( frame, frame, cv::COLOR_RGB2BGR );
        write ( fd, frame.data, framesize );
        // printf ( "success \n" );
        std::cout << maxstr << std::endl;
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
// v4l2compress /dev/video4 /dev/video5
// v4l2compress -fH264 /dev/video4 /dev/video5

// sudo modprobe bcm2835-v4l2 max_video_width=640 max_video_height=480
// for (int row = 0; row < frame.rows; row++)
//             {

//                 for (int col = 0; col < frame.cols; col++) 
//                 {


//                     frame.at<cv::Vec3b>(row, col)[0] = thermal.at<cv::Vec3b>(row, col)[0];
//                     frame.at<cv::Vec3b>(row, col)[1] = thermal.at<cv::Vec3b>(row, col)[1];
//                     frame.at<cv::Vec3b>(row, col)[2] = thermal.at<cv::Vec3b>(row, col)[2];

//                     printf("\t (%d, %d, %d)\n", r, g, b);
//                 }
//                 printf("\n");
//             }

// v4l2-ctl -V
// g++ -ggdb `pkg-config --cflags --libs opencv` sample3.cpp -o sample3
// g++ -ggdb `pkg-config --cflags --libs opencv` ImageProcessing.cpp -o ImageProcessing