var PORT;

exports.index = function (req, res) {
    res.render('index', {port: PORT});
};

exports.setPort = function (port) {
    PORT = port;
};
