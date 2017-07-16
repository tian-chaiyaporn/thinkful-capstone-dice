const gulp = require('gulp')
const path  = require('path')
const pug  = require('gulp-pug')
const babel = require('gulp-babel')

gulp.task('build:html', function () {
  gulp.src(path.join(__dirname, 'src/spa/views/*.pug'))
    .pipe(pug({ pretty: true }))
    .pipe(gulp.dest(path.join(__dirname, 'build')))
})

gulp.task('build:css', ['build:html'], function () {
  // after building pug files, just copy css into build
  gulp.src([
    path.join(__dirname, 'src/spa/css/*'),
  ])
    .pipe(gulp.dest(path.join(__dirname, 'build/assets/css')))
})

gulp.task('build:js', ['build:css', 'build:html'], function () {
  // after building css, build js files using babel
  gulp.src([
    path.join(__dirname, 'src/spa/js/**/*')
  ])
    .pipe(babel())
    .pipe(gulp.dest(path.join(__dirname, 'mid-build/js')))
})

gulp.task('default', ['build:html', 'build:css', 'build:js'])
