const fs = require('fs');
const path = require('path');

function Config() {
    this.data = {};
    this.Read();
}

Config.prototype = {
    Read: function() {
        var p = path.resolve(__dirname + "/../../config.json");

        if(fs.existsSync(p)) {
            let contents = fs.readFileSync(__dirname + "/../../config.json");
            try {
                this.data = JSON.parse(contents);
            } catch( err ){
                console.log( err );
                this.data = {};
            }
        } else {
            this.data = {};
        }
    },

    Write: function() {
        let contents = JSON.stringify(this.data);
        fs.writeFileSync(__dirname + "/../../config.json", contents);
    },

    Get: function(key) {
        return this.data[key];
    },

    Set: function(key, data) {
        this.data[key] = data;
    },

    UpdateSoftware: function( pkg ) {
        this.data.software = this.data.software || [];
        let match = this.data.software.findIndex( ( cs ) => {
            if( cs.id === s.id ) {
                return cs;
            }
        } );
        if(match >= 0) {
            this.data.software[match] = pkg;
        } else {
            this.data.software.push(pkg);
        }
    },

    GetSoftwareToUpdate: function( config ) {
        let self = this;
        let currentSoftware = this.Get('software') || [];
        let portalSoftware = config.software;

        return new Promise( ( resolve, reject ) => {
    
            let result = [];
            portalSoftware.map( ( s ) => {
                // find matching current software
                let match = currentSoftware.find( ( cs ) => {
                    if( cs.id === s.id ) {
                        return cs;
                    }
                } );
    
                if( !match || match.version != s.version ) {
                    result.push( s );
                }
            });
    
            resolve( result );
        } );
    },

    Update: function( portalConfig ) {
        this.data.config = this.data.config || {};
        portalConfig = portalConfig || {};
        portalConfig.config = portalConfig.config || {};

        this.data.config = portalConfig.config;
    }
};

module.exports = new Config();