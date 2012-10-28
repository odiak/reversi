var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    name: String,
    password: String
});

var SignInTokenSchema = new Schema({
    token: String,
    user_id: Schema.Types.ObjectId
});

mongoose.model('User', UserSchema);
mongoose.model('SignInToken', SignInTokenSchema);

mongoose.connect('mongodb://localhost/reversi');

var User = mongoose.model('User');
var SignInToken = mongoose.model('SignInToken');

var characters =
    '0123456789' +
    'abcdefghijklmnopqrstuvwxyz' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

var generateToken = function (n) {
    var i;
    var len = characters.length;
    var token = '';
    for (i = 0; i < n; i++) {
        token += characters.charAt(Math.random() * len | 0);
    }
    return token;
};

var addUser = function (name, password) {
    var user = new User();
    user.name = name;
    user.password = password;
    user.save();
};

var getUser = function (name, password, callback) {
    if (typeof callback === 'undefined' &&
        typeof password === 'function') {
        callback = password;
        User.findOne({name: name}, callback);
    } else {
        User.findOne({name: name, password: password}, callback);
    }
};

var getToken = function (name, callback) {
    User.findOne({name: name}, function (err, doc) {
        var signInToken = new SignInToken();
        var token;
        if (!err && doc) {
            token = generateToken(16);
            signInToken.token = token;
            signInToken.user_id = doc._id;
            signInToken.save();
            callback(token);
        } else {
            callback(false);
        }
    });
};

var getUserByToken = function (token, callback) {
    SignInToken.findOne({token: token}, function (err, doc) {
        if (!err && doc) {
            User.findOne({_id: doc.user_id}, callback);
        } else {
            callback(err, null);
        }
    });
};

var destroyToken = function (token) {
    SignInToken.remove({token: token}).exec();
};

exports.addUser = addUser;
exports.getUser = getUser;
exports.getToken = getToken;
exports.getUserByToken = getUserByToken;
exports.destroyToken = destroyToken;
exports.generateToken = generateToken;
