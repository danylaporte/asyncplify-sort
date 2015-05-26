var asyncplify = require('asyncplify');
var asyncFs = require('asyncplify-fs');
var fs = require('fs');

module.exports = function (filename, segmentSize) {
	var segment = [];
	var index = 0;
	var lastSegment = false;
	
	return asyncplify
		.infinite()
		.takeUntil(function () { return !lastSegment; })
		.flatMap({
			mapper: function () {
				if (segment.length)
					return asyncplify.value(segment.shift());
				
				return asyncFs
					.readFile(filename)
					.map(function (data) {
						var rows = JSON.parse(data);
						var end = Math.min(rows.length, index + segmentSize);
						
						lastSegment = end === rows.length;
						segment = rows.slice(index, end);
						return segment.value();		
					});
			},
			maxConcurrency: 1
		})
		.finally(function () { fs.unlink(filename); });
};