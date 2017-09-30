var path = require("path");

module.exports = function(app) {
    app.get('/', function(req,res) {
        return res.sendFile(path.join(__dirname + '/../../../../game_files/base_controller/index.html'));
    });
}
