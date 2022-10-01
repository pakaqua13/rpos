#!/bin/sh
echo $@

# Ubuntu 21 installs Python3 by default and appears to have dropped the Python 2 'Gi' package that
# is required for Gstreamer GObject Introspection

LD_LIBRARY_PATH=/home/quedale/git/cerbero/build/dist/linux_x86_64/lib \
LIBRARY_PATH=/home/quedale/git/cerbero/build/dist/linux_x86_64/lib/gstreamer-1.0:/home/quedale/git/cerbero/build/dist/linux_x86_64/lib \
PKG_CONFIG_PATH=/home/quedale/git/cerbero/build/dist/linux_x86_64/lib/pkgconfig \
~/git/OnvifDeviceManager/build/onvif-server $@

exit 0

FILE=/usr/bin/python3
if test -f "$FILE"; then
    echo "Found /usr/bin/python3"
    /usr/bin/python3 ./python/gst-rtsp-launch.py $@ -v
else
    echo "using /usr/bin/python"
    /usr/bin/python ./python/gst-rtsp-launch.py $@ -v
fi

