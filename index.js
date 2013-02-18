module.exports = process.env.READER_COV ? require('./lib-cov/reader') : require('./lib/reader');
