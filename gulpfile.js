const gulp = require('gulp')
const nodemon = require('gulp-nodemon')
const path  = require('path')
const pug  = require('gulp-pug')
const babel = require('gulp-babel')
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const util = require('gulp-util');

gulp.task('build:html', function () {
  gulp.src(path.join(__dirname, 'src/spa/views/*.html'))
    .pipe(gulp.dest(path.join(__dirname, 'build')))
})

gulp.task('build:css', ['build:html'], function () {
  // after building pug files, just copy css into build
  gulp.src([
    path.join(__dirname, 'src/spa/css/*'),
  ])
    .pipe(gulp.dest(path.join(__dirname, 'build/assets/css')))
})

gulp.task('build:js', ['build:css', 'build:html'], function() {

  gulp.src(path.join(__dirname, 'src/spa/js/routers.js'))
    .pipe(gulp.dest(path.join(__dirname, 'build/assets/')))

    gulp.src(path.join(__dirname, 'src/spa/js/Globals.js'))
      .pipe(gulp.dest(path.join(__dirname, 'build/assets/')))

  const b = browserify({
    entries: './src/spa/js/index.js',
    debug: true,
    transform: [babelify.configure({
      presets: ['es2015']
    })]
  });

  return b.bundle()
    .pipe(source('./app.js'))
    .pipe(buffer())
    // .pipe(sourcemaps.init({ loadMaps: true }))
    //   // Add other gulp transformations (eg. uglify) to the pipeline here.
    //   .on('error', util.log)
    // .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./build/assets/'));
});

gulp.task('build', ['build:html', 'build:css', 'build:js']);

gulp.task('watch', function () {
  gulp.watch([
    path.join(__dirname, 'src/spa/views/*.pug'),
    path.join(__dirname, 'src/spa/css/*'),
    path.join(__dirname, 'src/spa/js/**/*')
  ], ['build:html', 'build:css', 'build:js']);
});

gulp.task('serve', ['watch'], function(){
  return nodemon({
    script: './src/api/server.js',
  })
  .on('restart', function(){
    console.log('restarted');
  })
})

gulp.task('default', ['build', 'serve']);
