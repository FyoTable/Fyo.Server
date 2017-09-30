var fs = require('fs'),
    path = require('path'),
    os = require('os'),
    EventManager = require('../../utils/eventManager.js');

function Admin(client, socketGamePadManager, data, io, game) {
    this.socket = client;
    this.socketGamePadManager = socketGamePadManager;
    this.running = true;
    this.events = new EventManager();
    this.ended = false;
    this.io = io;
    this.game = game;
    this.Init(data);
}

Admin.prototype = {
    Init: function () {
        var self = this;

        // Join the admin channel to get admin updates
        this.socket.join('admin');

        // Send the current status of the server
        this.socket.emit('status', {
            manager: this.socketGamePadManager.GetConnected(),
            game: self.game ? self.game.AppIDString : ''
        });

        // Tell a SocketGamePad to redirect to a different controller
        this.socket.on('SGRedirectMsg', function (data) {
            self.socketGamePadManager.SGRedirect(data.Controller, data.DeviceId);
        });

        // Get a list of available controllers
        this.socket.on('controllers', function () {
            self.AvailableControllers(function (result) {
                self.socket.emit('controllers', result);
            });
        });

        // Get all IP Addresses of the current server
        this.socket.on('ipaddresses', function () {
            self.socket.emit('ipaddresses', self.IPAddresses());
        });
    },

    AvailableControllers: function (cb) {
        var self = this;

        var upwardPath = '/../../..';
        var p = path.resolve(__dirname + upwardPath + '/game_files');
        fs.readdir(p, function (err, files) {
            var result = [];
            files.forEach(file => {
                result.push(file);
            });
            cb && cb(result);
        });
    },

    IPAddresses: function () {
        var ifaces = os.networkInterfaces();

        var addresses = [];

        Object.keys(ifaces).forEach(function (ifname) {
            var alias = 0;

            ifaces[ifname].forEach(function (iface) {
                if ('IPv4' !== iface.family) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return;
                }

                // skip localhost
                if (iface.address == '127.0.0.1') {
                    return;
                }

                if (alias >= 1) {
                    // this single interface has multiple ipv4 addresses
                    //console.log(ifname + ':' + alias, iface.address);
                    addresses.push(iface.address);
                } else {
                    // this interface has only one ipv4 adress
                    //console.log(ifname, iface.address);
                    addresses.push(iface.address);
                }
                ++alias;
            });

        });

        return addresses;
    }
};

module.exports = Admin;
