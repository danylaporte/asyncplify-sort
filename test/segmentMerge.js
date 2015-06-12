var assert = require('assert');
var fs = require('fs');
var should = require('should');
var segmentMerge = require('../segmentMerge.js');

describe('segmentMerge', function () {
	it('should returns sorted results', function (done) {
		
		fs.writeFileSync('page1.json', '[1, 3, 5]');
		fs.writeFileSync('page2.json', '[2, 3, 4, 6]');
		fs.writeFileSync('page3.json', '[6, 8]');
		
		function comparer(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
		
		var array = [];
		
		segmentMerge({ comparer: comparer, left: ['page1.json'], right: ['page2.json', 'page3.json'] })
			.subscribe({
				emit: function (value) {
					array.push(value);
				},
				end: function (err) {
					assert(err === null);
					array.should.eql([1, 2, 3, 3, 4, 5, 6, 6, 8]);
					done();
				}
			});
	});
});