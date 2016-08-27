# Extendable Yeoman

[![Build Status](https://travis-ci.org/wp-cli/wp-cli.png?branch=master)](https://travis-ci.org/lkwdwrd/extendable-yeoman)

A layer between Yeoman and your generator that makes your generators easily extendable with secondary modules. All you have to do is provide events within your generator for the extensions to work from.

In addition to allowing extensions, using Extendable Yeoman allows extensions to register slash sub-generators. These are dynamic sub-generators that run from within the extension and are not part of the main generator. Extendable Yeoman takes advantage of a compatibility layer within Yeoman to run these dynamic sub-generators.

## Including Extendable Yeoman

To use Extendable Yeoman, require the Extendable Yeoman base instead of the standard Yeoman Generator base. The Extendable Yeoman base is itself an extension of the Yeoman Generator base. This means when you include Extendable Yeoman you get all of Yeoman, and in between Yeoman and your generator is the extension layer that will allow other npm packages to hook in and modify your generator's behavior.

Instead of:

```js
var Base = require('yeoman-generator').Base;

var Generator = Base.extend({
	// Your Generator Functionality
});
```

Use:

```js
var Base = require('extendable-yeoman').Base;

var Generator = Base.extend({
	// Your Generator Functionality
});
```

Beyond this your authoring experience is exactly the same as when writing a standard Yeoman generator. While writing, you can fire events that extensions can listen to and use to modify specific parts of the application flow.

```js
// Inside a generator function
this.emit('event-name', somedata);
```

## Creating Extensions

An extension is a node module that is prefixed with `ext-`, followed by the generator name, and postfixed with a unique name. So to extend the generator `generator-react`, an extension might be named something like `ext-react-extras`.

Extension files are included very similar to the way Yeoman Generator files are included. To extend the main generator, the extension file will be at `app/index.js` within the extension node module. To extend a sub-generator 'subname' the extension file will be at `subname/index.js`.

If you wish to further organize your extension, you can put your extension files in a folder called `extensions/` (e.g. `extensions/app/index.js`). To even further organize your extension you can put your generators in `lib/extensions/` (e.g. `lib/extensions/subname/index.js`). This should feel very similar to authoring for Yeoman directly where you can organize your generators in the root, at `generators/`, or `lib/generators/`.

### Standard Extension Files

An extension file should export a function that takes in the generator object:

```js
module.exports = function(generator){
	generator.addListener('event-name', callback);
	// You can also directly modify generator, but this is not advisable.
}
```

If the callback registered to an event is passed an object, by default in JS that object will be passed by reference and can be mutated. Generator authors can also choose instead to implement their own middleware systems to allow a more functional approach to data flow and manipulation.

### Slash Generators

Slash generators are nearly identical to standard extensions, with one major difference. While a standard extension lives in a namespace that already exists in the main generator, slash generators live in namespaces that do *not* exist. When they are invoked, rather than being passed the main generator object, they are invoked as *their own* generator. This means you can add sub-generators to yeoman generators that do not exist in the main generator's module.

In addition to living in a previously non-existant namespace, instead of a simple function, slash generator extension files should return a full yeoman generator definition. They can extend the Extendable Yeoman base, the standard Yeoman Generator, or even a custom base from the main Generator if it's exposed.

```js
// A slash generator extension file
var Base = require('extendable-yeoman').Base;

module.exports = Base.extend({
	// Generator methods here.
});
```

#### Invoking a Slash Genrator

Invoking a slash generator works much the same as a normal sub-generator except it is invoked with a forward slash.

Given an extension module `ext-foo-bar`. The slash generator extension is located at `lib/extensions/baz/index.js` within the module. The `foo:baz` sub-generator does not exist in the main foo generator. However it can be invoked by adding a forward slash in before the dynamic sub-generator namespace.

```
$ yo foo:/baz
```

The slash is always a forward slash, and there can only be one. Normally Yeoman would strip this argument as a compatibility layer, but Extendable Yeoman hooks into that part of Yeoman and uses it to run the dynamic sub-generator as a full-fledged sub-generator.

Unfortunately, sub-generators do not show up when you trigger Yeoman with the help flag.

## License

MIT
