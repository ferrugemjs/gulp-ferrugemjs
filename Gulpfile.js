var gulp = require('gulp');
var rename = require('gulp-rename');
var ferrugemjs = require('./index');

gulp.task('template',function(){
    return gulp.src([
        "./src/**/*.html"
    ])
    .pipe(ferrugemjs({mode:"amd"}))
    .pipe(rename({
        extname: ".html.js"
    }))
    .pipe(gulp.dest("test/"));
});
