require('dotenv').config();
config = require('../utils/config.js'),
IP = require('../utils/ip.js');

// Use MQQT to tell Fyo devices to connect to web socket of portal
var mqtt = require('mqtt');

var client  = mqtt.connect(process.env.MQQT_URL, {
    username: process.env.MQQT_USERNAME,
    password: process.env.MQQT_PASSWORD
});

client.on('connect', function () {
    var FyoTableId = config.Get('id');
    console.log('MQQT subscribed to:', FyoTableId);
    client.subscribe(FyoTableId);

    // Get IP Address
    IP.v4().then(function(ips) {
        // Send IP Address
        for(var i = 0; i < ips.length; i++) {
            if(ips[i].type == process.env.PRIMARY_NETWORK || 'wlan0') {
                console.log('Sending network', ips[i]);
                client.publish('ip-address', {
                    id: FyoTableId,
                    ipaddr: ips[i].ip
                });
                return;
            }
        }
    });
});

client.on('message', function (topic, message) {
    try {
        var msg = JSON.parse(message.toString());
        if(!msg.command) {
            return;
        }

        console.log('MQTT CMD:', msg.command);

        switch(msg.command) {
            case 'update': {
                process.exit(50);
            }
            case 'reboot': {
                var su = new SU();
                su.start();
                su.run('svc power reboot');
                su.exit();
            }
            case 'live': {
                var FyoTableId = config.Get('id');
                console.log('publishing to ', FyoTableId);
                client.publish('device-state', FyoTableId);
            }
            case 'websockets': {
                websocketManager.connect();
            }
        }
    } catch(err) {
        console.log(err);
    }

});

client.on('error', function(err) {
    console.log('mqqt err', err);
})
