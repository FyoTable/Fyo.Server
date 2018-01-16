# FyoTable

Follow rooting instructions here: http://nvidiashieldzone.com/shield-android-tv/android-7-nougat/tutorial-root-shield-android-tv-16gb-nougat/

For ip re-route: iptables -t nat -A PREROUTING -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 8080

#### For Termux (startup script):
```bash
> ~/.profile
> cd Fyo.Server
> node src/update.js
```

#### Setting net.hostname

```bash
> adb pull /system/build.prop
```

add to the end of build.prop

net.hostname=[hostname to set box to]

```bash
> adb push /sdcard/build.prop
> adb shell
$> su
$> mount -orw,remount /system
$> cp /sdcard/build.prop /system/build.prop
```

Reboot


#### For screencaps
On the temp directory

```bash
setenforce 0
```
