var reversi = require('./reversi');
var Reversi = reversi.Reversi;

var players = {};
var playerCount = 0;
var playerQueue = [];

var userCount = 0;

var constants = {
    SIZE: reversi.SIZE,
    BLACK: reversi.BLACK,
    WHITE: reversi.WHITE,
    EMPTY: reversi.EMPTY
};

var data = require('./data');

var characters =
        'abcdefghijklmnopqrstuvwxyz' +
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
        '0123456789';

var randomToken = function (n) {
    var i, len, res;
    res = '';
    len = characters.length;
    for (i = 0; i < n; i++) {
        res += characters[Math.random() * len | 0];
    }
    return res;
};

var registerPlayer = function (name, socket) {
    if (!name) return false;
    name += '';
    if (name in players) return false;
    players[name] = {
        name: name,
        socket: socket
    };
    playerCount++;
    return true;
};

var destoryPlayer = function (name) {
    if (name in players) {
        delete players[name];
    }
};

var matchPlayers = function (name) {
    if (!(name in players)) return;
    if (playerQueue.indexOf(name) !== -1) return;
    
    var socket = players[name].socket;
    socket.emit('message', 'Finding another player...');
    
    var len = playerQueue.length;
    var oppName;
    var success = false;
    while (len > 0) {
        oppName = playerQueue.shift();
        len--;
        if (oppName in players) {
            success = true;
            break;
        }
    }
    if (!success) {
        playerQueue.push(name);
        return;
    }
    startGame([name, oppName]);
};

var startGame = function (names) {
    var game = new Reversi();
    var colors = [reversi.WHITE, reversi.BLACK];
    var i, socket, name, oppName, player, oppPlayer;
    for (i = 0; i < 2; i++) {
        name = names[i];
        player = players[name];
        oppName = names[1 - i];
        oppPlayer = players[oppName];
        player.game = game;
        player.color = colors[i];
        player.opponent = oppPlayer;
        player.socket.emit('message', 'Game started!');
        pushBoard(name);
        if (player.color === game.currentColor) {
            player.socket.emit('set_movable_pos', game.movablePos);
        } else {
            player.socket.emit('set_movable_pos', []);
        }
    }
    updateDiscCount(names[0]);
    updateDiscCount(names[1]);
};

var pushBoard = function (name) {
    var player = players[name];
    if (!player) return;
    var socket = player.socket;
    var game = player.game;
    if (!game) return;
    socket.emit('set_board', game.board);
};

var updateDiscCount = function (name) {
    var player = players[name];
    var socket = player.socket;
    var color = player.game.currentColor;
    var discs = player.game.discs;
    var names = {};
    names[player.color] = name;
    names[player.opponent.color] = player.opponent.name;
    socket.emit('set_disc_count', discs, names, color);
};

var clearBoard = function (name) {
    var socket = players[name].socket;
    var x, y;
    var board = [];
    for (x = 0; x < reversi.SIZE; x++) {
        board[x] = [];
        for (y = 0; y < reversi.SIZE; y++) {
            board[x][y] = reversi.EMPTY;
        }
    }
    socket.emit('set_board', board);
};

var confirm = function (socket, message, callback) {
    var token = randomToken(10);
    socket.emit('confirm', token, message);
    socket.once('confirm_result_' + token, callback);
};

var alert = function (socket, message) {
    socket.emit('alert', message);
};

var cleanUpGame = function (name) {
    var oppName = players[name].opponent.name;
    delete players[oppName].game;
    delete players[oppName].color;
    delete players[oppName].opponent;
    delete players[name].game;
    delete players[name].color;
    delete players[name].opponent;
};

var endGame = function (name) {
    var player = players[name];
    var game = player.game;
    var color = player.color;
    var drawMessage = 'It\'s draw.';
    var winMessage = 'You win!';
    var loseMessage = 'You lose.';
    var diff = game.discs[color] - game.discs[-color];
    if (diff === 0) {
        alert(player.socket, drawMessage);
        alert(player.opponent.socket, drawMessage);
    }
    else if (diff > 0) {
        alert(player.socket, winMessage);
        alert(player.opponent.socket, loseMessage);
    }
    else {
        alert(player.socket, loseMessage);
        alert(player.opponent.socket, winMessage);
    }
    cleanUpGame(name);
};

var stopGame = function (name) {
    var opponent = players[name].opponent;
    alert(opponent.socket, 'The opponent player disconnected.\n' +
            'The game was stopped.');
    cleanUpGame(name);
};

var run = function (io) {
    io.sockets.on('connection', function (socket) {
        var name = null;
        
        userCount++;
        
        socket.on('ready', function () {
            socket.emit('set_user_count', userCount);
            socket.broadcast.emit('set_user_count', userCount);
        });
        
        socket.on('get_constants', function () {
            socket.emit('set_constants', constants);
        });
        
        socket.on('register_name', function (_name) {
            if (name) return;
            var res = registerPlayer(_name, socket);
            if (res) {
                name = _name
                socket.emit('registered', name);
            } else {
                socket.emit('message', 'You cannot use this name.');
            }
        });
        
        socket.on('sign_in', function (username, password) {
            if (!username || !password) return;
            
            data.getUser(username, password, function (err, doc) {
                
            });
        });
        
        socket.on('sign_up', function (username, password) {
            if (!username || !password) return;
            
            data.getUser(username, function (err, doc) {
                console.log(doc);
                if (!doc) {
                    data.addUser(username, password);
                }
            });
        });
        
        socket.on('start_game', function () {
            if (!name) return;
            var message, callback;
            if (players[name].game) {
                message = 'Are you sure you want to start new game?';
                callback = function (res) {
                    if (res) {
                        stopGame(name);
                        clearBoard(name);
                        matchPlayers(name);
                    }
                };
                confirm(socket, message, callback);
            } else {
                clearBoard(name);
                matchPlayers(name);
            }
        });
        
        socket.on('click', function (point) {
            if (!name) return;
            var player = players[name];
            var game = player.game;
            if (!game) return;
            if (game.currentColor !== player.color) {
                socket.emit('message', 'It\'s not your turn.');
                return;
            }
            var res = game.move(point);
            if (!res) {
                socket.emit('message', 'You cannot move there.');
                return;
            }
            var update = game.updateLog.slice(-1)[0];
            player.socket.emit('update_board', update);
            player.opponent.socket.emit('update_board', update);
            player.socket.emit('set_movable_pos', []);
            player.opponent.socket.emit('set_movable_pos',
                    game.movablePos);
            updateDiscCount(name);
            updateDiscCount(player.opponent.name);
            if (game.isGameOver()) {
                endGame(name);
            } else if (game.pass()) {
                player.socket.emit('set_movable_pos', game.movablePos);
                player.opponent.socket.emit('set_movable_pos', []);
                alert(player.socket, 'passed.');
                alert(player.opponent.socket, 'passed.');
                updateDiscCount(name);
                updateDiscCount(player.opponent.name);
            }
        });
        
        socket.on('disconnect', function () {
            if (players[name] && players[name].game) {
                stopGame(name);
            }
            destoryPlayer(name);
            userCount--;
            socket.broadcast.emit('set_user_count', userCount);
        });
    });
};

exports.run = run;
