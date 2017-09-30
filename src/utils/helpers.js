const fs = require('fs');

module.exports.JSFilter = function(file) {
    if(!file || typeof(file) != 'string') return false;
    if(file == 'all.js') return false;
    return file.toLowerCase().endsWith('.js');
};

module.exports.Log_stdout = function(data) {
    console.log(`stdout: ${data}`);
}
module.exports.Log_stderr = function(data) {
    console.log(`stderr: ${data}`);
}

module.exports.Download = function(url, to) {
    return new Promise(function (resolve, reject) {
        request.get(url).on('error', function(err) {
                console.log(err)
            }).on('complete', ( result ) => {
                console.log( result );
                resolve( result );
            }).pipe(fs.createWriteStream(to));
    });
}