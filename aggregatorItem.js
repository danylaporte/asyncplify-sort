var states = require('asyncplify').states;

function AggregatorItem(on, source) {
	this.isFetching = false;
	this.on = on;
	this.origin = source;
	this.source = null;
	this.value = null;
	
	on.items.push(this);
}

AggregatorItem.prototype = {
	emit: function (value) {
		this.value = value;
		this.source.setState(states.PAUSED);
		this.setFetching(false);
		this.on.emit();
	},
	end: function (err) {
		this.setFetching(false);
		this.remove();
		if (err || !this.on.items.length) this.on.end(err);
	},
	read: function () {
		this.setFetching(true);
		
		if (this.origin) {
			var o = this.origin;
			this.origin = null;
			o._subscribe(this);	
		} else {
			this.source.setState(states.RUNNING);
		}
	},
	remove: function () {
		for (var i = 0; i < this.on.items.length; i++) {
			if (this.on.items[i] === this) {
				this.on.items.splice(i, 1);
				break;
			}
		}
	},
	setFetching: function (value) {
		if (this.isFetching !== value) {
			this.isFetching = value;
			
			if (value)
				this.on.fetching++;
			else
				this.on.fetching--;
		}	
	},
	setState: function (state) {
		if (state === CLOSED) this.source.setState(state);
	}
};