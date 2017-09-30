var path = require("path");

module.exports = function (app) {
    app.get('/admin', function (req, res) {
        return res.sendFile(path.join(__dirname + '/admin.html'));
    });
    app.get('/electron', function (req, res) {
        return res.sendFile(path.join(__dirname + '/admin.html'));
    });
}
