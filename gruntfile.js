module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    connect: {
      all: {
        options: {
          hostname: 'localhost',
          port: 1336,
          keepalive: true
        }
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('serve', ['connect']);
};

