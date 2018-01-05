var io = require('socket.io-client');

var su = require('./su.js');

var fs = require('fs');

function WebSocketManager() {

}

WebSocketManager.prototype = {
    connect: function() {
        console.log('WebSocket Connect');

        var socket = io('http://mqqt.fyo.io');
        socket.on('connect', function(){
            console.log('connected');
        });

        socket.on('screenshot', function() {
            var s = new su();
            s.start();

            var path =  '/sdcard/screen.png';

            s.run('screencap ' + path);

            // Read /sdcard/screen.png

            setTimeout(function() {
                if(fs.existsSync(path)) {
                    let contents = fs.readFileSync(path);
                    // post image
                    socket.emit('screenshot', contents);
                } else {
                    console.log('screenshot not found at ', path);
                }
            }, 500);

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