var fs = require('fs');

function SegmentLoader(sortedMerge, filenames) {
	var self = this;

	this.filenames = filenames;
	this.handleLoaded = function (err, data) { self.pageLoaded(err, data); };
	this.index = 0;
	this.items = [];
	this.loading = false;
	this.sortedMerge = sortedMerge;

	this.loadPage();
}

SegmentLoader.prototype = {
	dispose: function () {
		for (var i = 0; i < this.filenames.length; i++) {
			fs.unlinkSync(this.filenames[i]);
		}
		this.filenames.length = 0;
	},
	loadPage: function () {
		if (this.filenames.length && this.index === this.items.length && !this.loading) {
			this.loading = true;
			this.index = 0;
			this.items.length = 0;
			fs.readFile(this.filenames[0], this.handleLoaded);
		}
	},
	pageLoaded: function (err, data) {
		this.loading = false;
		fs.unlinkSync(this.filenames.shift());

		if (!err) this.items = JSON.parse(data);
		this.sortedMerge.pageLoaded(err);
	}
};

module.exports = SegmentLoader;