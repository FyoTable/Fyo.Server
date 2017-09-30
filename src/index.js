var express = require('express'),
    fs = require('fs'),
    helpers = require('./utils/helpers.js'),
    CMD = require('./utils/cmd.js'),
    SU = require('./utils/su.js'),
    qr = require('qr-image'),
    path = require('path'),
    https = require('https');

const { spawn } = require('child_process');

require('dotenv').config();

process.env.updating = false;


// Globals
const PORT = process.env.PORT || process.env.port || 8080;


// Setup the Express app that will run the server
var app = express();
var server = require('http').Server(app);
app.all('/', function(req, res, next) {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", 0);
    next();
});

// Static file serving
app.use(express.static(__dirname + '/res'));
app.use(express.static(__dirname + '/../build'));
app.use(express.static(__dirname + '/../game_files'));
app.use(express.static(__dirname + '/../bower_components'));

app.get('/qr/http/:q', function (req, res) {
    var code = qr.image('http://' + req.params.q, { type: 'svg' });
    res.type('svg');
    code.pipe(res);
});

app.get('/qr/:q', function (req, res) {
    var code = qr.image(req.params.q, { type: 'svg' });
    res.type('svg');
    code.pipe(res);
});

app.get('/update', function(req, res) {
    res.sendFile(path.join(__dirname + '/update.html'));

    process.env.updating = true;

    setTimeout(function() {
        process.exit(50);
    }, 1000);
});

app.get('/updating', function(req, res) {
    res.send({
        updating: process.env.updating
    });
});

app.get('/install/:app', function(req, res) {
    const ls = spawn('pm', ['install', req.params.app]);
    
    ls.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    
    ls.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });
    
    ls.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });

    res.send('success');
});

function Start(app) {
    return CMD('am', ['start', '--user', '0', '-a', 'android.intent.action.MAIN', app + '/.MainActivity']);
}

app.get('/start/:app', function(req, res) {
    Start(req.params.app).then( () => {
        res.send('success');
    }).catch( ( err ) => console.log( err ) );
});

// Setup the view routes
fs.readdir(__dirname + '/endpoints/routes/views', function(err, files) {
    if(err || !files) {
        return console.log(err);
    }
    files.filter(helpers.JSFilter).map(function(file) {
        require('./endpoints/routes/views/' + file)(app);
    });
});

// Generating certs
// openssl req -x509 -newkey rsa:2048 -keyout keytmp.pem -out cert.pem -days 365
// openssl rsa -in keytmp.pem - out key.pem
// var serverSecure = https.createServer({
//     key: fs.readFileSync('./key.pem'),
//     cert: fs.readFileSync('./cert.pem')
// }, app).listen(443);

require('./endpoints/websockets/websockets.js').start(server, PORT, app);
//require('./endpoints/websockets/websockets.js').start(serverSecure, 443, app);


server.listen(PORT, function(err) {
    if (err) {
        return;
    }
    Start('io.DCCKLLC.FyoMarquee').catch( ( err ) => console.log( err ) );
    console.log('server listening on port: ' + PORT);
});


function Log_stdout(data) {
    console.log(`stdout: ${data}`);
}
function Log_stderr(data) {
    console.log(`stderr: ${data}`);
}

// Use MQQT to tell Fyo devices to connect to web socket of portal
var mqtt = require('mqtt');

var client  = mqtt.connect(process.env.MQQT_URL, {
    username: process.env.MQQT_USERNAME,
    password: process.env.MQQT_PASSWORD
});

client.on('connect', function () {
    client.subscribe(process.env.FYO_ID);
});

client.on('message', function (topic, message) {
    try {
        var msg = JSON.parse(message.toString());
        if(!msg.command) {
            return;
        }

        console.log('MQTT CMD:', msg.command);

        switch(msg.command) {
            case 'update': {
                process.exit(50);
            }
            case 'reboot': {
                var su = new SU();
                su.start();
                su.run('svc power reboot');
                su.exit();
            }
            case 'live': {
                console.log('publishing to ', process.env.FYO_ID);
                client.publish(process.env.FYO_ID, 'alive');
            }
        }
    } catch(err) {
        console.log(err);
    }

});

