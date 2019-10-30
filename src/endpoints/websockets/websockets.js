var FyoManager = require('./FyoManager.js'),
    Admin = require('./Admin.js'),
    colors = require('colors'),
    fs = require('fs'),
    path = require('path'),
    os = require('os');

module.exports.start = function(server, port) {
	var io = require('socket.io')(server);
    var fyoManager = new FyoManager(io);
    this.fyoManager = fyoManager;
    
    this.setupClient = (client) => {
        console.log(colors.green('[Connection]'), 'Socket connected via: ' + client.conn.transport.name);

        io.to('admin').emit('Connection', client.conn.transport.name);

        /*
        /   Game/App
        */
        client.on('AppHandshakeMsg', function (data) {
            // this is a game client
            fyoManager.AddApp(client, data);
        });


        /*
        /   Admin
        */
        client.on('AdminHandshakeMsg', function (req) {
            if (req.code != process.env.ADMINCODE) {
                // You're not the donut man, get out.
                console.log(colors.red('YOU DONT GET TO JOIN'));
                return;
            }

            new Admin(client, fyoManager, req, io);
        });

    
        /*
        /   Socket Game Pad
        */
        client.on('SGHandshakeIdentMsg', function(data) {
            // this socket is a game pad socket
            client.DeviceId = data.DeviceId;
            client.Controller = data.Controller;
            client.Info = data.Info;
            fyoManager.AddSocketGamePad(client);
        });



        /*
        /   Generic logging for each socket
        */
        client.conn.on('upgrade', function (transport) {
            console.log(colors.yellow('[Upgrade]'), 'Transport changed: ', client.conn.transport.name);
        });

        client.on('disconnect', function () {
            console.log(colors.yellow('[Disconnect]'), 'client dropped');
        });

        client.on('disconnecting', function (err) {
            console.log(colors.yellow('[Disconnecting]'), 'client dropping', err);
        });

        client.on('connect', function (err, data) {
            console.log(colors.green('[Connection]'), 'Connected');
        });

        client.on('error', function (err, data) {
            console.log(colors.red('[Error]'), err, data);
        });



        /*
        /   Latency checks between sockets and the server
        */
        var latencyChecks = [];
        var latencyInd = 0;
        for(var i = 0; i < 30; i++) {
            latencyChecks[i] = 0;
        }
        client.on('app-pong', function (data) {
            var now = +new Date;

            latencyChecks[latencyInd % 30] = (now - data.d);
            latencyInd++;

            var sum = 0;
            for (var i = 0; i < 30; i++) {
                sum += latencyChecks[i];
            }
            client.emit('app-latency', {
                average: sum / 30.0
            });
            io.to('admin').emit('app-latency', {
                DeviceId: client.DeviceId,
                average: sum / 30.0
            });
        });

        function PingPongLatency() {
            client.emit('app-ping', {
                d: (+new Date)
            });
            setTimeout(PingPongLatency, 100);
        }

        PingPongLatency();
    };
    io.on('connection', (client) => {
        this.setupClient(client);
    });
    
    return this;
};
