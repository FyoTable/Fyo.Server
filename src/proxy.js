const socketio = require('socket.io-client');
const ProxyClient = require('./proxyClient.js');
const config = require('./utils/config.js');

function ProxyHandle(websocketsControl, cb) {
    console.log('Start Proxy');

    this.webRequestCallbacks = [];
    // this.socket = socketio('http://localhost:38082');
    
    this.socket = socketio('http://proxy.fyo.io');
    
    this.socket.on('connect', () => {
        console.log('connected to proxy');
        this.socket.emit('fyo-server', config.Get('id'));
        cb && cb();
    });
    this.onWebRequest = (cb) => {
        this.webRequestCallbacks.push(cb);
    }
    this.socket.on('request', (err, route, resCB) => {
        // console.log('request', route, resCB);
        this.webRequestCallbacks.map((cb) => cb(route, (data) => {
            // console.log('Got data');
            resCB && resCB(data);
            // console.log(resCB);
        }));
    });

    this.proxyClients = {};
    const getClient = (id) => {
        if (!this.proxyClients[id]) {
            this.proxyClients[id] = new ProxyClient(this.socket, id);
            console.log('Setting up', id);
            websocketsControl.setupClient(this.proxyClients[id]);
        }
        return this.proxyClients[id];
    }

    const proxy = (e) => {
        this.socket.on(`${e}-Proxy`, (id, data) => {
            getClient(id).trigger(e, data);
        });
    }

    proxy('AppHandshakeMsg');
    // proxy('SGHandshakeIdentMsg');
    
    this.socket.on(`SGHandshakeIdentMsg-Proxy`, (id, data) => {
        console.log('SGHandshakeIdentMsg!!', id);
        getClient(id).trigger('SGHandshakeIdentMsg', data);
    });
    proxy('app-pong');
    proxy('SGUpdateMsg');
    proxy('SGTimingOutMsg');
    proxy('SGDisconnectMsg');
    proxy('SGReconnectMsg');
    proxy('SGRedirectMsg');
    proxy('Games');
    proxy('info');
    proxy('Start');

    this.socket.on('Disconnect-Proxy', (id) => {
        console.log('disconnecting', id);
        if (this.proxyClients[id]) {
            this.proxyClients[id].trigger('disconnect');
            delete this.proxyClients[id];
        }
    });
}

module.exports = ProxyHandle;