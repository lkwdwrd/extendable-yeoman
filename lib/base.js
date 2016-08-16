/**
 * This file contains main Pluggable Yeoman object.
 *
 * This object extends the base Yeoman generator object and exposes a new
 * version of it that supports a plugin architecture allowing plugins to
 * be used with generators built on top of it.
 */
'use strict';

// Require dependencies
var YeomanBase = require('yeoman-generator').Base;
var compact = require('lodash.compact');
var path = require('path');
var globby = require('globby');
var win32 = process.platform === 'win32';

/**
 * The Pluggable Yo base object
 *
 */
var ExtendableBase = YeomanBase.extend({
	_extensionLookups: [
		'.',
		'extensions',
		'lib/extensions',
	],
	_extensions: {},
	/**
	 * Sets up the object, registering methods with the Yeoman run loop.
	 *
	 * @return {Object} The resulting MakeBase object.
	 */
	constructor: function(){
		// Run the baser constructor.
		YeomanBase.apply(this, arguments);
		// Set the name
		this._generatorName = this.options.namespace.split(':')[0];
		// Find Extensions
		this._gatherExtensions();
		this._initExtensions();
	},
	/**
	 * Initializes any extensions or runs any dynamic subgenerators.
	 */
	_initExtensions: function(){
		var i;
		var length;
		var generator = false;
		var ns = this.options.namespace;
		var rawNS = process.argv[2].split(/:/);
		var last = rawNS.pop();

		if(last[0] === '/'){
			ns = rawNS.concat(last.slice(1)).join(':');
			generator = true;
			this.run = function(cb){
				if(typeof cb === 'function'){
					cb();
				}
			};
		}
		if(!(ns in this._extensions)){
			if(generator){
				this.env.error('The dynamic sub-generator ' + ns + ' does not exist.');
			}
			return false;
		}
		for(i = 0, length = this._extensions[ns].length; i < length; i++){
			if(generator){
				this.env.register(this._extensions[ns][i], ns + i);
				this.env.run([ns + i].concat(this.args), this.options);
			}else{
				require(this._extensions[ns][i])(this);
			}
		}
		return this;
	},
	/**
	 * Search for generator extensions.
	 *
	 * A generator extension can modify the behavior of the extended generator,
	 * or even add new sub-generators to it.
	 *
	 * Defaults lookups are:
	 *   - ./
	 *   - extensions/
	 *   - lib/extensions/
	 *
	 * So this index file
	 * `node_modules/ext-dummy-modification/lib/extensions/yo/index.js` would
	 * automatically invoked when the `dummy:yo` generator is invoked.
	 */
	_gatherExtensions: function(){
		var extensionModules = this._searchForExtensions(this._getNpmPaths());
		var patterns = [];

		this._extensionLookups.forEach(function(lookup){
			extensionModules.forEach(function(modulePath){
				patterns.push(path.join(modulePath, lookup));
			});
		});
		patterns.forEach(function(pattern){
			globby.sync(
				['*/index.js', '*/*/index.js', '!node_modules/*/index.js'],
				{cwd: pattern}
			).forEach(function(filename){
				var ns = this._generatorName + ':' + this.env.namespace(filename);
				if(!(ns in this._extensions)){
					this._extensions[ns] = [];
				}
				this._extensions[ns].push(path.join(pattern, filename));
			}, this);
		}, this);
	},
	/**
	 * Search npm for every available generator extensions.
	 *
	 * Generator Extensions are npm packages who's name start with
	 * `ext-<generator-name>-` and are place in the top level `node_module`
	 * path. They can be installed globally or locally.
	 *
	 * @param {Array}  List of search paths
	 * @return {Array} List of the generator modules path
	 */
	_searchForExtensions: function(searchPaths){
		var modules = [];

		searchPaths.forEach(function(root){
			if(!root){
				return;
			}
			modules = globby.sync(
				this._getExtensionPrefixes(),
				{cwd: root}
			).map(function(match){
				return path.join(root, match);
			}).concat(modules);
		}.bind(this));

		return modules;
	},
	/**
	 * Get the npm lookup directories (`node_modules/`)
	 *
	 * @return {Array} lookup paths
	 */
	_getNpmPaths: function () {
		var paths = [];

		// Add NVM prefix directory
		if(process.env.NVM_PATH){
			paths.push(path.join(path.dirname(process.env.NVM_PATH), 'node_modules'));
		}

		// Adding global npm directories
		// We tried using npm to get the global modules path, but it hasn't worked out
		// because of bugs in the parseable implementation of `ls` command and mostly
		// performance issues. So, we go with our best bet for now.
		if(process.env.NODE_PATH){
			paths = compact(process.env.NODE_PATH.split(path.delimiter)).concat(paths);
		}

		// global node_modules should be 4 or 2 directory up this one (most of the time)
		paths.push(path.join(__dirname, '../../../..'));
		paths.push(path.join(__dirname, '../..'));

		// adds support for generator resolving when yeoman-generator has been linked
		if(process.argv[1]){
			paths.push(path.join(path.dirname(process.argv[1]), '../..'));
		}

		// Default paths for each system
		if(win32){
			paths.push(path.join(process.env.APPDATA, 'npm/node_modules'));
		}else{
			paths.push('/usr/lib/node_modules');
		}

		// Walk up the CWD and add `node_modules/` folder lookup on each level
		process.cwd().split(path.sep).forEach(function (part, i, parts) {
			var lookup = path.join.apply(path, parts.slice(0, i + 1).concat(['node_modules']));

			if(!win32){
				lookup = '/' + lookup;
			}

			paths.push(lookup);
		});

		return paths.reverse();
	},
	/**
	 * Gets the default prefixes when searching for extensions via Globby.
	 *
	 * You can override this in your own base module if you would like your
	 * extension previs to be different than the default.
	 *
	 * @return {Array} An array of glob strings for extension search.
	 */
	_getExtensionPrefixes: function(){
		return [
			'ext-' + this._generatorName + '-*',
			'@*/ext-' + this._generatorName + '-*'
		];
	}
} );

// Exports the ExtendableBase for use.
module.exports = ExtendableBase;
