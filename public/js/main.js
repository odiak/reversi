(function () {
    var $ = jQuery;
    var socket = io.connect('http://' + location.host);
    
    var flags = 0; 
    var callback = function () {
        flags--;
        if (flags) return;
        onLoad();
    };
    
    socket.on('connect', callback); flags++;
    $(window).on('load', callback); flags++;
    
    
    // DOM elements
    var connecting;
    var register;
    var signIn;
    var signUp;
    var main;
    var startButton;
    var nameInput;
    var boardWrap;
    var board;
    var cells
    var message;
    var userCount;
    var discCount;
    
    var SIZE;
    var BLACK;
    var WHITE;
    var EMPTY;
    
    var selfName;
    var opponentName;
    
    var boardReady = false;
    
    var onLoad = function () {
        connecting  = $('#connecting');
        register    = $('#register');
        signIn      = $('#sign-in');
        signUp      = $('#sign-up');
        main        = $('#main');
        startButton = $('#game-start');
        nameInput   = $('#name-input')
        boardWrap   = $('#board-wrap');
        message     = $('#message');
        userCount   = $('#user-count');
        discCount   = $('#disc-count');
        
        socket.emit('ready');
        socket.emit('get_constants');
        
        socket.on('set_constants', function (consts) {
            SIZE = consts.SIZE;
            BLACK = consts.BLACK;
            WHITE = consts.WHITE;
            EMPTY = consts.EMPTY;
            renderBoard();
            boardReady = true;
        });
        
        connecting.hide();
        signIn.show();
        
        signIn.find('a:link').on('click', function () {
            signIn.hide();
            signIn.find('.username').val('');
            signIn.find('.password').val('');
            signUp.show();
            signUp.find('.username').focus();
            return false;
        });
        
        signUp.find('a:link').on('click', function () {
            signUp.hide();
            signUp.find('.username').val('');
            signUp.find('.password').val('');
            signIn.show();
            signIn.find('.username').focus();
            return false;
        });
        
        signIn.find('.username').focus();
        
        signIn.find('form').on('submit', function () {
            var username = $(this).find('.username').val();
            var password = $(this).find('.password').val();
            socket.emit('sign_in', username, password);
            return false;
        });
        
        signUp.find('form').on('submit', function () {
            var username = $(this).find('.username').val();
            var password = $(this).find('.password').val();
            socket.emit('sign_up', username, password);
            return false;
        });
        
        socket.on('signed_in', function (name) {
            nameInput.val('');
            selfName = name;
            register.hide();
            main.show();
            showMessage('Click the above button to start game.');
        });
        
        startButton.on('click', function () {
            if (!boardReady) {
                showMessage('Please wait a moment...');
                return;
            }
            console.log('start!');
            socket.emit('start_game');
        });
        
        socket.on('message', function (text) {
            showMessage(text);
        });
        
        socket.on('update_board', function (updates) {
            updateBoard(updates);
        });
        
        socket.on('set_board', function (board) {
            setBoard(board);
        });
        
        socket.on('confirm', function (token, message) {
            var res = confirm(message);
            socket.emit('confirm_result_' + token, !!res);
        });
        
        socket.on('alert', function (message) {
            alert(message);
        });
        
        socket.on('set_movable_pos', function (movablePos) {
            setMovablePos(movablePos);
        });
        
        socket.on('set_user_count', function (count) {
            setUserCount(count);
        });
        
        socket.on('set_disc_count', function (discs, names, currentColor) {
            setDiscCount(discs, names, currentColor);
        });
    };
    
    var renderBoard = function () {
        board = $.create('table', {id: 'board'});
        var x, y, tr, td, div;
        for (y = 0; y < SIZE; y++) {
            tr = $.create('tr');
            for (x = 0; x < SIZE; x++) {
                td = $.create('td');
                div = $.create('div');
                div.attr('id', 'cell_' + x + '_' + y);
                td.append(div);
                tr.append(td);
            }
            board.append(tr);
        }
        
        boardWrap.append(board);
        
        cells = board.find('td');
        cells.on('mousedown', function () {
            var cell = $(this);
            var i = cells.index(cell);
            var x = i % SIZE;
            var y = i / SIZE | 0;
            socket.emit('click', {x: x, y: y});
            return false;
        });
    };
    
    var updateBoard = function (updates) {
        var update, x, y, color, className;
        var i, len;
        for (i = 0, len = updates.length; i < len; i++) {
            update = updates[i];
            x = update.x;
            y = update.y;
            color = update.color;
            switch (color) {
                case BLACK:
                className = 'black';
                break;
                
                case WHITE:
                className = 'white';
                break;
                
                case EMPTY:
                className = '';
                break;
                
                default:
                continue;
            }
            $('#cell_' + x + '_' + y)
            .removeClass('black')
            .removeClass('white')
            .addClass(className);
        }
    };
    
    var setBoard = function (board) {
        var updates = [];
        var x, y;
        for (x = 0; x < SIZE; x++) {
            for (y = 0; y < SIZE; y++) {
                updates.push({
                    x: x,
                    y: y,
                    color: board[x][y]
                });
            }
        }
        updateBoard(updates);
    };
    
    var showMessage = function (text) {
        message.text(text);
    };
    
    var setMovablePos = function (movablePos) {
        var i, _len, x, y;
        cells.find('> div').removeClass('movable');
        for (i = 0, _len = movablePos.length; i < _len; i++) {
            x = movablePos[i].x;
            y = movablePos[i].y;
            $('#cell_' + x + '_' + y).addClass('movable');
        }
    };
    
    var setUserCount = function (count) {
        userCount.text('Online Users: ' + count);
    };
    
    var setDiscCount = function (discs, names, currentColor) {
        var c = names[BLACK] === selfName ? BLACK : WHITE;
        names[c] += '(you)';
        discCount.find('.black .name').text(names[BLACK]);
        discCount.find('.black .count').text(discs[BLACK] + '');
        discCount.find('.white .name').text(names[WHITE]);
        discCount.find('.white .count').text(discs[WHITE] + '');
        discCount.find('tr').removeClass('current-color');
        if (currentColor === BLACK) {
            discCount.find('.black').addClass('current-color');
        } else {
            discCount.find('.white').addClass('current-color');
        }
    };
})();
