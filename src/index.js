var express = require('express'),
    fs = require('fs'),
    helpers = require('./utils/helpers.js'),
    CMD = require('./utils/cmd.js'),
    IP = require('./utils/ip.js'),
    SU = require('./utils/su.js'),
    config = require('./utils/config.js'),
    qr = require('qr-image'),
    path = require('path'),
    https = require('https'),
    websocketManager = require('./utils/websocketManager'),
    incoming = require('./utils/incoming.js');
const cors = require('cors');
const Proxy = require('./proxy');

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
app.use(cors());
app.enable('trust proxy');
app.options('*', cors());

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


app.get('/ping', function(req, res) {
    res.send('pong');
});

app.get('/config', function(req, res) {
    res.send(config.data);
});

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

const textFiles = ['.html', '.js', '.css'];

const sendFile = (route, res) => {
    if (fs.existsSync(route)) {
        var isDirectory = fs.lstatSync(route).isDirectory()
        if (isDirectory) {
            return sendFile(route + '/index.html', res);
        }

        let textFile = false;
        const lowerRoute = route.toLowerCase();
        textFiles.map((f) => {
            if (lowerRoute.endsWith(f)) {
                textFile = true;
            }
        })
        if (textFile) {
            fs.readFile(route, 'utf8', (err, buffer) => {
                res(buffer);
            });
        } else {
            fs.readFile(route, (err, buffer) => {
                res(buffer);
            });
        }
        return true;
    } else {
        return false;
    }
}

// Generating certs
// openssl req -x509 -newkey rsa:2048 -keyout keytmp.pem -out cert.pem -days 365
// openssl rsa -in keytmp.pem - out key.pem
// var serverSecure = https.createServer({
//     key: fs.readFileSync('./key.pem'),
//     cert: fs.readFileSync('./cert.pem')
// }, app).listen(443);

const websocketsControl = require('./endpoints/websockets/websockets.js').start(server, PORT, app);
//require('./endpoints/websockets/websockets.js').start(serverSecure, 443, app);


const proxyClient = new Proxy(websocketsControl, () => {
    proxyClient.onWebRequest((route, res) => {
        let routePath = __dirname + '/../game_files' + route;
        let routePath2 = __dirname + '/../bower_components' + route;
        if (!sendFile(routePath, res)) {
            if (!sendFile(routePath2, res)) {
                console.log('[Not Found]', routePath);
                res('test');
            }
        }
    });
});

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


// Use MQTT to tell Fyo devices to connect to web socket of portal
var mqtt = require('mqtt');

// var client  = mqtt.connect(process.env.MQTT_URL, {
//     username: process.env.MQTT_USERNAME,
//     password: process.env.MQTT_PASSWORD
// });

// client.on('connect', function () {
//     var FyoTableId = config.Get('id');
//     console.log('MQTT subscribed to:', FyoTableId);
//     client.subscribe(FyoTableId);

//     // Get IP Address
//     IP.v4().then(function(ips) {
//         // Send IP Address
//         for(var i = 0; i < ips.length; i++) {
//             if(ips[i].type == process.env.PRIMARY_NETWORK || 'wlan0') {
//                 console.log('Sending network', ips[i]);
//                 client.publish('ip-address', {
//                     id: FyoTableId,
//                     ipaddr: ips[i].ip
//                 });
//                 return;
//             }
//         }
//     });
// });

// client.on('message', function (topic, message) {
//     try {
//         var msg = JSON.parse(message.toString());
//         if(!msg.command) {
//             return;
//         }

//         console.log('MQTT CMD:', msg.command);

//         switch(msg.command) {
//             case 'update': {
//                 process.exit(50);
//             }
//             case 'reboot': {
//                 var su = new SU();
//                 su.start();
//                 su.run('svc power reboot');
//                 su.exit();
//             }
//             case 'live': {
//                 var FyoTableId = config.Get('id');
//                 console.log('publishing to ', FyoTableId);
//                 client.publish('device-state', FyoTableId);
//             }
//             case 'connecting': {
//                 console.log('INCOMING CONNECTING', msg);
//                 incoming.fire(msg.arg);
//             }
//             case 'websockets': {
//                 websocketManager.connect();
//             }
//         }
//     } catch(err) {
//         console.log(err);
//     }

// });

// client.on('error', function(err) {
//     console.log('MQTT ERROR', err);
// });

// client.on('close', function (err) {
//     console.log('MQTT CLOSED', err);
//     //client.reconnect();
// });

// client.on('reconnect', function() {
//     console.log('MQTT RECONNECTED');
// });


websocketManager.connect();



// iptables -t nat -A PREROUTING -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 8080
try{
    var su = new SU();
    su.start();
    su.run('iptables -t nat -A PREROUTING -p tcp -m tcp --dport 80 -j REDIRECT --to-ports ' + PORT);
    su.exit();
}catch(err) {
    console.log('Could not open port 80', err);
}