var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');

var app = express();
var PORT = process.env.PORT || 3000;

app.configure(function () {
    app.set('port', PORT);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon('public/favicon.ico'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
});

var LOG_LEVEL = 3;

app.configure('development', function () {
    app.use(express.errorHandler());
    app.use(express.logger('dev'));
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('production', function () {
    app.use(express.errorHandler());
    app.use(express.logger(
        ':remote-addr - :method :url HTTP/:http-version ' +
        ':status :res[content-length] - :response-time ms'));
    LOG_LEVEL = 1;
    app.use(express.static(path.join(__dirname, 'public')));
});

routes.setPort(PORT);
app.get('/', routes.index);

var server = http.createServer(app);

server.listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});

var sio = require('socket.io');
var io = sio.listen(server, {'log level': LOG_LEVEL});
var game = require('./game');

game.run(io);
