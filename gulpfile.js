const gulp = require('gulp')
const path  = require('path')
const pug  = require('gulp-pug')

gulp.task('build:html', function () {
  gulp.src(path.join(__dirname, 'src/spa/views/*.pug'))
    .pipe(pug({ pretty: true }))
    .pipe(gulp.dest(path.join(__dirname, 'build')))
})

gulp.task('build', ['build:html'], function () {
  // after building pug files, just copy all css and js ones to build
  gulp.src([
    path.join(__dirname, 'src/spa/css/*'),
    path.join(__dirname, 'src/spa/js/*')
  ])
    .pipe(gulp.dest(path.join(__dirname, 'build/assets')))
})

gulp.task('default', ['build'])
