'use strict';
var assert = require('chai').assert;
var main  = require('../../lib/main');

describe('The main object', function () {
	it('contains a Yeoman reference', function(){
		assert.deepEqual(main.Yeoman, require('yeoman-generator'));
	});
	it('contains the extended Base object', function(){
		assert.deepEqual(main.Base, require('../../lib/base').default);
	});
});
