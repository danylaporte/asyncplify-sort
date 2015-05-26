var asyncplify = require('asyncplify');
var fs = require('asyncplify-fs');
var temp = require('temp');

module.exports = function (options) {
	function writeFile(items) {
		var filename = temp.path();

		return fs
			.writeFile({ path: filename, data: JSON.stringify(items.sort(options.comparer)) })
			.map(function () { return filename; });
	}

	return function (source) {
		return source
			.toArray(options && options.pageSize || 10000)
			.flatMap(writeFile)
			.toArray();
	};
};