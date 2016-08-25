import helpers from 'yeoman-test';
import path from 'path';
import {assert} from 'chai';
import Base from '../../lib/base';

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
			// Run function doesn't error when no cb is sent
			assert.doesNotThrow(this.app.run);
		});
	});
	describe('#_gatherExtensions', function(){
		it ('globs and records available extensions, exlcuding node_modules', function(){
			// Kill the normal constructor and mock some methods.
			var fileRoot = path.join(__dirname, '../tools/glob');
			var fakeBase = Base.extend({
				_generatorName: 'dummy',
				constructor: function(){},
				_searchForExtensions: function(paths){
					assert.isTrue(paths)
					return [fileRoot];
				},
				_getNpmPaths: function(){
					return true;
				}
			});
			// Create an instance
			var app = helpers.createGenerator('dummy:app',[[fakeBase, 'dummy:app']]);
			// Set up a simple Yeoman Env mock.
			app.env = {
				namespace: function(value){return path.basename(path.dirname(value));}
			};
			// Run the method
			app._gatherExtensions();
			// Verify
			// Note the glob for root and for extensions both pick up the
			// extensions/ folder index file. This is good since it also
			// tests searching for sub-sub-generators.
			// While there is a fake node_modules folder that should not be
			// in the final results.
			assert.deepEqual(
				app._extensions,
				{
					'dummy:testing': [
						path.join(fileRoot, 'testing/index.js')
					],
					'dummy:ext-testing': [
						path.join(fileRoot, 'extensions/ext-testing/index.js'),
						path.join(fileRoot, 'extensions/ext-testing/index.js')
					],
					'dummy:lib-ext-testing': [
						path.join(fileRoot, 'lib/extensions/lib-ext-testing/index.js')
					]
				}
			);
		});
	});
	describe('#_searchForExtensions', function(){
		it ('globs node_modules folders for all relevant extensions', function(){
			// Kill the normal constructor and mock some methods.
			var fileRoot = path.join(__dirname, '../tools/glob/node_modules');
			var fakeBase = Base.extend({
				constructor: function(){},
				_getExtensionPrefixes: function(){return ['ext-dummy-*'];}
			});
			// Create an instance
			var app = helpers.createGenerator('dummy:app',[[fakeBase, 'dummy:app']]);
			// Run the method
			var results = app._searchForExtensions([fileRoot, '']);
			// Verify
			assert.deepEqual(
				results,
				[path.join(fileRoot,'ext-dummy-test')]
			);
		});
	});
	describe('#_getNpmPaths', function(){
		before(function(){
			// Kill the normal constructor
			this.fakeBase = Base.extend({
				constructor: function(){}
			});
			// Create a fake path for use in testing.
			this.fakePath = path.join('a', 'nonexistant', 'path', 'for', 'testing');
		});
		beforeEach(function(){
			// Create a fake process object for each test.
			this.process = {
				platform: '',
				env: {},
				argv: [],
				cwd: function(){return path.join('some', 'random', 'path');}
			};
		});
		it('returns an array for the basic paths', function(){
			// Create an instance
			var app = helpers.createGenerator('dummy:app',[[this.fakeBase, 'dummy:app']]);
			// Run the method
			var results = app._getNpmPaths(this.process, this.fakePath);
			// Verify results
			assert.deepEqual(results, [
				path.join(path.sep, 'some', 'random', 'path', 'node_modules'),
				path.join(path.sep, 'some', 'random', 'node_modules'),
				path.join(path.sep, 'some', 'node_modules'),
				path.join(path.sep, 'usr', 'lib', 'node_modules'),
				path.join('a', 'nonexistant', 'path'),
				path.join('a')
			]);
		});
		it('returns an array with the NVM_PATH when present', function(){
			// Add an NVM path
			this.process.env.NVM_PATH = path.join('the', 'nvm', 'path');
			// Create an instance
			var app = helpers.createGenerator('dummy:app',[[this.fakeBase, 'dummy:app']]);
			// Run the method
			var results = app._getNpmPaths(this.process, this.fakePath);
			// Verify results
			assert.include(results, path.join('the', 'nvm', 'node_modules'));
		});
		it('returns the NODE_PATH path when present', function(){
			// Add an NVM path
			this.process.env.NODE_PATH = path.join('the', 'node', 'path');
			// Create an instance
			var app = helpers.createGenerator('dummy:app',[[this.fakeBase, 'dummy:app']]);
			// Run the method
			var results = app._getNpmPaths(this.process, this.fakePath);
			// Verify results
			assert.include(results, path.join('the', 'node', 'path'));
		});
		it('supports linked dependencies', function(){
			// Add an NVM path
			this.process.argv = [null, path.join( 'argv', 'special', 'linked', 'path')];
			// Create an instance
			var app = helpers.createGenerator('dummy:app',[[this.fakeBase, 'dummy:app']]);
			// Run the method
			var results = app._getNpmPaths(this.process, this.fakePath);
			// Verify results
			assert.include(results, 'argv');
		});
		it('supports win32 paths', function(){
			// Add an win32 flag
			this.process.platform = 'win32';
			this.process.env.APPDATA = path.join('another', 'dummy', 'path');
			// Create an instance
			var app = helpers.createGenerator('dummy:app',[[this.fakeBase, 'dummy:app']]);
			// Run the method
			var results = app._getNpmPaths(this.process, this.fakePath);
			// Verify results
			assert.include(results, path.join('another', 'dummy', 'path', 'npm', 'node_modules'));
			assert.notInclude(results, path.join('usr', 'lib', 'node_modules'));
			assert.deepEqual(results.slice(0,3),[
				path.join('some', 'random', 'path', 'node_modules'),
				path.join('some', 'random', 'node_modules'),
				path.join('some', 'node_modules')
			]);
		});
	});
	describe('#_getExtensionPrefixes', function(){
		it('returns an array of glob statements', function(){
			var fakeBase = Base.extend({
				_generatorName: 'dummy',
				constructor: function(){}
			});
			// Create an instance
			var app = helpers.createGenerator('dummy:app',[[fakeBase, 'dummy:app']]);
			// Run the method
			var results = app._getExtensionPrefixes();
			assert.deepEqual(
				results,
				[
					'ext-dummy-*',
					'@*/ext-dummy-*'
				]
			);
		});
	});
});
