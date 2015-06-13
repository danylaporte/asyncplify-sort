# asyncplify-sort
In-memory and external sort for asyncplify.

[External sorting](http://en.wikipedia.org/wiki/External_sorting) performed by [asyncplify](https://github.com/danylaporte/asyncplify) can sort relatively large dataset that
don't necessarily fit in memory.

## Installation

```bash
npm install asyncplify-sort
```

## Example

```js
var asyncplify = require('asyncplify');
var asyncplifySort = require('asyncplify-sort');

asyncplify
    .range(100000)
    .map(function (v) { return 100000 - v; })
    .pipe(asyncplifySort())
    .take(2)
    .subscrible(console.log.bind(console));
    
// 1
// 2
// end.
```

## TODO
- Add support for sorting using multiple core. Test using worker and child process.
- Add support for sorting on multiple machine.

## License
The MIT License (MIT)

Copyright (c) 2015 Dany Laporte