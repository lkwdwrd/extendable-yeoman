'use strict';
var helpers = require('yeoman-test');
var path = require('path');
var assert = require('chai').assert;
var Base = require('../../lib/base');

describe('The base object', function () {
	describe('has some properties', function(){
		it('_extensionLookups is an array of strings', function(){
			var app = helpers.createGenerator('dummy:app',[[Base, 'dummy:app']]);
			assert.isArray(app._extensionLookups);
			app._extensionLookups.forEach(function(item){
				assert.isString(item);
			});
		});
		it('_extensions is an empty object', function(){
			var app = helpers.createGenerator('dummy:app',[[Base, 'dummy:app']]);
			assert.isObject(app._extensions);
			assert.deepEqual({}, app._extensions);
		});
	});
	describe('constructor', function(){
		it('sets the main generator name', function(){
			var app = helpers.createGenerator('dummy:app',[[Base, 'dummy:app']]);
			assert.equal('dummy',app._generatorName);
		});
		it('runs the yeoman constructor before gathering extensions', function(){
			var fakeBase = Base.extend({
				_gatherExtensions: function(){assert.isDefined(this.env);},
				_initExtensions: function(){assert.isDefined(this.env);}
			});
			helpers.createGenerator('dummy:app',[[fakeBase, 'dummy:app']]);
		});
		it('runs gather extensions befor intializing them',function(){
			var fakeBase = Base.extend({
				_gatherExtensions: function(){this.testProp = true;},
				_initExtensions: function(){assert.isOk(this.testProp);}
			});
			helpers.createGenerator('dummy:app',[[fakeBase, 'dummy:app']]);
		});
	});
	describe('#_initExtensions', function(){
		before(function(){
			// Kill the normal constructor
			this.fakeBase = Base.extend({
				constructor: function(){}
			});
			// Stash the actual argv since we'll be stomping it for these tests.
			this._storedArgV = process.argv;
			// Set up a simple Yeoman Env mock.
			this.envMock = {
				register: envRegister.bind(this),
				run: envRun.bind(this),
				error: envError.bind(this)
			};
			function envRegister(filePath, namespace){
				this.envMockState.register.filePath.push(filePath);
				this.envMockState.register.namespace.push(namespace);
			}
			function envRun(args, options){
				this.envMockState.run.args.push(args);
				this.envMockState.run.options.push(options);
			}
			function envError(message){
				this.envMockState.error = message;
			}
		});
		beforeEach(function(){
			// Reset argv so test don't bleed into each other.
			process.argv = [];
			// Reset recorded env mock values so test don't bleed into each other.
			this.envMockState = {
				register: {filePath:[], namespace:[]},
				run: {args:[], options:[]},
				error: false
			};
			// Create a new instance of app for use
			this.app = helpers.createGenerator('dummy:app',[[this.fakeBase, 'dummy:app']]);
			this.app.options = {namespace: 'dummy:app'};
		});
		after(function(){
			// Clean up after ourselves restoring the actual argv after all tests run.
			process.argv = this._storedArgV;
		});
		it('initializes extensions in the same namespace as the called app', function(){
			// Mock out state
			process.argv = [null, null, 'dummy:app'];
			this.app._extensions = {
				'dummy:app': [
					path.join(__dirname, '../tools/test-ext1.js'),
					path.join(__dirname, '../tools/test-ext2.js')
				],
				'dummy:nope': [
					path.join(__dirname, '../tools/test-ext3.js')
				]
			};
			// Run the function
			var result = this.app._initExtensions();
			// Verify State - extensions 1 and 2 should run, 3 should not as it's
			// in a different namespace.
			assert.isTrue(this.app.testExt1);
			assert.isTrue(this.app.testExt2);
			assert.isUndefined(this.app.testExt3);
			assert.equal(result, this.app);
		});
		it('returns false when no extensions exist in the called namespace', function(){
			//Mock out state
			process.argv = [null, null, 'dummy:app'];
			this.app._extensions = {
				'dummy:nope': [
					path.join(__dirname, '../tools/test-ext3.js')
				]
			};
			// Run the function
			var result = this.app._initExtensions();
			// Verify state - no extensions run, false returned.
			assert.isFalse(result);
			assert.isUndefined(this.app.testExt3);
		});
		it('runs slash generatros when they exist in an extension', function(){
			//Mock out state
			process.argv = [null, null, 'dummy:/testing'];
			this.app.env = this.envMock;
			this.app._extensions = {
				'dummy:testing': [
					'path1',
					'path2'
				]
			};
			this.app.args = ['testing-arg'];
			this.app.options = {test: 'option'};
			// Run the function
			var result = this.app._initExtensions();
			// Verify state - slash generators run, app returned.
			// Register should have been called for exactly 2 generators
			assert.lengthOf(this.envMockState.register.filePath, 2);
			assert.equal('path1', this.envMockState.register.filePath[0]);
			assert.equal('path2', this.envMockState.register.filePath[1]);
			assert.lengthOf(this.envMockState.register.namespace, 2);
			assert.equal('dummy:testing0', this.envMockState.register.namespace[0]);
			assert.equal('dummy:testing1', this.envMockState.register.namespace[1]);
			// Run should have been called for exactly 2 generators
			assert.lengthOf(this.envMockState.run.args, 2);
			assert.deepEqual(['dummy:testing0', 'testing-arg'], this.envMockState.run.args[0]);
			assert.deepEqual(['dummy:testing1', 'testing-arg'], this.envMockState.run.args[1]);
			assert.lengthOf(this.envMockState.run.options, 2);
			assert.deepEqual({test: 'option'}, this.envMockState.run.options[0]);
			assert.deepEqual({test: 'option'}, this.envMockState.run.options[1]);
			// App is returned
			assert.equal(this.app, result);
		});
		it('throws an error when a slash generator is run that does not exist', function(){
			//Mock out state
			process.argv = [null, null, 'dummy:/notexists'];
			this.app.env = this.envMock;
			this.app._extensions = {};
			// Run the function
			this.app._initExtensions();
			// Verify the error method was called
			assert.equal(
				'The dynamic sub-generator dummy:notexists does not exist.',
				this.envMockState.error
			);
		});
		it('overrides the run method when a slash generator is run', function(){
			//Mock out state
			process.argv = [null, null, 'dummy:/testing'];
			this.app.env = this.envMock;
			this.app._extensions = {'dummy:testing': ['path1']};
			// Run the function
			this.app._initExtensions();
			var check = false;
			this.app.run(function(){
				check = true;
			});
			// App is returned
			assert.isTrue(check);
		});
	});
});
