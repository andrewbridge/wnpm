var gulp = require("gulp");
var babel = require("gulp-babel");
var rename = require("gulp-rename");

gulp.task("default", function () {
	gulp.src("wnpm.js")
	.pipe(babel())
	.pipe(rename("wnpm.min.js"))
	.pipe(gulp.dest("."));
});