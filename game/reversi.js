var SIZE = 8;

var BLACK = -1;
var EMPTY = 0;
var WHITE = 1;

var MAX_TURNS = 60;

var Point = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
};

var Disc = function (x, y, color) {
    this.x = x || 0;
    this.y = y || 0;
    this.color = color || EMPTY;
};

var vectors = [
    [-1, -1],
    [-1,  0],
    [-1,  1],
    [ 0, -1],
    [ 0,  1],
    [ 1, -1],
    [ 1,  0],
    [ 1,  1]
];

var dirs = [
    1 << 0,
    1 << 1,
    1 << 2,
    1 << 3,
    1 << 4,
    1 << 5,
    1 << 6,
    1 << 7
];

var Reversi = (function () {
    var Reversi = function () {
        this.init();
    };
    
    var R = Reversi;
    
    R.prototype.init = function () {
        var x, y;
        this.board = [];
        for (x = 0; x < SIZE; x++) {
            this.board[x] = [];
            for (y = 0; y < SIZE; y++) {
                this.board[x][y] = EMPTY;
            }
        }
        
        this.board[3][3] = WHITE;
        this.board[4][4] = WHITE;
        this.board[3][4] = BLACK;
        this.board[4][3] = BLACK;
        
        this.discs = {};
        this.discs[BLACK] = 2;
        this.discs[WHITE] = 2;
        this.discs[EMPTY] = SIZE * SIZE - 4;
        
        this.turns = 0;
        this.currentColor = BLACK;
        
        this.updateLog = [];
        
        this.initMovable();
        
        return this;
    };
    
    R.prototype.checkMobility = function (disc) {
        var x = disc.x;
        var y = disc.y;
        var color = disc.color;
        
        var board = this.board;
        
        if (this.board[x][y] !== EMPTY) {
            return 0;
        }
        
        var dir = 0;
        var vx, vy;
        var _x, _y;
        var count;
        var i;
        for (i in vectors) {
            vx = vectors[i][0];
            vy = vectors[i][1];
            _x = x + vx;
            _y = y + vy;
            count = 0;
            while (0 <= _x && _x < SIZE && 0 <= _y && _y < SIZE &&
                    board[_x][_y] === -color) {
                _x += vx;
                _y += vy;
                count++;
            }
            if (count && 0 <= _x && _x < SIZE && 0 <= _y && _y < SIZE &&
                    board[_x][_y] === color) {
                dir |= dirs[i];
            }
        }
        return dir;
    };
    
    R.prototype.move = function (point) {
        var x = point.x;
        var y = point.y;
        
        if (x < 0 || SIZE <= x) return false;
        if (y < 0 || SIZE <= y) return false;
        if (!this.movableDir[x][y]) return false;
        
        this.flipDiscs(point);
        this.turns++;
        this.currentColor = -this.currentColor;
        this.initMovable();
        return true;
    };
    
    R.prototype.initMovable = function () {
        var x, y;
        var disc;
        var dir;
        
        this.movableDir = [];
        this.movablePos = [];
        
        for (x = 0; x < SIZE; x++) {
            this.movableDir[x] = [];
            for (y = 0; y < SIZE; y++) {
                disc = new Disc(x, y, this.currentColor);
                dir = this.checkMobility(disc);
                if (dir) {
                    this.movablePos.push(disc);
                }
                this.movableDir[x][y] = dir;
            }
        }
    };
    
    R.prototype.flipDiscs = function (point) {
        var x = point.x;
        var y = point.y;
        var dir = this.movableDir[x][y];
        var _x, _y;
        var vx, vy;
        var i;
        var update = [];
        
        this.board[x][y] = this.currentColor;
        update.push(new Disc(x, y, this.currentColor));
        
        for (i in vectors) {
            if (dir & dirs[i]) {
                vx = vectors[i][0];
                vy = vectors[i][1];
                _x = x + vx;
                _y = y + vy;
                while (this.board[_x][_y] !== this.currentColor) {
                    this.board[_x][_y] = this.currentColor;
                    update.push(new Disc(_x, _y, this.currentColor));
                    _x += vx;
                    _y += vy;
                }
            }
        }
        
        this.updateLog.push(update);
        
        var diff = update.length;
        
        this.discs[this.currentColor] += diff;
        this.discs[-this.currentColor] -= diff - 1;
        this.discs[EMPTY] -= 1;
    };
    
    R.prototype.isGameOver = function () {
        if (this.turns === MAX_TURNS) return true;
        if (this.movablePos.length > 0) return false;
        
        var x, y, disc;
        disc = new Disc(0, 0, -this.currentColor);
        for (x = 0; x < SIZE; x++) {
            disc.x = x;
            for (y = 0; y < SIZE; y++) {
                disc.y = y;
                if (this.checkMobility(disc)) return false;
            }
        }
        return true;
    };
    
    R.prototype.pass = function () {
        if (this.movablePos.length) return false;
        if (this.isGameOver()) return false;
        
        this.currentColor = -this.currentColor;
        this.initMovable();
        return true;
    };
    
    return Reversi;
})();

exports.SIZE = SIZE;
exports.BLACK = BLACK;
exports.WHITE = WHITE;
exports.EMPTY = EMPTY;
exports.Reversi = Reversi;
