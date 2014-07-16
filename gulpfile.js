'use strict';

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var mainBowerFiles = require('main-bower-files');
var express = require('express');

var paths = {
  source: 'src/**/*.js',
  demo:   './demo',
  build:  './build/',
  dist:   './dist/'
};

var ports = {
  server: 4200
};

gulp.task('clean', function (){
  gulp
    .src(paths.build, {read:false})
    .pipe(plugins.rimraf());
});

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
    .pipe(gulp.dest(paths.build))
    .pipe(plugins.rename({ suffix: '.min' }))
    .pipe(plugins.uglify())
    .pipe(gulp.dest(paths.build));
});

gulp.task('connect', function (){
  var demo = express();
  demo
    .use(require('morgan')('dev'))
    .use(require('connect-livereload')())
    .use(express.static(paths.demo))
    .use(express.static(paths.build))
    .use('/bower_components', express.static('./bower_components'))
    .listen(ports.server);
});

gulp.task('open', function (){
  require('opn')('http://localhost:' + ports.server);
});

gulp.task('dist', function (){
  gulp.src(['demo/**/*', 'build/*.js'])
    .pipe(gulp.dest(paths.dist));
});

gulp.task('default', ['vendor', 'scripts', 'connect', 'open'], function (){
  plugins.watch({ glob: [
    paths.demo  + '/**/*',
    paths.build + '/**/*'
  ]})
  .pipe(plugins.livereload());
});
