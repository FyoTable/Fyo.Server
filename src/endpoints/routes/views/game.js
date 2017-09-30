var path = require("path");

module.exports = function(app) {
    app.get('/game', function(req,res) {
        return res.sendFile(path.join(__dirname + '/../../../res/pacman/index.html'));
    });
}
