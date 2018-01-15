var io = require('socket.io-client');

var su = require('./su.js');

var fs = require('fs');

var config = require('./config.js');

function WebSocketManager() {

}

WebSocketManager.prototype = {
    connect: function() {
        console.log('WebSocket Connect');

        var socket = io('http://mqtt.fyo.io');
        socket.on('connect', function(){
            console.log('connected');
        });

        socket.on('screenshot', function() {
            console.log('Screenshot requested');

            var s = new su();
            s.start();

            var path =  '/sdcard/screen.png';

            s.run('screencap ' + path).then(function(result) {
                console.log(result);
                // Read /sdcard/screen.png
                if(fs.existsSync(path)) {
                    let contents = fs.readFileSync(path);
                    var FyoTableId = config.Get('id');
                    // post image
                    socket.emit('screenshot', {
                        device: FyoTableId,
                        content: contents.toString('base64')
                    });
                } else {
                    console.log('screenshot not found at ', path);
                }
            });

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