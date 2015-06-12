var assert = require('assert');
var asyncplify = require('asyncplify');
var asyncplifySort = require('..');
var should = require('should');

function itShouldEmitOrderedResultsOn(count, title) {
	it('should return ordered results on ' + title, function (done) {
		var index = 1;
		
		asyncplify
			.range(count)
			.map(function (v) { return count - v; })
			.pipe(asyncplifySort())
			.subscribe({
				emit: function (value) {
					value.should.eql(index++);
				},
				end: function (err) {
					assert(err === null);
					index.should.equal(count + 1);
					done();
				}
			});
	});
}

describe('asyncplify-sort', function () {
	itShouldEmitOrderedResultsOn(2, 'small dataset');
	itShouldEmitOrderedResultsOn(10000, 'page limit end');
	itShouldEmitOrderedResultsOn(10001, 'page limit start');
	itShouldEmitOrderedResultsOn(100000, 'large dataset');
});