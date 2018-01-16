var io = require('socket.io-client');

var su = require('./su.js');

var fs = require('fs');
var path = require('path');

var config = require('./config.js');

function WebSocketManager() {
    this.connected = false;
}

WebSocketManager.prototype = {
    connected: false,

    connect: function() {
        if(this.connected) {
            return;
        }
        var self = this;
        
        console.log('WebSocket Connect');

        var socket = io('http://mqtt.fyo.io');
        socket.on('connect', function(){
            console.log('connected');
            self.connected = true;
            socket.emit('device', config.Get('id'));
        });

        socket.on('capture', function() {
            console.log('Screenshot requested');


            var filepath =  'screen.png';

            var s = new su(path.resolve(__dirname + '../../'));
            s.start().then(function(result) {
                console.log(result);
                // Read /sdcard/screen.png
                if(fs.existsSync(filepath)) {
                    console.log('image found, sending...');

                    let contents = fs.readFileSync(filepath);
                    var FyoTableId = config.Get('id');
                    // post image
                    socket.emit('screenshot', {
                        device: FyoTableId,
                        content: contents.toString('base64')
                    });
                } else {
                    console.log('screenshot not found at ', filepath);
                }
            });

            s.run('screencap "' + filepath + '"');
            s.run('chmod 777 "' + filepath + '"');
            s.exit();

        });

        this.setup();
    },

    setup: function() {
        // var client = this.client;
        

        // client.on('SignalR', 'Screenshot', function() {
        //     client.invoke( 'SignalR', 'Screenshot', 'client', 'invoked from client');
        //     console.log('SignalR');
        // });
        // client.invoke( 'SignalR', 'Screenshot', 'client', 'invoked from client');
    }
};

module.exports = new WebSocketManager();