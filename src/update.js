require('dotenv').config();

const CMD = require('./utils/cmd.js');
const Updater = require('./utils/updater.js');

function StartServer() {
    console.log('Start Server');
    CMD( 'node', [ 'src/index.js' ] )
        .then( () => console.log( 'child process exited with code ${code}' ) )
        .catch( ( code ) => {

            if( code === 50 ) { // Code 50 means an update has been requested
                console.log( 'UPDATE SERVER AND RESTART' );
                RunUpdateStart();
            }

        });
}

function RunUpdateStart() {
    var updater = new Updater();
    updater.UpdateNodeServer().then( () => {
        console.log('node server updated');
        updater.UpdateSoftware()
            .then( StartServer )
            .catch( (err) => {
                console.log( err );
                StartServer();
             });
    }).catch( (err) => {
        console.log( err );
        StartServer();
     });
}

RunUpdateStart();