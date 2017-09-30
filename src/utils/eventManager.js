function EventManager() {
    this.onEvents = {};
}

EventManager.prototype = {
    onEvents: {},

    on: function (e, f) {
        if (!this.onEvents[e]) {
            this.onEvents[e] = [];
        }
        this.onEvents[e].push(f);
    },

    remove: function (e, f) {
        if (!this.onEvents[e]) {
            return;
        }

        for (var i = 0; i < this.onEvents[e].length; i++) {
            if (this.onEvents[e][i] == f) {
                this.onEvents[e].splice(i, 1);
                return true;
            }
        }

        return false;
    },

    clear: function (e) {
        delete this.onEvents[e];
    },

    trigger: function (e, arg, arg1, arg2, arg3) {
        if (!this.onEvents[e]) {
            return;
        }

        for (var i = 0; i < this.onEvents[e].length; i++) {
            this.onEvents[e][i](arg, arg1, arg2, arg3);
        }
    },

    reset: function() {
        this.onEvents = {};
    }
};

module.exports = EventManager;
