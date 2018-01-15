const fs = require('fs');
const path = require('path');
const download = require('download');
const request = require('request');
const helpers = require('./helpers.js');
const config = require('./config.js');
const SU = require('./su.js');
const CMD = require('./cmd.js');
var Client = require('node-rest-client').Client;
var restClient = new Client();

function Updater() {

}

Updater.prototype = {
    UpdateNodeServer: function() {
        return new Promise( (resolve, reject) => {
            CMD( 'git', [ 'pull' ] ).then( ( result ) => {
                // TODO: (garrett) If still up to date, just resolve, no npm or bower is needed
                CMD('npm', ['install']).then(resolve).catch(reject);
            }).catch(reject);
        });
    },

    UpdateSoftware: function() {
        let self = this;

        return new Promise(function(resolve, reject) {
            self.getPortalConfig().then( ( portalConfig ) => {
                console.log('getPortalConfig', portalConfig);
                config.Update(portalConfig);
                config.GetSoftwareToUpdate( portalConfig ).then( ( updates ) => {

                    self.downloadAPKs( updates ).then( () => {

                        self.installAPKs( updates ).then( () => {
                            config.Write();
                            resolve();
                        });

                    }).catch( ( err ) => {

                        console.log(' FAILED ', ' to download all APKs', err);
                        // Try to install any that didn't fail
                        self.installAPKs( updates ).then( () => {
                            config.Write();
                            resolve();
                        }).catch( ( err ) => {
                            console.log(' FAILED ', ' to install all APKs', err );
                            config.Write();
                            resolve( );
                        } );

                    });

                } )
                .catch(( err ) => {
                    console.log( err );
                    reject( err );
                });;

            } )
            .catch(( err ) => {
                console.log( err ); 
                reject( err );
            });;
            
        });
    },

    installAPKs: function( software ) {
        let self = this;

        return Promise.all(software.map(x => {
            console.log('install', x.url);

            return new Promise( (resolve, reject ) => {
                // check if package installed
                self.getPackages().then( (packages) => {
                    if( packages.indexOf( x.package ) > -1) {
                        console.log(x.package, 'package is installed');

                        // uninstall it
                        return self.uninstallAPK(x.package).then(() => {
                            console.log('Uninstalled package', x.id);
                            // install it
                            return self.installAPK(x.apk)
                                .then(() => {

                                    console.log('apk installed');
                                    // update config
                                    config.UpdateSoftware(x);
                                    resolve();
                                })
                                .catch(reject);
                        }).catch(reject);
                    } else {
                        console.log( 'package is not installed');
                        // install it
                        return self.installAPK(x.apk)
                            .then(() => {
                                console.log('apk installed');
                                config.UpdateSoftware(x);
                                resolve();
                            })
                            .catch(reject);
                    }
                }).catch( ( err ) => {
                    console.log( ' failed to get packages ');
                    reject( err );
                });
            });

            

        }));

    },

    downloadAPKs: function( software ) {

        // Make sure directory exists
        var dir = path.resolve(__dirname + '/../../updates');
        console.log(dir);   
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        return Promise.all(software.map(x => {
                return new Promise( (success, reject ) => {
                    try {
                        download(process.env.PORTAL_ENDPOINT + '/apk/' + x.apk, dir).then( success ).catch( reject );
                    } catch( err ) {
                        console.log( 'Failed to download', err );
                        reject( err );
                    }
                });
            }
        ));

    },

    getPortalConfig: function( ) {
        return new Promise( (resolve, reject ) => {
            restClient.get('http://fyo.io/api/device/config/' + config.Get('id'), function( data, response) {
            console.log(data.toString());
            if(data) {
                    resolve( data );
                } else {
                    reject( response );
                }
            });
        });
    },


    oneLinerSU: function( cmd, cwd ) {
        return new Promise( ( success, reject ) => {
            var su = new SU();
            su.start((__dirname + '/../../updates/')).then( success ).catch( reject );
            su.run(cmd);
            su.exit();
        });
    },
    
    installAPK: function( apk ) {
        return new Promise(function(success, reject) {
            var su = new SU();
            su.start((__dirname + '/../../updates/')).then( success ).catch( reject );
            su.run('pm install "' + apk + '"');
            su.exit();
        });
    },
    
    uninstallAPK: function( apk ) {
        return new Promise(function(success, reject) {
            var su = new SU();
            su.start((__dirname + '/../../updates/')).then( success ).catch( reject );
            su.run('pm uninstall "' + apk + '"');
            su.exit();
        });
    },

    getPackages: function() {
        let self = this;
        return new Promise( ( success, reject ) => {
            self.oneLinerSU('pm list packages').then(function(result) {
                var results = result.split('\n');
                results = results.map(x => x.split('package:')[1]);
                success( results );
            }).catch(reject);
        });
    }
};

module.exports = Updater;