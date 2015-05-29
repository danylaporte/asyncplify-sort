var asyncplify = require('asyncplify');
var fileReader = require('./fileReader');
var fileWriter = require('./fileWriter');

function defaultComparer(a, b) {
	return a < b ? -1 : a > b ? 1 : 0;
}

module.exports = function (options) {
	return function (source) {

		var comparer = typeof options === 'function'
			? options
			: options && options.comparer || defaultComparer;

		var pageSize = options && options.pageSize || 10000;

		return source
			.pipe(fileWriter({ comparer: comparer, pageSize: pageSize }))
			.flatMap(function (saveResult) {

				if (saveResult.filenames.length) {
					return fileReader({
						comparer: comparer,
						filenames: saveResult.filenames,
						pageSize: pageSize
					});
				}
				
				return asyncplify.fromArray(saveResult.items.sort(comparer));
			});
	};
};