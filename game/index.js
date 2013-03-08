'use strict'

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
var strftime = require('strftime');

var characters =
        'abcdefghijklmnopqrstuvwxyz' +
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
        '0123456789_';

var randomToken = function (n) {
    var i, len, res;
    res = '';
    len = characters.length;
    for (i = 0; i < n; i++) {
        res += characters[Math.random() * len | 0];
    }
    return res;
};

var generateAnonymousName = function () {
    var name = '@anonymous_';
    for (var n = 0; players[name + n]; n++);
    return name + n;
};

var DEBUG = true;

var log = function () {
    var a = arguments;
    if (DEBUG) {
        console.log(
            '[' + strftime('%Y-%m-%d %H:%M:%S') + '] ' +
            Array.prototype.slice.apply(a).join(' '));
    }
};

var addPlayer = function (name, socket) {
    if (name in players) return false;
    players[name] = {
        name: name,
        socket: socket
    };
    playerCount++;
    return true;
};

var destoryPlayer = function (name) {
    var i;
    if (name in players) {
        delete players[name];
        i = playerQueue.indexOf(name);
        if (i != -1) {
            playerQueue.splice(i, 1);
        }
    }
};

var matchPlayers = function (name) {
    if (!(name in players)) return;
    if (playerQueue.indexOf(name) !== -1) return;
    
    players[name].socket.emit('hide_message_log');
    if (players[name].userMessageTo) {
        if (players[name].userMessageTo.userMessageTo) {
            delete players[name].userMessageTo.userMessageTo;
        }
        players[name].userMessageTo.socket.emit('hide_message_log');
        delete players[name].userMessageTo;
    }
    
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
        
        player.userMessageTo = oppPlayer;
        player.socket.emit('clear_message_log');
        player.socket.emit('show_message_log');
        player.socket.emit('user_message',
            'You can send messages to the opposite player.', '[System]');
        
        if (player.color === game.currentColor) {
            player.socket.emit('set_movable_pos', game.movablePos);
        } else {
            player.socket.emit('set_movable_pos', []);
        }
        
        log('game started!', name, '&', oppName);
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
    socket.emit('set_movable_pos', []);
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
    player.socket.emit('game_ended');
    player.opponent.socket.emit('game_ended');
    cleanUpGame(name);
};

var stopGame = function (name) {
    var opponent = players[name].opponent;
    alert(opponent.socket, 'The opponent player disconnected.\n' +
            'The game was stopped.');
    opponent.socket.emit('game_ended');
    cleanUpGame(name);
};

var rname = /^\w+$/;

var validName = function (name) {
    if (!name) {
        return false;
    }
    return rname.test(name);
};

var commands = {};

commands.testMessage = function (socket) {
    for (var i = 0; i < 50; i++) {
        socket.emit('message', 'this is test message ' + (i + 1));
    }
};

commands.tilt = function (socket) {
    socket.emit('tilt');
};

var execute = function (socket, str) {
    var args = str.trim().slice(1).split(/\s+/);
    var command = args[0];
    args = args.slice(1);
    switch (command) {
    case 'test-message':
        commands.testMessage(socket);
        break;
    case 'tilt':
        commands.tilt(socket);
        break;
    default:
        return false;;
    }
    return true;
};

var run = function (io) {
    io.sockets.on('connection', function (socket) {
        var name = null;
        
        userCount++;
        log('connected!');
        log('online users:', userCount);
        
        socket.on('ready', function () {
            socket.emit('set_user_count', userCount);
            socket.broadcast.emit('set_user_count', userCount);
        });
        
        socket.on('get_constants', function () {
            socket.emit('set_constants', constants);
        });
        
        socket.on('sign_in', function (username, password) {
            if (name) return;
            data.getUser(username, password, function (err, doc) {
                if (err) {
                    return;
                }
                if (!doc) {
                    socket.emit('message', 'Username or password is wrong.');
                    return;
                }
                var res = addPlayer(doc.name, socket);
                if (res) {
                    name = doc.name;
                    socket.set('name', doc.name);
                    socket.emit('signed_in', name);
                    socket.emit('message',
                        'Click the above button to start game.');
                    data.getToken(name, function (token) {
                        if (token) {
                            socket.emit('set_sign_in_token', token);
                        }
                    });
                    log('signed in! -', username);
                } else {
                    socket.emit('message', 'Signing in failed.');
                }
            });
        });
        
        socket.on('sign_in_with_token', function (token) {
            if (name) return;
            data.getUserByToken(token, function (err, doc) {
                var res;
                if (!err && doc) {
                    res = addPlayer(doc.name, socket);
                    if (res) {
                        name = doc.name;
                        socket.set('name', name);
                        socket.emit('signed_in', name);
                        socket.emit('message',
                            'Click the above button to start game.');
                        data.destroyToken(token);
                        data.getToken(name, function (token) {
                            if (token) {
                                socket.emit('set_sign_in_token', token);
                            }
                        });
                        log('signed in! -', name);
                    }
                }
            });
        });
        
        socket.on('sign_in_as_anonymous', function () {
            if (name) return;
            name = generateAnonymousName();
            var res = addPlayer(name, socket);
            if (res) {
                socket.set('name', name);
                socket.emit('signed_in', name);
                socket.emit('Click the above button to star game.');
                log('signed in! -', name);
            }
        });
        
        socket.on('sign_up', function (username, password) {
            if (name) return;
            if (!username || !password) return;
            if (!validName(username)) {
                socket.emit('message', 'Invalid username.');
                return;
            }
            
            data.getUser(username, function (err, doc) {
                var res;
                if (!doc) {
                    data.addUser(username, password);
                    res = addPlayer(username, socket);
                    if (res) {
                        name = username;
                        socket.set('name', username);
                        socket.emit('signed_in', name);
                        socket.emit('message',
                            'Click the above button to start game.');
                        data.getToken(name, function (token) {
                            if (token) {
                                socket.emit('set_sign_in_token', token);
                            }
                        });
                        log('signed up! -', username);
                    } else {
                        socket.emit('message', 'Signing in failed');
                    }
                } else {
                    socket.emit('message', 'The name already exists.');
                }
            });
        });
        
        socket.on('user_message', function (text) {
            if (!text) return;
            text += '';
            
            var res;
            if (text.trim().charAt(0) === '!') {
                res = execute(socket, text);
                if (res) return;
            }
            
            if (players[name].userMessageTo) {
                players[name].socket.emit('user_message', text, name);
                players[name].userMessageTo.socket.emit('user_message', text, name);
            }
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
                socket.emit('message', 'It\'s not your turn.', true);
                return;
            }
            var res = game.move(point);
            if (!res) {
                socket.emit('message', 'You cannot move there.', true);
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
            if (name && players[name]) {
                if (players[name].userMessageTo &&
                    players[name].userMessageTo.userMessageTo) {
                    players[name].userMessageTo.socket
                        .emit('hide_message_log');
                    delete players[name].userMessageTo.userMessageTo;
                }
                if (players[name].game) {
                    stopGame(name);
                }
            }
            destoryPlayer(name);
            userCount--;
            socket.broadcast.emit('set_user_count', userCount);
            log('disconnected!');
            log('online users:', userCount);
        });
    });
};

exports.run = run;
