'use strict';

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var mainBowerFiles = require('main-bower-files');
var express = require('express');

var pkg = require('./package.json');
var banner = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');

/*
gulp.src('./foo/*.js')
  .pipe(header(banner, { pkg : pkg } ))
  .pipe(gulp.dest('./dist/')
*/

var paths = {
  source: 'src/**/*.js',
  demo:   './demo',
  build:  './build/',
  dist:   './dist/'
};

var ports = {
  livereload: 35729,
  server: 4200
};

gulp.task('scripts', function (){
  gulp
    .src(paths.source)
    .pipe(plugins.plumber())
    .pipe(plugins.jshint('.jshintrc'))
    .pipe(plugins.jshint.reporter('default'))
    .pipe(plugins.es6ModuleTranspiler({type: 'amd'}))
    .pipe(plugins.concat('anbaric-lamp.js'))
    .pipe(gulp.dest(paths.build))
    .pipe(plugins.rename({ suffix: '.min' }))
    .pipe(plugins.uglify())
    .pipe(gulp.dest(paths.build));
});

gulp.task('vendor', function (){
  gulp
    .src(mainBowerFiles())
    .pipe(plugins.concat('anbaric-lamp-vendor.js'))
    .pipe(gulp.dest(paths.build));
    // .pipe(plugins.rename({ suffix: '.min' }))
    // .pipe(plugins.uglify())
    // .pipe(gulp.dest(paths.build));
});

gulp.task('clean', function (){
  gulp
    .src(paths.build, {read:false})
    .pipe(plugins.rimraf());
});

gulp.task('watch', function (){
  // gulp.watch(paths.source, ['scripts']);

  // var lr = plugins.livereload();

  // gulp.watch([
  //   paths.build + '**',
  //   paths.demo + '**/*.html'
  // ]).on('change', function(file){
  //   lr.changed(file.path);
  // });
});

gulp.task('connect', function (){
  plugins.livereload.listen();

  var demo = express();
  demo
    .use(require('morgan')('dev'))
    .use(require('connect-livereload')({port: ports.livereload}))
    .use(express.static(paths.demo))
    .use(express.static(paths.build))
    .use('/bower_components', express.static('./bower_components'))
    .listen(ports.server);
});

gulp.task('open', function (){
  require('opn')('http://localhost:' + ports.server);
});

gulp.task('dist', ['clean', 'vendor', 'scripts'], function (){
  gulp.src(['demo/**/*', 'build/*.js'])
    .pipe(gulp.dest(paths.dist));
});

gulp.task('default', ['vendor', 'scripts', 'connect', 'watch', 'open']);
