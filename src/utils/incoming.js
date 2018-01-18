function Incoming() {
    this.listener = null;
}

Incoming.prototype = {
    setListener: function(cb) {
        this.listener = cb;
    },

    fire: function(data) {
        if(this.listener) {
            this.listener(data);
        }
    }
};

module.exports = new Incoming();