
function ProxyClient(socket, id) {
    this.conn = {
        transport: {
            name: 'Proxy'
        },
        on: () => {

        }
    };
    this.eventData = {};
    this.on = (e, cb) => {
        this.eventData[e] = cb;
    };
    this.trigger = (e, data) => {
        console.log(e, data);
        if (this.eventData[e]) {
            this.eventData[e](data);
        }
    }
    this.emit = (e, data) => {
        // console.log(e, '=> Proxy =>', id);
        socket.emit(e, id, data);
    }

    this.disconnect = () => {
        console.log('disconnect socket');
    }
}


module.exports = ProxyClient;