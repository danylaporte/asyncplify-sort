var Asyncplify = require('asyncplify');
var SegmentLoader = require('./segmentLoader');

function SegmentMerge(options, sink) {
	this.comparer = options.comparer;
	this.left = new SegmentLoader(this, options.left);
	this.right = new SegmentLoader(this, options.right);
	this.sink = sink;
	this.sink.source = this;
}

SegmentMerge.prototype = {
	close: function () {
		this.sink = null;
		this.left.dispose();
		this.right.dispose();
	},
	combine: function () {
		while (this.left.index < this.left.items.length && this.right.index < this.right.items.length && this.sink) {
			var leftItem = this.left.items[this.left.index];
			var rightItem = this.right.items[this.right.index];
			var compare = this.comparer(leftItem, rightItem);

			if (compare < 0) {
				this.left.index++;
				this.sink.emit(leftItem);
			} else if (compare > 0) {
				this.right.index++;
				this.sink.emit(rightItem);
			} else {
				this.left.index++;
				this.sink.emit(leftItem);

				if (this.sink) {
					this.right.index++;
					this.sink.emit(rightItem);
				}
			}
		}
	},
	combineRemaining: function (segment) {
		while (segment.index < segment.items.length && this.sink) {
			this.sink.emit(segment.items[segment.index++]);
		}
	},
	do: function () {
		this.combine();
		
		if (!this.right.filenames.length) this.combineRemaining(this.left);
		if (!this.left.filenames.length) this.combineRemaining(this.right);
		
		this.ensureLoaded();
		this.doEnd();
	},
	doEnd: function () {
		if (!this.left.filenames.length && !this.right.filenames.length && this.sink) {
			this.sink.end(null);
			this.sink = null;
		}
	},
	dispose: function () {
		this.left.dispose();
		this.right.dispose();
	},
	ensureLoaded: function () {
		if (this.sink) {
			this.left.loadPage();
			this.right.loadPage();
		}
	},
	pageLoaded: function (err) {
		if (err) {
			this.dispose();

			if (this.sink) {
				this.sink.end(err);
				this.sink = null;
			}
		} else {
			this.do();
		}
	}
};

module.exports = function (options) {
	return new Asyncplify(SegmentMerge, options);
};