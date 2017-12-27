var SocketGamePad = require('./SocketGamePad.js'),
    Application = require('./Application.js'),
    colors = require('colors');

function FyoManager(io) {
    this.io = io;
    this.socketGamePads = [];
    this.apps = [];
    this.activeApp = null;
}

FyoManager.prototype = {

    _getNextSGID: function () {
        for (var i = 0; i < this.socketGamePads.length; i++) {
            var takenCheck = false;
            for (var j = 0; j < this.socketGamePads.length; j++) {
                if (this.socketGamePads[j].SGID == i) {
                    takenCheck = true;
                    break;
                }
            }

            if (!takenCheck) {
                return i;
            }
        }

        return this.socketGamePads.length;
    },

    AddSocketGamePad: function (socket) {
        var self = this;

        if (this.endGameTimer) {
            clearTimeout(this.endGameTimer);
            this.endGameTimer = null;
        }

        var socketGamePad = null;
        if (this.socketGamePads[socket.DeviceId]) {
            socketGamePad = this.socketGamePads[socket.DeviceId];
            socketGamePad.Reconnect(socket);
        } else {
            socketGamePad = new SocketGamePad(this.io, socket, this._getNextSGID());
            socketGamePad.on('SGUpdateMsg', function (data) { self.SGUpdateMsg(socketGamePad, data); });
            socketGamePad.on('SGTimingOutMsg', function (data) { self.SGTimingOutMsg(socketGamePad, data); });
            socketGamePad.on('SGDisconnectMsg', function (data) { self.SGDisconnectMsg(socketGamePad, data); });
            socketGamePad.on('SGReconnectMsg', function (data) { self.SGReconnectMsg(socketGamePad, data); });

            if (this.socketGamePads.length == 0) {
                socketGamePad.SetMaster(true);
            }
            this.socketGamePads.push(socketGamePad);
            this.socketGamePads[socket.DeviceId] = socketGamePad;

            if (this.activeApp) {
                this.activeApp.SGConnected(socketGamePad)
            }
        }
    },

    // A list of all connected clients
    GetConnected: function () {
        var result = [];

        this.socketGamePads.map(sg => result.push({
            DeviceId: sg.socket.DeviceId,
            SGID: sg.SGID,
            Controller: sg.controller,
            Master: sg.Master,
            Info: sg.Info
        }));

        return result;
    },

    AddApp: function (socket, data) {
        var self = this;

        var app = new Application(this.io, socket, data);
        app.on('AppEndMsg', function () { self.AppEndMsg(app); });
        app.on('SGUpdateMsg', function (data) { self.AppSGUpdateMsg(app, data); });
        app.on('SGRedirectMsg', function (data) { self.AppSGRedirectMsg(app, data); });
        app.on('AppFocusMsg', function () { self.AppFocusMsg(app); });

        this.apps.push(app);
        this.activeApp = app;

        this.socketGamePads.map(sg => self.activeApp.SGConnected(sg));
    },

    AppRedirectMsg: function (app, data) {
        if (data.DeviceId) {
            if (this.socketGamePads[data.DeviceId]) {
                this.socketGamePads[data.DeviceId].Redirect(data);
            }
        } else if (data.SGID) {
            if (this.socketGamePads[SGID]) {
                this.socketGamePads[SGID].Redirect(data);
            }
        } else {
            this.socketGamePads.map(sg => sg.Redirect(data));
        }
    },

    AppSGUpdateMsg: function (app, data) {
        console.log('AppSGUpdateMsg');

        if (app != this.activeApp) {
            console.log('NOT THE ACTIVE APP');
            return;
        }

        this.socketGamePads.map(sg => sg.SGUpdateMsg(data));
    },

    AppSGRedirectMsg: function (app, data) {
        console.log('AppSGRedirectMsg');
        this.SGRedirect(data);
    },

    AppFocusMsg: function (app) {
        this.activeApp = app;
    },

    AppEndMsg: function (app) {
        if (this.activeApp == app && this.apps.length > 0) {
            this.activeApp = this.apps[0];
			console.log('REFOCUSING APP');	
			this.activeApp.Focus();
			this.activeApp.SendToAdmin();
        } else {
            this.activeApp = null;
        }

        // Remove app from the array
        this.apps = this.apps.filter(a => a !== app);
    },

    // A controller has sent a message
    // This determines how to handle it
    // and where to send it
    SGUpdateMsg: function (socketGamePad, data) {
        //console.log('SGUpdateMsg');
        if (this.activeApp != null) {
            this.activeApp.SGUpdateMsg(socketGamePad, data);
        }
    },

    SGTimingOutMsg: function (socketGamePad, data) {
        if (this.activeApp != null) {
            this.activeApp.SGTimingOutMsg(socketGamePad, data);
        }
    },

    SGDisconnectMsg: function (socketGamePad, data) {
        var self = this;

        delete this.socketGamePads[socketGamePad.socket.DeviceId];
        // find the gamepad and remove it
        this.socketGamePads = this.socketGamePads.filter(sg => sg !== socketGamePad);

        if (socketGamePad.master && this.socketGamePads.length > 0) {
            this.socketGamePads[0].SetMaster(true);
        }

        if (this.socketGamePads.length == 0) {
            console.log('NO gamepads connected...');
            this.endGameTimer = setTimeout(function () {
                console.log(colors.yellow('[GAME END]'), 'no clients connected');
                if (self.activeApp != null) {
                    self.activeApp.End();
                }
            }, 60000); // After 1 minute of no clients
        }

        if (this.activeApp != null) {
            this.activeApp.SGDisconnectMsg(socketGamePad, data);
        }
    },

    SGReconnectMsg: function (socketGamePad, data) {
        if (this.activeApp != null) {
            socketGamePad.GameStart(this.activeApp);
        }
        if (this.activeApp != null) {
            this.activeApp.SGReconnectMsg(socketGamePad, data);
        }
    },

    SGRedirect: function (controller, deviceid) {
        console.log(controller, deviceid);
        this.socketGamePads
            .filter(sg => !deviceid || (deviceid && sg.socket.DeviceId === deviceid))
            .map(sg => sg.Redirect(controller));
    }
};

module.exports = FyoManager;
