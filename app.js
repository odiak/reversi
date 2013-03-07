var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');

var app = express();
var PORT = process.argv[2] || 3000;

app.configure(function () {
    app.set('port', PORT);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon('public/favicon.ico'));
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
    app.use(express.errorHandler());
});

app.get('/', routes.index);

var server = http.createServer(app);

server.listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});


var sio = require('socket.io');
var io = sio.listen(server);
var game = require('./game');

//io.set('log level', 1);
game.run(io);
