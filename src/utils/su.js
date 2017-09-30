const helpers = require('./helpers.js');
const { spawn } = require('child_process');

function SU() {
}

SU.prototype = {
    start: function(cwd) {
        let self = this;
        

        self.su = spawn('su', [], {
            cwd: null || cwd
        });
        
        self.su.stdout.on('data', ( d ) => self.data += d );        
        self.su.stderr.on('data', helpers.Log_stderr);

        self.su.on('error', function( err ) {
            console.log( 'Could not start su ', err );
            self.su = null;
        });

        return new Promise( (resolve, reject) => {
            self.data = '';

            console.log('Start su');
            
            self.su.on('close', (code) => {
                console.log(`su exited with code ${code}`);
                if( code == 0 ) {
                    resolve( self.data );
                } else {
                    reject( code );
                }
            });
        });
    },

    exit: function() {
        if( !this.su ) return;
        this.su.stdin.write('exit\n');
    },

    run: function(cmd) {
        if( !this.su ) return;
        console.log( ' run ', cmd);
        this.su.stdin.write(cmd + '\n');
    }
};

module.exports = SU;