var AggregatorItem = require('./aggregatorItem');
var states = require('asyncplify').states;

function Aggregator(options, on) {
	this.comparer = function (a, b) { return options.comparer(a.value, b.value); };
	this.fetching = 0;
	this.item = null;
	this.items = [];
	this.error = null;
	this.on = on;
	this.state = states.RUNNING;
	this.value = null;

	on.source = this;

	var i;

	for (i = 0; i < options.readers.length; i++) {
		this.items.push(new AggregatorItem(this, options.readers[i]));
	}

	for (i = this.items.length - 1; i > -1; i--) {
		this.items[i].read();
	}
}

Aggregator.prototype = {
	do: function () {
		if (this.item) {
			var item = this.item;
			this.item = null;
			this.on.emit(item.value);
		}

		if (this.endCalled) {
			this.state = states.CLOSED;
			this.on.end()
		}
	},
	emit: function () {
		if (!this.fetching) {
			this.items.sort(this.comparer);

			var item = this.items[0];

			if (this.state === states.RUNNING) {
				this.on.emit(item.value);
				item.read();
			} else if (this.state === states.PAUSED) {
				this.item = item;
			}
		}
	},
	end: function (err) {
		if (this.state === states.RUNNING) {
			if (err && !this.error) {
				this.error = err;
				this.state(states.CLOSED);
				this.on.end(err);
			} else if (!err) {
				this.on.end(null);
			}
		} else {
			this.error = err;
		}
	},
	setState: function (state) {
		if (this.state !== state && this.state !== states.CLOSED) {
			this.state = state;

			if (this.item) {
				var v =
					this.item = null;
			}

			for (var i = this.items.length - 1; i > -1 && this.state === state; i--) {
				this.items[i].setState(state);
			}
		}
	}
};