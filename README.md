## gulp-ferrugemjs
gulp-ferrugemjs is a simple [gulp](https://github.com/wearefractal/gulp) plugin to converte HTML Template engine for google incremental-DOM.

[![NPM](https://nodei.co/npm/gulp-ferrugemjs.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/gulp-ferrugemjs/)

#### Install

'npm install gulp-ferrugemjs --save-dev'

#### Usage

```js
var gulp_ferrugemjs = require('gulp-ferrugemjs');//import the plugin
// your code here!!
pipe(gulp_ferrugemjs())
//..pass to next pipe ;)
```

#### Options

templateExtension
```js
pipe(gulp_ferrugemjs({templateExtension:".pug"}))
```

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

