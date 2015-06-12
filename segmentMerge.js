var Asyncplify = require('asyncplify');
var SegmentLoader = require('./segmentLoader');
var states = Asyncplify.states;

function SegmentMerge(options, on) {
	this.comparer = options.comparer;
	this.left = new SegmentLoader(this, options.left);
	this.right = new SegmentLoader(this, options.right);
	this.on = on;
	this.state = states.RUNNING;
	
	on.source = this;
}

SegmentMerge.prototype = {
	combine: function () {
		while (this.left.index < this.left.items.length && this.right.index < this.right.items.length && this.state === states.RUNNING) {
			var leftItem = this.left.items[this.left.index];
			var rightItem = this.right.items[this.right.index];
			var compare = this.comparer(leftItem, rightItem);

			if (compare < 0) {
				this.left.index++;
				this.on.emit(leftItem);
			} else if (compare > 0) {
				this.right.index++;
				this.on.emit(rightItem);
			} else {
				this.left.index++;
				this.on.emit(leftItem);

				if (this.state === states.RUNNING) {
					this.right.index++;
					this.on.emit(rightItem);
				}
			}
		}
	},
	combineRemaining: function (segment) {
		while (segment.index < segment.items.length && this.state === states.RUNNING) {
			this.on.emit(segment.items[segment.index++]);
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
		if (!this.left.filenames.length && !this.right.filenames.length && this.state === states.RUNNING) {
			this.state = states.CLOSED;
			this.on.end(null);
		}
	},
	dispose: function () {
		this.left.dispose();
		this.right.dispose();
	},
	ensureLoaded: function () {
		if (this.state === states.RUNNING) {
			this.left.loadPage();
			this.right.loadPage();
		}
	},
	pageLoaded: function (err) {
		if (err) {
			this.dispose();

			if (this.state !== states.CLOSED) {
				this.state = states.CLOSED;
				this.on.end(err);
			}
		} else {
			this.do();
		}
	},
	setState: function (state) {
		if (this.state !== state && this.state !== states.CLOSED) {
			this.state = state;
			if (state === states.RUNNING) this.do();
			if (state === states.CLOSED) this.dispose();
		}
	}
};

module.exports = function (options) {
	return new Asyncplify(SegmentMerge, options);
};