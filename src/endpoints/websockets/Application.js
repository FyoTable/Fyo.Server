var EventManager = require('../../utils/eventManager.js'),
    colors = require('colors'),
    path = require('path'),
    fs = require('fs'),
    AdmZip = require('adm-zip');

function Application(io, socket, data) {
    this.io = io;
    this.socket = socket;
    this.AppIDString = data.AppIDString || '';
    this.ended = false;

    this.events = new EventManager();

    this.Init(data);
}

Application.prototype = {
    on: function (e, f) { return this.events.on(e, f); },

    Init: function (data) {
        var self = this;

        console.log(colors.green('[GAME START]'), this.AppIDString);

		this.SendToAdmin();

        this.SetupEvents(data);

        this.socket.emit('AppHandshakeMsg', { });

        // Unpack any controller data
        this.HandleBinaryData(data);
    },

	SendToAdmin: function() {
		this.io.to('admin').emit('AppHandshakeMsg', {
			AppIDString: this.AppIDString
		});
	},

    SetupEvents: function (data) {
        var self = this;

        this.socket.on('AppEndMsg', function () {
            if (self.ended) return;
            console.log(colors.yellow('[GAME END]'), 'Told to end', self.AppIDString);

            self.ended = true;
            self.io.to('admin').emit('AppEndMsg', self.AppIDString);
            self.events.trigger('AppEndMsg');
        });

        // No longer connected via WebSockets
        this.socket.on('disconnect', function () {
            if (self.ended) return;
            console.log(colors.yellow('[Disconnect]'), self.AppIDString);

            self.ended = true;
            self.io.to('admin').emit('GameDisconnect', self.AppIDString);
            self.events.trigger('AppEndMsg');
        });

        // Game -> SocketGamePads
        console.log('Setup SGUpdateMsg on application');
        this.socket.on('SGUpdateMsg', function (data) {
            //self.socketGamePadManager.SendUpdateMsg(data);
            console.log('SGUpdateMsg', data);
            self.events.trigger('SGUpdateMsg', data);
        });

        this.socket.on('SGRedirectMsg', function (data) {
            console.log(colors.yellow('[Redirect]'), data);

            self.events.trigger('SGRedirectMsg', data);
            self.io.to('admin').emit('SGRedirectMsg', data);
            //self.socketGamePadManager.SGRedirect(data);
        });

        this.socket.on('AppFocusMsg', function () {
            self.events.trigger('AppFocusMsg');
        });

    },

    HandleBinaryData: function (data) {
        var self = this;

        if (data && data.BinaryData) {
            // Receive Controller Payload
            var buff = new Buffer(data.BinaryData, 'base64');

            var rootPath = __dirname + '/../../../uploads/';
            if(!fs.existsSync(path.resolve(rootPath))) {
                fs.mkdir(path.resolve(rootPath));
            }

            var fullpath = path.resolve(appPath);

            fs.writeFile(fullpath, buff, "binary", function (err) {
                if (err) {
                    console.log(colors.red('[ERROR]'), err);
                    return;
                }

                console.log(colors.green('[SUCCESS]'), 'written payload', fullpath);

                var zip = new AdmZip(fullpath);
                var p = path.resolve(__dirname + './../../../game_files/' + self.AppIDString + '/');

                // make sure game_files path exists
                if(!fs.existsSync(p)) {
                    fs.mkdir(p);
                }

                console.log(p);
                zip.extractAllTo(p, /*overwrite*/true);

                // delete the zip file
                fs.unlink(fullpath);

                // Tell all gamepads to go to the games controller
                //self.socketGamePadManager.Redirect(self.Controller);
            });
        }

        self.Controller = data.Controller || game.AppIDString;
        console.log('Application Controller: ', self.Controller);
    },

    End: function () {
        if (this.ended) return;

        this.socket.emit('AppEndMsg');
    },

	Focus: function() {
        this.socket.emit('AppFocusMsg');
	},

    SGConnected: function (socketGamePad) {
        var self = this;
        if (this.ended) return;

        this.socket.emit('SGConnected', {
            DeviceId: socketGamePad.socket.DeviceId,
            SGID: socketGamePad.SGID,
            controller: socketGamePad.controller
		});
        socketGamePad.SGHandshakeMsg(this.socket);
        if(socketGamePad.controller != self.Controller) {
            socketGamePad.Redirect(self.Controller);
        }
    },

    SGUpdateMsg: function (socketGamePad, data) {
        console.log('SGUpdateMsg');
        if (this.ended) return;
        console.log('SGUpdateMsg2');
        if (data && data.MessageType == 'AppEndMsg') {
            this.End();
        }
        this.socket.emit('SGUpdateMsg', data);
    },

    SGTimingOutMsg: function (socketGamePad, data) {
        if (this.ended) return;
        this.socket.emit('SGTimingOutMsg', data);
    },

    SGReconnectMsg: function (socketGamePad, data) {
        console.log('SGReconnectMsg');
        if (this.ended) return;
        this.socket.emit('SGReconnectMsg', data);
        socketGamePad.SGHandshakeMsg(this.socket);
    },

    SGDisconnectMsg: function (socketGamePad, data) {
		console.log('SGDisconnectMsg');
        if (this.ended) return;
        this.socket.emit('SGDisconnectMsg', data);
    }
};

module.exports = Application;
