'use strict';

var gulp = require('gulp');
var es = require('event-stream');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var less = require('gulp-less');
var wrap = require('gulp-wrap');
var watch = require('gulp-watch');
var connect = require('gulp-connect');
var header = require('gulp-header');
var order = require('gulp-order');
var jshint = require('gulp-jshint');
var pkg = require('./package.json');

var banner = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');

/**
 * Clean ups ./dist folder
 */
gulp.task('clean', function() {
  return gulp
    .src('./dist', {read: false})
    .pipe(clean({force: true}))
    .on('error', log);
});

/**
 * JShint all *.js files
 */
gulp.task('lint', function () {
  return gulp.src('./src/main/javascript/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

/**
 * Build a distribution
 */
gulp.task('dist', ['clean', 'lint'], _dist);
function _dist() {
  return es.merge(
    gulp.src([
        './node_modules/es5-shim/es5-shim.js',
        './src/main/javascript/**/*.js',
        './node_modules/swagger-client/browser/swagger-client.js'
      ]),
      gulp
        .src(['./src/main/template/templates.js'])
        .on('error', log)
    )
    .pipe(order(['scripts.js', 'templates.js']))
    .pipe(concat('swagger-ui.js'))
    .pipe(wrap('(function(){<%= contents %>}).call(this);'))
    .pipe(header(banner, { pkg: pkg }))
    .pipe(gulp.dest('./dist'))
    .pipe(uglify())
    .on('error', log)
    .pipe(rename({extname: '.min.js'}))
    .on('error', log)
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
}
gulp.task('dev-dist', ['lint', 'dev-copy'], _dist);

/**
 * Processes less files into CSS files
 */
gulp.task('less', ['clean'], _less);
function _less() {
  return gulp
    .src([
      './src/main/less/screen.less',
      './src/main/less/print.less',
      './src/main/less/reset.less',
      './src/main/less/style.less',
      './src/main/less/language.less',
      './node_modules/flag-icon-css/css/flag-icon.css',
      './flags/styles.css'
    ])
    .pipe(less())
    .on('error', function(err){ log(err); this.emit('end');})
    .pipe(gulp.dest('./src/main/html/css/'))
    .pipe(connect.reload());
}

gulp.task('dev-less', _less);

/**
 * Copy lib and html folders
 */
gulp.task('copy', ['less'], _copy);
function _copy() {

  // copy JavaScript files inside lib folder
  gulp
    .src(['./lib/**/*.{js,map}',
        './node_modules/es5-shim/es5-shim.js'
    ])
    .pipe(gulp.dest('./dist/lib'))
    .on('error', log);

  var langfiles = ['./lang/translator.js',
  './lang/en.js',
  './lang/ca.js',
  './lang/es.js',
  './lang/fr.js',
  './lang/geo.js',
  './lang/it.js',
  './lang/ja.js',
  './lang/ko-kr.js',
  './lang/pl.js',
  './lang/pt.js',
  './lang/ru.js',
  './lang/tr.js',
  './lang/zh-cn.js'];

  // copy `lang` for translations

  gulp.src(langfiles)
      .pipe(concat('allLang.js'))
      .pipe(rename('allLang.min.js'))
      .pipe(uglify())
      .pipe(gulp.dest('./dist/lang'))
      .on('error', log);

  // copy all files inside html folder
  gulp
    .src(['./src/main/html/**/*'])
    .pipe(gulp.dest('./dist'))
    .on('error', log);
    
  var flags = './node_modules/flag-icon-css/flags/4x3/';
  var images = ['us.svg', 'cn.svg','fr.svg','es.svg','pt.svg','ru.svg','kr.svg', 'jp.svg','it.svg','tr.svg','pl.svg','ge.svg'];

  images = images.map(function (image) {
    return flags + image;
  });
  images.push('./flags/ca.svg');

  // copy flags
  gulp
    .src(images)
    .pipe(gulp.dest('./dist/flags/4x3'))
    .on('error', log);
}

gulp.task('dev-copy', ['dev-less', 'copy-local-specs'], _copy);

gulp.task('copy-local-specs', function () {
  // copy the test specs
  return gulp
    .src(['./test/specs/**/*'])
    .pipe(gulp.dest('./dist/specs'))
    .on('error', log);
});

/**
 * Watch for changes and recompile
 */
gulp.task('watch', ['copy-local-specs'], function() {
  return watch([
    './src/**/*.{js,less,handlebars}',
    './src/main/html/*.html',
    './test/specs/**/*.{json,yaml}'
    ],
    function() {
      gulp.start('dev-dist');
    });
});

/**
 * Live reload web server of `dist`
 */
gulp.task('connect', function() {
  connect.server({
    root: 'dist',
    livereload: true
  });
});

function log(error) {
  console.error(error.toString && error.toString());
}

gulp.task('handlebars', function () {
    gulp
        .src(['./src/main/template/templates.js'])
        .pipe(wrap('/* jshint ignore:start */ \n {<%= contents %>} \n /* jshint ignore:end */'))
        .pipe(gulp.dest('./src/main/template/'))
        .on('error', log);
});

gulp.task('default', ['dist', 'copy']);
gulp.task('serve', ['connect', 'watch']);
gulp.task('dev', ['default'], function () {
  gulp.start('serve');
});
