var Asyncplify = require('asyncplify');
var debug = require('debug')('asyncplify-sort:fileReader');
var fs = require('fs');
var File = require('./file');
var states = Asyncplify.states;

function FileReader(options, on) {
    var comparer = options.comparer;

    this.comparer = function (a, b) { return comparer(a.items[0], b.items[0]); };
    this.count = 0;
    this.error = null;
    this.files = [];
    this.mustSort = true;
    this.on = on;
    this.reading = 0;
    this.segmentSize = Math.max(options.pageSize / options.filenames.length, 10);
    this.state = states.RUNNING;
    
    debug('read first segments of %d files', options.filenames.length);

    for (var i = 0; i < options.filenames.length; i++) {
        this.files.push(new File(options.filenames[i], this));
    }
}

FileReader.prototype = {
    cleanFiles: function () {
        if ((this.state === states.CLOSED || this.error) && !this.reading && this.files.length) {
            debug('deleting %d files', this.filenames.length);
            
            for (var i = 0; i < this.files.length; i++) {
                fs.unlink(this.files[i].path);
            }

            this.files.length = 0;
        }  
    },
    emit: function () {
        while (!this.reading && !this.error && this.files.length && this.state === states.RUNNING) {
            var file = this.files[0];
            var item = file.items.shift();

            this.count++;
            this.on.emit(item);

            if (file.items.length) {
                
                this.sort(true);
                
            } else if (this.states !== states.CLOSED) {
                
                if (file.lastSegment) {
                    this.files.shift();
                } else {
                    this.mustSort = true;
                    file.read();
                }                
            }
        }
    },
    end: function () {
        if (this.state === states.RUNNING && (!this.files.length || this.error)) {
            this.state = states.CLOSED;
            debug('have emit %d items', this.count);
            this.on.end(this.error);
        }
    },
    setState: function (state) {
        if (this.state !== state && this.state !== states.CLOSED) {
            this.state = state;
            if (state !== states.PAUSED) this.update();
        }
    },
    sort: function (force) {
        if (force && !this.error && !this.reading && this.state === states.RUNNING) {
            this.mustSort = false;
            this.files.sort(this.comparer);
        }
    },
    update: function () {
        this.sort(this.mustSort);
        this.emit();
        this.end();
        this.cleanFiles();
    }
};

module.exports = function (options) {
    return new Asyncplify(FileReader, options);
};