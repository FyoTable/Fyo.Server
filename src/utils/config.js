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
        this.data.config = this.data.config || {};
        this.data.config.software = this.data.config.software || [];
        let match = this.data.config.software.findIndex( ( cs ) => {
            if( cs.id === pkg.id ) {
                return cs;
            }
        } );
        if(match >= 0) {
            this.data.config.software[match] = pkg;
        } else {
            this.data.config.software.push(pkg);
        }
    },

    GetSoftwareToUpdate: function( portalConfig ) {
        let self = this;
        this.data.config = this.data.config || {};
        this.data.config.software = this.data.config.software || [];
        let currentSoftware = this.data.config.software;
        portalConfig = portalConfig || {};
        portalConfig.config = portalConfig.config || {};
        portalConfig.config.software = portalConfig.config.software || [];
        let portalSoftware = portalConfig.config.software;

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
        this.data.config.wireless = portalConfig.config.wireless;
        this.data.name = portalConfig.name;
    }
};

module.exports = new Config();