var assert = require('assert');
var asyncplify = require('asyncplify');
var fs = require('fs');
var should = require('should');
var expandMerge = require('../expandMerge.js');

describe('expandMerge', function () {
	it('should returns sorted results', function (done) {
		
		fs.writeFileSync('page1.json', '[1, 3, 5]');
		fs.writeFileSync('page2.json', '[2, 3, 4]');
		fs.writeFileSync('page3.json', '[2, 2, 5]');
		
		function comparer(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
		
		var array = [];
		
		var subject = asyncplify.subject();
		
		subject
			.pipe(expandMerge({
				comparer: comparer,
				size: 3
			}))
			.subscribe({
				emit: function (value) {
					array.push(value);
				},
				end: function (err) {
					assert(err === null);
					array.should.eql([1, 2, 2, 2, 3, 3, 4, 5, 5]);
					done();
				}
			});
			
		subject.emit('page1.json');
		subject.emit('page2.json');
		subject.emit('page3.json');
		subject.end();
		
	});
});