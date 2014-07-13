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
  demo: './demo',
  build: './build/'
};

var ports = {
  livereload: 35729,
  server: 4200
};

gulp.task('scripts', function (){
  return gulp
    .src(paths.source)
    .pipe(plugins.plumber())
    // .pipe(plugins.jshint('.jshintrc'))
    // .pipe(plugins.jshint.reporter('default'))
    .pipe(plugins.es6ModuleTranspiler({type: 'amd'}))
    .pipe(plugins.concat('anbaric-lamp.js'))
    .pipe(gulp.dest(paths.build))
    // .pipe(plugins.rename({ suffix: '.min' }))
    // .pipe(plugins.uglify())
    // .pipe(gulp.dest(paths.build));
});

gulp.task('vendor', function (){
  return gulp
    .src(mainBowerFiles())
    .pipe(plugins.concat('anbaric-lamp-vendor.js'))
    .pipe(gulp.dest(paths.build))
    // .pipe(plugins.rename({ suffix: '.min' }))
    // .pipe(plugins.uglify())
    // .pipe(gulp.dest(paths.build));
});

gulp.task('clean', function (){
  return gulp
    .src(paths.build, {read:false})
    .pipe(plugins.rimraf());
});

gulp.task('watch', function (){
  gulp.watch(paths.source, ['scripts']);

  var lr = plugins.livereload();
  gulp.watch([
    paths.build + '**',
    paths.demo + '**/*.html'
  ]).on('change', function(file){
    lr.changed(file.path);
  });
});

gulp.task('connect', function (){
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

gulp.task('build', ['clean'], function (){
  gulp.start('vendor', 'scripts');
});

gulp.task('deploy', function (){
  gulp
    .src(paths.source)
    .pipe(plugins.ghPages());
});

gulp.task('default', ['build', 'connect', 'watch', 'open']);
