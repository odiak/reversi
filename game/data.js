var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    name: String,
    password: String
});
mongoose.model('User', UserSchema);

mongoose.connect('mongodb://localhost/reversi');

var User = mongoose.model('User');

var addUser = function (name, password) {
    var user = new User();
    user.name = name;
    user.password = password;
    user.save();
};

var getUser = function (name, password, callback) {
    if (typeof callback === 'undefined') {
        callback = password;
        User.findOne({name: name}, callback);
    } else {
        User.findOne({name: name, password: password}, callback);
    }
};

exports.addUser = addUser;
exports.getUser = getUser;
