var EventManager = require('../../utils/eventManager.js');

function SocketGamePad(io, socket, SGID) {
    this.io = io;
    this.socket = socket;
    this.SGID = SGID;
    this.master = false;
	console.log('NEW CONTROLLER', socket.Controller);
    this.controller = socket.Controller || 'base_controller';
    this.timingOut = false;
    this.reconnectTimer = null;
    this.info = null;

    this.events = new EventManager();

    this.Init();
}

SocketGamePad.prototype = {
    on: function (e, f) { return this.events.on(e, f); },

    Init: function () {
        var self = this;

        this.socket.emit('SGHandshakeMsg');
		this.SetupEvents();
    },

	SetupEvents: function() {
		var self = this;

		console.log('setup SGUpdateMsg on socket game pad controller');
		this.socket.on('SGUpdateMsg', function (packet) {
			console.log('SGUpdateMsg', packet);

			packet.SGID = self.SGID;
			packet.DeviceId = self.socket.DeviceId;

			self.events.trigger('SGUpdateMsg', packet);
		});

		this.socket.on('disconnect', function () {
			if (self.socket.forcedDisconnect) return;

			console.log('setting up reconnect timer');
			self.reconnectTimer = setTimeout(function () {
				// Full disconnect
				self.events.trigger('SGDisconnectMsg', {
					SGID: self.SGID,
					DeviceId: self.socket.DeviceId
				});
				self.io.to('admin').emit('SGDisconnectMsg', {
					SGID: self.SGID,
					DeviceId: self.socket.DeviceId
				});
			}, 15000);

			self.timingOut = true;
			self.events.trigger('SGTimingOutMsg', {
				SGID: self.SGID,
				DeviceId: self.socket.DeviceId
			});
			self.SendAdminIdentity();
		})
	},

    SetMaster: function (val) {
        this.master = val;
        this.socket.emit('SGUpdateMsg', {
            message: 'Master',
            data: this.master
        });
        this.SendAdminIdentity();
    },

    GameStart: function () {
        this.socket.emit('SGUpdateMsg', {
            message: 'GameStarted',
            data: {
                SGID: this.SGID
            }
        });
    },

    SGUpdateMsg: function (data) {
        console.log('SGUpdateMsg', data);

        var playerIdSet = (data.SGID != undefined && data.SGID > -1 && data.SGID == this.SGID);
        var deviceIdSet = (data.DeviceId != undefined && data.DeviceId == this.socket.DeviceId);
        var neitherSet = ((data.SGID == undefined || data.SGID < 0) && data.DeviceId == undefined);

        console.log(playerIdSet, deviceIdSet, neitherSet);

        if (playerIdSet || // A player id was specified and greater than -1
            deviceIdSet || // A device was specified
            neitherSet // Neither a player nor device was specified (send to all)
        ) {
            // Send the data!
            this.socket.emit('SGUpdateMsg', data);
        } else {
            console.log('NOT SENDING');
        }
    },

    Redirect: function (controller) {
        console.log('redirectring controller', controller);
        this.socket.emit('SGRedirectMsg', controller);
    },

    Reconnect: function (socket) {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.socket.forcedDisconnect = true;
        this.socket.disconnect();
        this.socket = socket;
		console.log('RECONNECT', socket.Controller);
		this.controller = socket.Controller;
		this.SetupEvents();
        this.timingOut = false;
        this.events.trigger('SGReconnectMsg', {
            SGID: this.SGID,
            DeviceId: this.socket.DeviceId,
			Controller: this.controller
        });
        this.SendAdminIdentity();
    },

    SGHandshakeMsg: function (socket) {
        socket.emit('SGHandshakeMsg', {
            DeviceId: this.socket.DeviceId,
            SGID: this.SGID,
            Master: this.master,
            Controller: this.controller
        });
    },

    SendAdminIdentity: function () {
        this.io.to('admin').emit('SGHandshakeIdentMsg', {
            DeviceId: this.socket.DeviceId,
            SGID: this.SGID,
            Master: this.master,
            Controller: this.controller,
            Info: this.info,
            TimingOut: this.timingOut == true
        });
    },
};

module.exports = SocketGamePad;
