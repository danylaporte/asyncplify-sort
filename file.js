var fs = require('fs');

function File(path, owner) {
	var self = this;
	
	this.handleReadCompleted = function (err, data) { self.readCompleted(err, data); };
    this.index = 0;
    this.items = [];
    this.lastSegment = false;
	this.owner = owner;
    this.path = path;
	
	this.read();
}

File.prototype = {
    read: function () {
		this.owner.reading++;
		fs.readFile(this.path, this.handleReadCompleted);        
    },
	readCompleted: function (err, data) {
		if (err) {
			this.error = err;
		} else {
			var rows = JSON.parse(data);
			var end = Math.min(rows.length, this.index + this.owner.segmentSize);
			
			this.items = rows.slice(this.index, end);
			this.lastSegment = rows.length === end;
			this.index = end;
			this.owner.error = this.owner.err || err;
		}
		
		this.owner.reading--;
		this.owner.update();
	}
};

module.exports = File;