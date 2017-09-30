const helpers = require('./helpers.js');
const { spawn } = require('child_process');

module.exports = function(cmd, args) {
    return new Promise( ( resolve, reject ) => {
        const run = spawn(cmd, args || []);
        run.on('error', function( err ) {
            console.log( 'Could not start ', cmd, err );
        });
        
        run.stdout.on('data', helpers.Log_stdout);        
        run.stderr.on('data', helpers.Log_stderr);
        
        run.on('close', (code) => {
          console.log(`child process exited with code ${code}`);
          if(code == 0) {
              resolve( code );
          } else {
              reject( code );
          }
        });
    });
};