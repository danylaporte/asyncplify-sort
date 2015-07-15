var Asyncplify = require('asyncplify');
var asyncplifyFs = require('asyncplify-fs');
var debug = require('debug')('asyncplify-sort:expandMerge');
var fs = require('fs');
var segmentMerge = require('./segmentMerge');
var states = Asyncplify.states;

function ExpandMerge(options, on, source) {
	this.comparer = options.comparer;
	this.filenames = options.filenames;
	this.on = on;
	this.ready = options.ready;
	this.source = null;
	this.size = options.size;
	this.state = states.RUNNING;

	debug('source subscribing');

	on.source = this;
	source._subscribe(this);
}

ExpandMerge.prototype = {
	do: function () {
		if (!this.source && this.state === states.RUNNING) {
			if (this.ready.length > 1) 
				this.doMerge();
			else if (this.ready.length)
				this.doEmitValues();
		}
	},
	doEmitValues: function () {
		debug('emit received segment');
		this.emit = this.emitValue;
		this.end = this.endValue;
		
		asyncplifyFs
			.fromPaged(this.ready[0])
			._subscribe(this);
	},
	doMerge: function () {
		debug('merging 2 segments of %d', this.ready.length);

		var source = segmentMerge({
			comparer: this.comparer,
			left: this.ready.pop(),
			right: this.ready.pop()
		});

		if (this.ready.length) {
			source = source.pipe(asyncplifyFs.toPaged(this.size));
			this.emit = this.emitSegment;
			this.end = this.endSegment;
		} else {
			this.emit = this.emitValue;
			this.end = this.endValue;
		}

		source._subscribe(this);
	},
	emit: function (filename) {
		debug('receive a new page');
		this.ready.push([filename]);
	},
	emitSegment: function (filename) {
		debug('received a merged page');
		this.filenames.push(filename);
	},
	emitValue: function (value) {
		this.on.emit(value);
	},
	end: function (err) {
		this.source = null;
		
		if (!err) debug('finish receiving pages.');

		if (err || !this.ready.length) {
			this.state = states.CLOSED;
			this.on.end(err);
		} else {
			this.emit = this.emitSegment;
			this.end = this.endSegment;
			this.do();
		}
	},
	endSegment: function (err) {
		var count = this.filenames.length;
		this.source = null;
		this.ready.push(this.filenames.concat());
		this.filenames.length = 0;

		if (err) {
			debug('segment merge error', err);
			this.state = states.CLOSED;
			this.on.end(err);
		} else {
			debug('segment of %d pages merged', count);
			this.do();
		}
	},
	endValue: function (err) {
		this.state = states.CLOSED;
		this.on.end(err);
	},
	setState: function (state) {
		if (this.state !== state && this.state !== states.CLOSED) {
			this.state = state;
			if (this.source) this.source.setState(state);
			if (this.state === states.RUNNING) this.do();
		}
	}
};

function deleteFiles(files) {
	for (var i = 0; i < files.length; i++) {
		try {
			fs.unlinkSync(files[i]);
		} catch (ex) {
		}
	}
}

function deleteSegments(segments) {
	for (var i = 0; i < segments.length; i++) {
		deleteFiles(segments[i]);
	}
}

module.exports = function (options) {
	return function (source) {
		var params = {
			comparer: options.comparer,
			filenames: [],
			ready: [],
			size: options.size
		};

		return new Asyncplify(ExpandMerge, params, source)
			.finally(function () {
			deleteFiles(params.filenames);
			deleteSegments(params.ready);
		});
	};
};