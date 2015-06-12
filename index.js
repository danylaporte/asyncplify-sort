var asyncplifyFs = require('asyncplify-fs');

function defaultComparer(a, b) {
	return a < b ? -1 : a > b ? 1 : 0;
}

module.exports = function (options) {
	return function (source) {

		var comparer = typeof options === 'function'
			? options
			: options && options.comparer || defaultComparer;

		var size = options && options.size || 10000;
		
		return source
			.pipe(asyncplifyFs.toPaged({
				beforeSaving: function (arg) { arg.items.sort(comparer); },
				size: size
			}))
			.pipe(require('./expandMerge')({ comparer: comparer, size: size }));
	};
};