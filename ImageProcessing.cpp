
#include <stdio.h>
#include <fcntl.h>
#include <errno.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <linux/videodev2.h>
#include <opencv2/opencv.hpp>
#include <iostream>
// #include <boost/asio.hpp>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <cstring>
#define VIDEO_OUT "/dev/video4" // V4L2 Loopack
#define VIDEO_IN  "/dev/video0" // Webcam

#define WIDTH  1280
#define HEIGHT 720

#define KEY_NUM 654321
#define MEM_SIZE WIDTH*HEIGHT

int main ( int argc, char **argv ) {
    cv::VideoCapture cap;
    struct v4l2_format vid_format;
    size_t framesize = WIDTH * HEIGHT * 1.5;


    int     shm_id;
    void*   shm_addr;
    int     count;

    shm_id = shmget((key_t)KEY_NUM, MEM_SIZE, IPC_CREAT | 0666);

    if(shm_id == -1){
        perror("shmget error : ");
        // return 0;
    } 
    shm_addr = shmat(shm_id, (void*)0, 0);

    if((void*)-1 == shm_addr){
        perror("shmat error : ");
        // return 0;
    }
    printf("Shared memory address : %p\n", shm_addr);


    int fd = 0;

    if( cap.open ( VIDEO_IN ) ) {
        cap.set ( cv::CAP_PROP_FRAME_WIDTH , WIDTH  );
        cap.set ( cv::CAP_PROP_FRAME_HEIGHT, HEIGHT );
        cap.set(cv::CAP_PROP_FOURCC, CV_FOURCC('B', 'G', 'R', '8'));
        cap.set(cv::CAP_PROP_BUFFERSIZE, 3);
    } else {
        // std::cout << "Unable to open video input!" << std::endl;
    }

    if ( (fd = open ( VIDEO_OUT, O_RDWR )) == -1 )
        printf ("Unable to open video output!");

    memset ( &vid_format, 0, sizeof(vid_format) );
    // std::cout << &vid_format << std::endl;
    vid_format.type = V4L2_BUF_TYPE_VIDEO_OUTPUT;

    if ( ioctl ( fd, VIDIOC_G_FMT, &vid_format ) == -1 )
        printf ( "Unable to get video format data. Errro: %d\n", errno );

    vid_format.fmt.pix.width       = cap.get ( CV_CAP_PROP_FRAME_WIDTH  );
    vid_format.fmt.pix.height      = cap.get ( CV_CAP_PROP_FRAME_HEIGHT );
    vid_format.fmt.pix.pixelformat = V4L2_PIX_FMT_YUV420;
    
    vid_format.fmt.pix.sizeimage   = framesize;
    vid_format.fmt.pix.field       = V4L2_FIELD_NONE;

    if ( ioctl ( fd, VIDIOC_S_FMT, &vid_format ) == -1 )
        printf ( "Unable to set video format! Errno: %d\n", errno );

    cv::Mat frame ( cap.get(CV_CAP_PROP_FRAME_HEIGHT), 
    cap.get(CV_CAP_PROP_FRAME_WIDTH), CV_8UC3 );
    cv::Mat frameROI_0;
    
    printf ( "Please open the virtual video device (/dev/video<x>) e.g. with VLC\n" );
    // std::cout << "sample starts" << VIDEO_IN << std::endl;
    int cnt = 0;
    while (1) {
        cap >> frame;
        // cv::cvtColor ( frame, frame, cv::COLOR_YUV420p2BGR );
        cv::cvtColor ( frame, frame, cv::COLOR_BGR2GRAY ); 
        // cnt = cnt + 1;
        // if (cnt == 30){
        //     // std::cout << frame << std::endl;
        //     cv::imwrite("sample_image.png", frame);
        //     cnt = 0;
        // }
        // std::cout << &vid_format << std::endl;
        // std::cout << frame.data << std::endl;
        memcpy(shm_addr, frame.data, MEM_SIZE);
        frameROI_0 = frame.clone();
        cv::cvtColor ( frameROI_0, frameROI_0, cv::COLOR_GRAY2RGB );
        cv::Rect roi_0(cv::Point(100, 100),cv::Point(200, 200));
        for (int y = 0; y < frame(roi_0).rows; y++) { 
            for (int x = 0; x < frame(roi_0).cols; x++) { 
                if (frame(roi_0).at<uchar>(y, x) > 220) { 
                    frameROI_0(roi_0).at<cv::Vec3b>(y, x)[0] = 0;
                    frameROI_0(roi_0).at<cv::Vec3b>(y, x)[1] = 0;
                    frameROI_0(roi_0).at<cv::Vec3b>(y, x)[2] = frame(roi_0).at<uchar>(y, x); 
                } 
            }
        }
        
        double minVal_0; 
        double maxVal_0; 
        cv::Point minLoc_0; 
        cv::Point maxLoc_0; 

        minMaxLoc( frame(roi_0), &minVal_0, &maxVal_0, &minLoc_0, &maxLoc_0 );
        auto minstr_0 = std::to_string(minVal_0); 
        auto maxstr_0 = std::to_string(maxVal_0);
        // std::cout << "roi0: " << maxstr_0 << std::endl;
                            
        cv::cvtColor ( frame, frame, cv::COLOR_GRAY2RGB );
        frameROI_0(roi_0).copyTo(frame(roi_0));
        cv::rectangle(frame, cv::Point(100, 100), cv::Point(200, 200), cv::Scalar(0, 255, 0), 3);
                    
        // cv::rectangle(frame, cv::Point(500, 500), cv::Point(600, 600), (255, 0, 0), -1);
                            
        // cv::rectangle(frame, cv::Point(600, 600), cv::Point(700, 700), (255, 0, 0), -1);
                            
                    
        cv::putText(frame, //target image
            "max0: " + maxstr_0, //text
            cv::Point(10, frame.rows / 6), //top-left position
            cv::FONT_HERSHEY_SIMPLEX,
            1.0,
            CV_RGB(0, 255, 0), //font color
            2);


        // cv::cvtColor ( frame, frame, cv::COLOR_BGR2RGB );
        cv::cvtColor ( frame, frame, cv::COLOR_RGB2YUV_I420);

        write ( fd, frame.data, framesize );
    }
}
////////
// g++ -ggdb `pkg-config --cflags --libs opencv` ImageProcessing.cpp -o ImageProcessing
// g++ -ggdb `pkg-config --cflags --libs opencv` ImageProcessing2.cpp -o ImageProcessing2

// g++ -ggdb `pkg-config --cflags --libs opencv` sample.cpp -o sample
// sudo modprobe bcm2835-v4l2
// sudo modprobe v4l2loopback video_nr=4,5
// v4l2compress_omx /dev/video4 /dev/video5
// v4l2compress -fH264 /dev/video4 /dev/video5
// v4l2compress -fJPEG /dev/video4 /dev/video5
// v4l2uncompress_jpeg /dev/video4 /dev/video5
// g++ -ggdb `pkg-config --cflags --libs opencv` -lpthread -lboost_system ImageProcessing.cpp -o ImageProcessing 
// g++ -ggdb `pkg-config --cflags --libs opencv` ImageProcessing2.cpp -o ImageProcessing2